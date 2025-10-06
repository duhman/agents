import "dotenv/config";
import { run } from "@openai/agents";
import {
  maskPII,
  generateRequestId,
  logInfo,
  logError,
  logWarn,
  type LogContext,
  envSchema
} from "@agents/core";
import {
  emailProcessingAgent,
  triageAgent,
  cancellationAgent,
  extractionAgent,
  draftingAgent
} from "@agents/agents-runtime";

const env = envSchema.parse(process.env);

export interface ProcessEmailParams {
  source: string;
  customerEmail: string;
  rawEmail: string;
}

export interface ProcessEmailResult {
  success: boolean;
  ticket?: { id: string } | null;
  draft?: { id: string; draftText: string } | null;
  confidence: number;
  route?: string;
  extraction?: any;
  error?: string;
}

export async function processEmail(params: ProcessEmailParams): Promise<ProcessEmailResult> {
  const { source, customerEmail, rawEmail } = params;
  const requestId = generateRequestId();
  const startTime = Date.now();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting email processing with Agents SDK", logContext, {
      source,
      customerEmail: maskPII(customerEmail)
    });

    // 1. PII masking (REQUIRED FIRST)
    const maskedEmail = maskPII(rawEmail);
    const maskedCustomerEmail = maskPII(customerEmail);

    // 2. Prepare input for the main orchestrator agent
    const agentInput = `Process this email for Elaway customer service:

Source: ${source}
Customer Email: ${maskedCustomerEmail}
Email Content: ${maskedEmail}

Please extract information, create appropriate records, and generate a response if this is a cancellation request.`;

    // 3. Run the main orchestrator agent
    const result = await run(emailProcessingAgent, agentInput);

    if (!result.finalOutput) {
      throw new Error("Agent run completed but no final output received");
    }

    const duration = Date.now() - startTime;
    logInfo(
      "Email processing completed successfully",
      {
        ...logContext,
        duration
      },
      {
        success: result.finalOutput.success,
        ticketId: result.finalOutput.ticket_id,
        draftId: result.finalOutput.draft_id,
        confidence: result.finalOutput.confidence,
        route: result.finalOutput.route
      }
    );

    return {
      success: result.finalOutput.success,
      ticket: result.finalOutput.ticket_id ? { id: result.finalOutput.ticket_id } : null,
      draft: result.finalOutput.draft_id
        ? {
            id: result.finalOutput.draft_id,
            draftText: result.finalOutput.draft_text || ""
          }
        : null,
      confidence: result.finalOutput.confidence,
      route: result.finalOutput.route,
      extraction: result.finalOutput.extraction,
      error: result.finalOutput.error ?? undefined
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError("Email processing failed", { ...logContext, duration }, error);

    return {
      success: false,
      ticket: null,
      draft: null,
      confidence: 0,
      route: "error",
      error: error.message || "Unknown error occurred"
    };
  }
}

/**
 * Simplified function for direct email triage
 * Useful for testing or when you only need routing decisions
 */
export async function triageEmail(email: string): Promise<any> {
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting email triage", logContext);

    const result = await run(triageAgent, email);

    if (!result.finalOutput) {
      throw new Error("Triage agent run completed but no final output received");
    }

    logInfo("Email triage completed", logContext, {
      route: result.finalOutput.route,
      confidence: result.finalOutput.confidence,
      keywords: result.finalOutput.keywords_found
    });

    return result.finalOutput;
  } catch (error: any) {
    logError("Email triage failed", logContext, error);
    throw error;
  }
}

/**
 * Simplified function for direct cancellation handling
 * Useful when you already know it's a cancellation request
 */
