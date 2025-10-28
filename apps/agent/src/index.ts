import "dotenv/config";
import { envSchema } from "@agents/core";

import {
  processEmailWithAssistants,
  healthCheckAssistants,
  type ProcessEmailParams,
  type ProcessEmailResult
} from "./assistants-processor.js";

const env = envSchema.parse(process.env);

export type { ProcessEmailParams, ProcessEmailResult };

/**
 * Main email processing function.
 * Uses OpenAI Assistants API for both extraction and response generation with
 * automatic vector store retrieval and dynamic response creation.
 */
export async function processEmail(params: ProcessEmailParams): Promise<ProcessEmailResult> {
  return processEmailWithAssistants(params);
}

/**
 * Health check function
 */
export async function healthCheck() {
  return healthCheckAssistants();
}

// Example usage (for local testing)
if (import.meta.url === `file://${process.argv[1]}`) {
  const testEmail = `
Hei,

Jeg skal flytte til Oslo 15. mars og vil si opp abonnementet mitt.

Mvh,
Ole
  `;

  console.log("Testing Assistants API processor...");

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
