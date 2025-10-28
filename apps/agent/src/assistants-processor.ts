import "dotenv/config";
import OpenAI from "openai";
import {
  maskPII,
  generateRequestId,
  logInfo,
  logError,
  withRetry,
  type LogContext
} from "@agents/core";
import { createTicket, createDraft } from "@agents/db";
import { calculateConfidenceEnhanced, type ExtractionResultEnhanced } from "@agents/prompts";
import { metricsCollector } from "./metrics.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Vercel timeout safety: webhook timeout is ~30s, function timeout is 60s on Pro/Enterprise
const EXTRACTION_TIMEOUT_MS = 20000; // 20s max for extraction (leave 10s buffer)
const RESPONSE_TIMEOUT_MS = 15000;   // 15s max for response (leave 15s buffer)

// Validate assistant IDs are present
const extractionAssistantId = process.env.OPENAI_EXTRACTION_ASSISTANT_ID!;
const responseAssistantId = process.env.OPENAI_RESPONSE_ASSISTANT_ID!;

if (!extractionAssistantId) {
  throw new Error(
    "OPENAI_EXTRACTION_ASSISTANT_ID environment variable is required. " +
    "Run 'pnpm --filter @agents/agent exec tsx scripts/setup-assistants.ts' to create assistants."
  );
}

if (!responseAssistantId) {
  throw new Error(
    "OPENAI_RESPONSE_ASSISTANT_ID environment variable is required. " +
    "Run 'pnpm --filter @agents/agent exec tsx scripts/setup-assistants.ts' to create assistants."
  );
}

export interface ProcessEmailParams {
  source: string;
  customerEmail: string;
  rawEmail: string;
}

export interface ProcessEmailResult {
  success: boolean;
  ticket?: { id: string } | null;
  draft?: { id: string; draftText: string } | null;
  extraction?: ExtractionResultEnhanced;
  confidence?: number;
  extraction_method?: "assistants-api";
  error?: string;
}

/**
 * Create a promise that rejects after a timeout
 */
function createTimeoutPromise<T>(ms: number, operationName: string): Promise<T> {
  return new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error(`${operationName} timed out after ${ms}ms`)),
      ms
    )
  );
}

async function extractWithAssistant(
  maskedEmail: string,
  logContext: LogContext
): Promise<ExtractionResultEnhanced> {
  logInfo("Using Assistants API for extraction", logContext, {
    assistantId: extractionAssistantId,
    timeoutMs: EXTRACTION_TIMEOUT_MS
  });

  // Create thread with the email
  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: `Analyze this customer email and extract structured information as JSON:\n\n${maskedEmail}`
      }
    ]
  });

  logInfo("Thread created for extraction", logContext, { threadId: thread.id });

  // Run the assistant WITH TIMEOUT PROTECTION
  const runPromise = openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: extractionAssistantId
  });

  const run: any = await Promise.race([
    runPromise,
    createTimeoutPromise(EXTRACTION_TIMEOUT_MS, "Extraction run")
  ]);

  if (run.status !== "completed") {
    throw new Error(`Extraction run failed with status: ${run.status}`);
  }

  // Get the assistant's response
  const messages = await openai.beta.threads.messages.list(thread.id);
  const assistantMessage = messages.data[0];

  if (!assistantMessage || assistantMessage.role !== "assistant") {
    throw new Error("No assistant response found");
  }

  // Extract text from message
  const textContent = assistantMessage.content.find(c => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in assistant response");
  }

  // Parse JSON response - find JSON in the response
  const responseText = textContent.text.value;
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    logError("No JSON found in extraction response", logContext, {
      response: responseText.substring(0, 500)
    });
    throw new Error("Failed to extract JSON from assistant response");
  }

  const extractedData = JSON.parse(jsonMatch[0]);

  logInfo("Extraction successful", logContext, {
    is_cancellation: extractedData.is_cancellation,
    reason: extractedData.reason,
    language: extractedData.language
  });

  return extractedData as ExtractionResultEnhanced;
}