export async function handleCancellation(params: {
  source: string;
  customerEmail: string;
  rawEmail: string;
  extraction?: any;
}): Promise<any> {
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting cancellation handling", logContext);

    const input = `Handle this cancellation request:

Source: ${params.source}
Customer Email: ${params.customerEmail}
Email Content: ${params.rawEmail}
${params.extraction ? `Extraction: ${JSON.stringify(params.extraction)}` : ""}

Please process this cancellation request and generate appropriate response.`;

    const result = await run(cancellationAgent, input);

    if (!result.finalOutput) {
      throw new Error("Cancellation agent run completed but no final output received");
    }

    logInfo("Cancellation handling completed", logContext, {
      success: result.finalOutput.success,
      ticketId: result.finalOutput.ticket_id,
      draftId: result.finalOutput.draft_id,
      confidence: result.finalOutput.confidence
    });

    return result.finalOutput;
  } catch (error: any) {
    logError("Cancellation handling failed", logContext, error);
    throw error;
  }
}

/**
 * Direct extraction function using the extraction agent
 * Useful for testing or when you only need structured data extraction
 */
export async function extractEmailData(email: string): Promise<any> {
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting email data extraction", logContext);

    const result = await run(extractionAgent, email);

    if (!result.finalOutput) {
      throw new Error("Extraction agent run completed but no final output received");
    }

    logInfo("Email data extraction completed", logContext, {
      isCancellation: result.finalOutput.is_cancellation,
      reason: result.finalOutput.reason,
      language: result.finalOutput.language
    });

    return result.finalOutput;
  } catch (error: any) {
    logError("Email data extraction failed", logContext, error);
    throw error;
  }
}

/**
 * Direct draft generation function using the drafting agent
 * Useful for testing or when you only need draft generation
 */
export async function generateEmailDraft(params: {
  language: "no" | "en";
  reason: string;
  moveDate?: string;
  customerName?: string;
}): Promise<any> {
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting email draft generation", logContext);

    const input = `Generate a draft response for this cancellation request:

Language: ${params.language}
Reason: ${params.reason}
Move Date: ${params.moveDate || "Not specified"}
Customer Name: ${params.customerName || "Not provided"}

Please generate a professional, policy-compliant response.`;

    const result = await run(draftingAgent, input);

    if (!result.finalOutput) {
      throw new Error("Drafting agent run completed but no final output received");
    }

    logInfo("Email draft generation completed", logContext, {
      language: result.finalOutput.language,
      confidence: result.finalOutput.confidence,
      policyCompliant: result.finalOutput.policy_compliant
    });

    return result.finalOutput;
  } catch (error: any) {
    logError("Email draft generation failed", logContext, error);
    throw error;
  }
}

/**
 * Health check function to verify agent system is working
 */
export async function healthCheck(): Promise<{
  status: "healthy" | "unhealthy";
  agents: string[];
  timestamp: string;
  error?: string;
}> {
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting health check", logContext);

    const agents = [
      "emailProcessingAgent",
      "triageAgent",
      "cancellationAgent",
      "extractionAgent",
      "draftingAgent"
    ];

    // Test with a simple email to verify agents are working
    const testResult = await run(triageAgent, "Test email for health check");

    if (!testResult.finalOutput) {
      throw new Error("Health check failed - no final output from triage agent");
    }

    logInfo("Health check completed successfully", logContext, {
      agentsCount: agents.length,
      testResult: testResult.finalOutput.route
    });

    return {
      status: "healthy",
      agents,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logError("Health check failed", logContext, error);

    return {
      status: "unhealthy",
      agents: [],
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}

// Example usage (for local testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  const testEmail = `
Hei,

Jeg skal flytte til Oslo 15. mars og vil si opp abonnementet mitt.

Mvh,
Ole
  `;

  console.log("Testing Agents SDK implementation...");

  processEmail({
    source: "test",
    customerEmail: "test@example.com",
    rawEmail: testEmail
  })
    .then(result => {
      console.log("✓ Processed with Agents SDK:", {
        success: result.success,
        ticketId: result.ticket?.id,
        draftId: result.draft?.id,
        confidence: result.confidence,
        route: result.route
      });
    })
    .catch(err => {
      console.error("✗ Error:", err);
      process.exit(1);
    });
}
