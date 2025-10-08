import "dotenv/config";
import { envSchema } from "@agents/core";

import {
  processEmailSimplified,
  healthCheckSimplified,
  type ProcessEmailParams,
  type ProcessEmailResult
} from "./simplified-processor.js";

const env = envSchema.parse(process.env);

export type { ProcessEmailParams, ProcessEmailResult };

/**
 * Main email processing function
 * Now uses simplified deterministic processor instead of multi-agent system
 */
export async function processEmail(params: ProcessEmailParams): Promise<ProcessEmailResult> {
  return processEmailSimplified(params);
}

/**
 * Health check function
 */
export async function healthCheck(): Promise<{
  status: "healthy" | "unhealthy";
  version: string;
  timestamp: string;
  error?: string;
}> {
  return healthCheckSimplified();
}

// Example usage (for local testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  const testEmail = `
Hei,

Jeg skal flytte til Oslo 15. mars og vil si opp abonnementet mitt.

Mvh,
Ole
  `;

  console.log("Testing simplified processor...");

  processEmail({
    source: "test",
    customerEmail: "test@example.com",
    rawEmail: testEmail
  })
    .then(result => {
      console.log("✓ Processed successfully:", {
        success: result.success,
        ticketId: result.ticket?.id,
        draftId: result.draft?.id,
        extraction: result.extraction
      });
      if (result.draft) {
        console.log("\n📝 Draft:\n", result.draft.draftText);
      }
    })
    .catch(err => {
      console.error("✗ Error:", err);
      process.exit(1);
    });
}