async function generateResponseWithAssistant(
  extraction: ExtractionResultEnhanced,
  maskedEmail: string,
  logContext: LogContext,
  ticketId: string
): Promise<string> {
  logInfo("Using Assistants API for response generation", logContext, {
    assistantId: responseAssistantId,
    timeoutMs: RESPONSE_TIMEOUT_MS
  });

  // Build context for response generation
  const contextPrompt = `Generate a professional customer response for this cancellation request based on the extracted information:

EXTRACTION DATA:
- Is Cancellation: ${extraction.is_cancellation}
- Reason: ${extraction.reason}
- Move Date: ${extraction.move_date || "Not specified"}
- Language: ${extraction.language}
- Edge Case: ${extraction.edge_case}
- Urgency: ${extraction.urgency}
- Customer Concerns: ${extraction.customer_concerns.join(", ") || "None"}
- Payment Issue: ${extraction.has_payment_issue}
- Payment Concerns: ${extraction.payment_concerns?.join(", ") || "None"}

CUSTOMER EMAIL:
${maskedEmail}

Using the vector store, find similar cases and generate a personalized, empathetic response that follows Elaway's policies. Ensure the response is professional and addresses the customer's specific concerns.`;

  // Create thread
  const thread = await openai.beta.threads.create({
    messages: [
      {
        role: "user",
        content: contextPrompt
      }
    ]
  });

  logInfo("Thread created for response generation", logContext, { threadId: thread.id });

  // Stream the response WITH TIMEOUT PROTECTION
  let fullResponse = "";

  try {
    const streamPromise = (async () => {
      const stream = openai.beta.threads.runs.stream(thread.id, {
        assistant_id: responseAssistantId
      });

      for await (const event of stream) {
        if (event.event === "thread.message.delta") {
          const delta = event.data.delta;
          if (delta.content) {
            for (const content of delta.content) {
              if (content.type === "text" && content.text) {
                fullResponse += content.text.value;
              }
            }
          }
        }
      }
    })();

    await Promise.race([
      streamPromise,
      createTimeoutPromise(RESPONSE_TIMEOUT_MS, "Response streaming")
    ]);
  } catch (error: any) {
    if (error.message.includes("timed out")) {
      logInfo("Response streaming timed out - using partial response", logContext, {
        partialLength: fullResponse.length,
        wordCount: fullResponse.split(/\s+/).length
      });
      // Use partial response if we got something
      if (fullResponse.length > 50) {
        logInfo("Using partial response due to timeout", logContext);
        return fullResponse.trim();
      }
    }
    throw error;
  }

  if (!fullResponse) {
    throw new Error("No response generated by assistant");
  }

  logInfo("Response generation successful", logContext, {
    responseLength: fullResponse.length,
    wordCount: fullResponse.split(/\s+/).length
  });

  return fullResponse.trim();
}

