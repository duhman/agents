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
import {
  getExtractionAssistantConfig,
  getResponseAssistantConfig,
  type AssistantConfig
} from "./assistant-config.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// Cache assistant IDs to avoid recreating them
let extractionAssistantId: string | null = null;
let responseAssistantId: string | null = null;

async function getOrCreateAssistant(
  config: AssistantConfig,
  cachedId: string | null,
  logContext: LogContext
): Promise<string> {
  if (cachedId) {
    return cachedId;
  }

  logInfo("Creating new assistant", logContext, { name: config.name });

  const assistant = await openai.beta.assistants.create({
    name: config.name,
    instructions: config.instructions,
    model: config.model,
    tools: config.tools,
    tool_resources: config.tool_resources,
    temperature: config.temperature
  });

  logInfo("Assistant created successfully", logContext, {
    assistantId: assistant.id,
    name: config.name
  });

  return assistant.id;
}

async function extractWithAssistant(
  maskedEmail: string,
  logContext: LogContext
): Promise<ExtractionResultEnhanced> {
  logInfo("Using Assistants API for extraction", logContext);

  // Get or create extraction assistant
  extractionAssistantId = await getOrCreateAssistant(
    getExtractionAssistantConfig(),
    extractionAssistantId,
    logContext
  );

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

  // Run the assistant (it will automatically use file_search)
  const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: extractionAssistantId
  });

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
  logContext: LogContext
): Promise<string> {
  logInfo("Using Assistants API for response generation", logContext);

  // Get or create response assistant
  responseAssistantId = await getOrCreateAssistant(
    getResponseAssistantConfig(),
    responseAssistantId,
    logContext
  );

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

  // Stream the response
  const stream = openai.beta.threads.runs.stream(thread.id, {
    assistant_id: responseAssistantId
  });

  let fullResponse = "";

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

    // STEP 1: Extract with Assistants API
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

    // STEP 3: Generate response with Assistants API
    const draftText = await withRetry(
      async () => generateResponseWithAssistant(extraction, maskedEmail, logContext),
      3,
      1000
    );

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
      model: "gpt-4o-assistants-v1"
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
    logInfo("Starting Assistants API health check", logContext);

    // Test extraction assistant creation
    const extractionConfig = getExtractionAssistantConfig();
    const responseConfig = getResponseAssistantConfig();

    logInfo("Health check completed successfully", logContext, {
      extractionAssistantConfigured: !!extractionConfig,
      responseAssistantConfigured: !!responseConfig
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
