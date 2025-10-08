import "dotenv/config";
import { envSchema } from "@agents/core";

import {
  processEmailHybrid,
  healthCheckHybrid,
  type ProcessEmailParams,
  type ProcessEmailResult
} from "./hybrid-processor.js";

const env = envSchema.parse(process.env);

export type { ProcessEmailParams, ProcessEmailResult };

/**
 * Main email processing function
 * Uses hybrid approach: deterministic for standard cases, OpenAI for complex cases
 */
export async function processEmail(params: ProcessEmailParams): Promise<ProcessEmailResult> {
  return processEmailHybrid(params);
}

/**
 * Health check function
 */
export async function healthCheck() {
  return healthCheckHybrid();
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
