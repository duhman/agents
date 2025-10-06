import "dotenv/config";
import OpenAI from "openai";
import {
  maskPII,
  envSchema,
  withRetry,
  generateRequestId,
  logInfo,
  logError,
  logWarn,
  type LogContext
} from "@agents/core";
import {
  extractionSchema,
  extractionPrompt,
  systemPolicyNO,
  systemPolicyEN,
  generateDraft,
  type ExtractionResult
} from "@agents/prompts";
import { createTicket, createDraft } from "@agents/db";
import { zodResponseFormat } from "openai/helpers/zod";
import { run, Agent } from "@openai/agents";
import { triageAgent } from "@agents/agents-runtime";

const env = envSchema.parse(process.env);
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface ProcessEmailParams {
  source: string;
  customerEmail: string;
  rawEmail: string;
}

export async function processEmail(params: ProcessEmailParams) {
  const { source, customerEmail, rawEmail } = params;
  const requestId = generateRequestId();
  const startTime = Date.now();

  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting email processing", logContext, {
      source,
      customerEmail: maskPII(customerEmail)
    });

    // 1. PII masking (REQUIRED FIRST)
    const maskedEmail = maskPII(rawEmail);
    const maskedCustomerEmail = maskPII(customerEmail);

    // If Agents SDK enabled, run triage agent and map result
    if (process.env.USE_AGENTS_SDK === "1") {
      const runResult = await run(triageAgent as unknown as Agent, maskedEmail);
      // For now, reuse existing extraction to keep compatibility
      const extraction = await extractFields(maskedEmail, logContext);
      const ticket = await createTicket({
        source,
        customerEmail: maskedCustomerEmail,
        rawEmailMasked: maskedEmail,
        reason: extraction.reason === "unknown" ? undefined : extraction.reason,
        moveDate: extraction.move_date ? new Date(extraction.move_date) : undefined
      });

      if (extraction.is_cancellation) {
        const draftText = generateDraft({
          language: extraction.language,
          reason: extraction.reason,
          moveDate: extraction.move_date
        });

        const confidence = calculateConfidence(extraction);
        const draft = await createDraft({
          ticketId: ticket.id,
          language: extraction.language,
          draftText,
          confidence: confidence.toString(),
          model: "gpt-4o-2024-08-06"
        });

        // Log compact trace summary if available
        if ((runResult as any)?.trace) {
          const trace = (runResult as any).trace;
          console.log("AgentsSDK trace", {
            agentPath: trace.agentPath,
            toolCalls: trace.toolCalls?.length,
            duration: trace.duration,
            success: trace.success
          });
        }

        return { ticket, draft, extraction, confidence };
      }

      return { ticket, extraction, confidence: 0 };
    }

    // 2. Extract structured data with OpenAI (non-SDK path)
    const extraction = await extractFields(maskedEmail, logContext);

    // 3. Store ticket
    const ticket = await createTicket({
      source,
      customerEmail: maskedCustomerEmail,
      rawEmailMasked: maskedEmail,
      reason: extraction.reason === "unknown" ? undefined : extraction.reason,
      moveDate: extraction.move_date ? new Date(extraction.move_date) : undefined
    });

    // 4. Generate draft if it's a cancellation
    if (extraction.is_cancellation) {
      const draftText = generateDraft({
        language: extraction.language,
        reason: extraction.reason,
        moveDate: extraction.move_date
      });

      const confidence = calculateConfidence(extraction);

      const draft = await createDraft({
        ticketId: ticket.id,
        language: extraction.language,
        draftText,
        confidence: confidence.toString(),
        model: "gpt-4o-2024-08-06" // Use correct model name
      });

      const duration = Date.now() - startTime;
      logInfo(
        "Email processing completed successfully",
        { ...logContext, ticketId: ticket.id, duration },
        {
          isCancellation: extraction.is_cancellation,
          confidence,
          language: extraction.language
        }
      );

      return {
        ticket,
        draft,
        extraction,
        confidence
      };
    }

    const duration = Date.now() - startTime;
    logInfo("Email processing completed (no cancellation)", {
      ...logContext,
      ticketId: ticket.id,
      duration
    });

    return {
      ticket,
      extraction,
      confidence: 0
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError("Email processing failed", { ...logContext, duration }, error);
    throw error; // Re-throw to be handled by caller
  }
}

async function extractFields(
  maskedEmail: string,
  logContext: LogContext
): Promise<ExtractionResult> {
  try {
    logInfo("Starting OpenAI extraction", logContext);

    const completion = await withRetry(
      async () => {
        return await openai.chat.completions.parse({
          model: "gpt-4o-2024-08-06",
          messages: [
            { role: "system", content: systemPolicyEN },
            { role: "user", content: extractionPrompt(maskedEmail) }
          ],
          response_format: zodResponseFormat(extractionSchema, "extraction"),
          temperature: 0, // Deterministic for policy-critical extractions
          timeout: 30000 // 30 second timeout
        });
      },
      3,
      1000
    );

    const parsed = completion.choices[0]?.message?.parsed;
    if (!parsed) {
      throw new Error("Failed to parse extraction response from OpenAI");
    }

    // Additional validation with Zod
    const result = extractionSchema.parse(parsed);
    logInfo("OpenAI extraction completed successfully", logContext, {
      isCancellation: result.is_cancellation,
      reason: result.reason,
      language: result.language
    });

    return result;
  } catch (error: any) {
    // Enhanced error handling for OpenAI API issues
    if (error.code === "insufficient_quota") {
      logError("OpenAI API quota exceeded", logContext, error);
      throw new Error("OpenAI API quota exceeded. Please check your billing.");
    } else if (error.code === "rate_limit_exceeded") {
      logError("OpenAI API rate limit exceeded", logContext, error);
      throw new Error("OpenAI API rate limit exceeded. Retry after delay.");
    } else if (error.code === "timeout") {
      logError("OpenAI API request timed out", logContext, error);
      throw new Error("OpenAI API request timed out. Please try again.");
    } else if (error.name === "ZodError") {
      logError("Schema validation error", logContext, error);
      throw new Error("Invalid extraction format from OpenAI");
    }

    logError("OpenAI extraction error", logContext, error);
    throw new Error(`Extraction failed: ${error.message || "Unknown error"}`);
  }
}

function calculateConfidence(extraction: ExtractionResult): number {
  let confidence = 0.5;

  if (extraction.is_cancellation) confidence += 0.3;
  if (extraction.reason !== "unknown") confidence += 0.1;
  if (extraction.move_date) confidence += 0.1;
  if (extraction.policy_risks.length === 0) confidence += 0.1;

  return Math.min(confidence, 1.0);
}

// Example usage (for local testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  const testEmail = `
Hei,

Jeg skal flytte til Oslo 15. mars og vil si opp abonnementet mitt.

Mvh,
Ole
  `;

  processEmail({
    source: "test",
    customerEmail: "test@example.com",
    rawEmail: testEmail
  })
    .then(result => {
      console.log("✓ Processed:", result);
    })
    .catch(err => {
      console.error("✗ Error:", err);
      process.exit(1);
    });
}