export async function processEmailWithAssistants(
  params: ProcessEmailParams
): Promise<ProcessEmailResult> {
  const { source, customerEmail, rawEmail } = params;
  const requestId = generateRequestId();
  const startTime = Date.now();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting Assistants API email processing", logContext, {
      source,
      customerEmail: maskPII(customerEmail)
    });

    const maskedEmail = maskPII(rawEmail);
    const maskedCustomerEmail = maskPII(customerEmail);

    // STEP 1: Extract with Assistants API (must complete within timeout)
    const extraction = await withRetry(
      async () => extractWithAssistant(maskedEmail, logContext),
      3,
      1000
    );

    logInfo("Email extraction completed", logContext, {
      isCancellation: extraction.is_cancellation,
      reason: extraction.reason,
      language: extraction.language,
      edgeCase: extraction.edge_case
    });

    // If not a cancellation, skip response generation
    if (!extraction.is_cancellation) {
      logInfo("Not a cancellation request - no action taken", logContext);
      return {
        success: true,
        ticket: null,
        draft: null,
        extraction,
        extraction_method: "assistants-api",
        error: undefined
      };
    }

    // Skip if unclear intent
    if (extraction.reason === "unknown" || !extraction.confidence_factors.clear_intent) {
      logInfo("Unclear intent - skipping automated draft", logContext, {
        reason: extraction.reason,
        clearIntent: extraction.confidence_factors.clear_intent
      });
      return {
        success: true,
        ticket: null,
        draft: null,
        extraction,
        extraction_method: "assistants-api",
        error: undefined
      };
    }

    // STEP 2: Create ticket
    const ticket = await createTicket({
      source,
      customerEmail: maskedCustomerEmail,
      rawEmailMasked: maskedEmail,
      reason: extraction.reason,
      moveDate: extraction.move_date ? new Date(extraction.move_date) : undefined
    });

    logInfo("Ticket created", logContext, { ticketId: ticket.id });

    // STEP 3: Generate response with Assistants API (with timeout protection)
    let draftText: string;
    try {
      draftText = await withRetry(
        async () => generateResponseWithAssistant(extraction, maskedEmail, logContext, ticket.id),
        2,  // Reduce retries for response to avoid timeout
        500 // Shorter backoff
      );
    } catch (error: any) {
      logError("Response generation failed", logContext, error);
      // Use fallback response on timeout
      draftText = `Vi har mottatt din oppsigelse og vil håndtere denne snarest.`;
    }

    const wordCount = draftText.split(/\s+/).filter(w => w.length > 0).length;

    logInfo("Response generated by Assistants API", logContext, {
      language: extraction.language,
      wordCount,
      length: draftText.length
    });

    // Calculate confidence
    const confidence = calculateConfidenceEnhanced(extraction);

    // Save draft
    const draft = await createDraft({
      ticketId: ticket.id,
      language: extraction.language,
      draftText,
      confidence: String(confidence),
      model: "gpt-5-mini-assistants-v1"
    });

    logInfo("Draft saved", logContext, { draftId: draft.id });

    const duration = Date.now() - startTime;

    // Record metrics
    metricsCollector.record({
      extraction_method: "assistants-api",
      is_cancellation: extraction.is_cancellation,
      edge_case: extraction.edge_case,
      confidence,
      processing_time_ms: duration,
      policy_compliant: true,
      language: extraction.language,
      rag_context_used: true,
      has_payment_issue: extraction.has_payment_issue,
      rag_context_count: 0
    });

    logInfo("Email processing completed successfully", {
      ...logContext,
      duration,
      extraction_method: "assistants-api"
    });

    return {
      success: true,
      ticket: { id: ticket.id },
      draft: { id: draft.id, draftText },
      extraction,
      confidence,
      extraction_method: "assistants-api",
      error: undefined
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError("Assistants API processing failed", { ...logContext, duration }, error);

    return {
      success: false,
      ticket: null,
      draft: null,
      extraction: undefined,
      error: error.message || "Unknown error occurred"
    };
  }
}

export async function healthCheckAssistants(): Promise<{
  status: "healthy" | "unhealthy";
  version: string;
  timestamp: string;
  assistants_available: boolean;
  error?: string;
}> {
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting Assistants API health check", logContext, {
      extractionAssistantId,
      responseAssistantId
    });

    // Verify both assistant IDs are present
    if (!extractionAssistantId || !responseAssistantId) {
      throw new Error("Assistant IDs not configured");
    }

    logInfo("Health check completed successfully", logContext, {
      extractionAssistantId,
      responseAssistantId
    });

    return {
      status: "healthy",
      version: "assistants-api-v1",
      timestamp: new Date().toISOString(),
      assistants_available: true
    };
  } catch (error: any) {
    logError("Assistants API health check failed", logContext, error);

    return {
      status: "unhealthy",
      version: "assistants-api-v1",
      timestamp: new Date().toISOString(),
      assistants_available: false,
      error: error.message
    };
  }
}
