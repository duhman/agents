import "dotenv/config";
import { envSchema } from "@agents/core";

import {
  processEmailHybrid,
  healthCheckHybrid,
  type ProcessEmailParams,
  type ProcessEmailResult
} from "./hybrid-processor.js";

import {
  processEmailWithAiSdk,
  healthCheckAiSdk,
  type WorkflowParams,
  type WorkflowResult
} from "@agents/agents-runtime";

const env = envSchema.parse(process.env);

const AI_SDK_ENABLED = process.env.AI_SDK_ENABLED === "1" || process.env.AI_SDK_ENABLED === "true";

export type { ProcessEmailParams, ProcessEmailResult };

/**
 * Main email processing function
 * Routes to AI SDK workflow if AI_SDK_ENABLED=1, otherwise uses hybrid approach
 */
export async function processEmail(params: ProcessEmailParams): Promise<ProcessEmailResult> {
  if (AI_SDK_ENABLED) {
    return processEmailWithAiSdk(params as WorkflowParams);
  }
  return processEmailHybrid(params);
}

/**
 * Health check function
 */
export async function healthCheck() {
  if (AI_SDK_ENABLED) {
    return healthCheckAiSdk();
  }
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

  console.log("Testing hybrid processor...");

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
