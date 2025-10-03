import "dotenv/config";
import OpenAI from "openai";
import { maskPII, envSchema } from "@agents/core";
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

const env = envSchema.parse(process.env);
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface ProcessEmailParams {
  source: string;
  customerEmail: string;
  rawEmail: string;
}

export async function processEmail(params: ProcessEmailParams) {
  const { source, customerEmail, rawEmail } = params;

  // 1. PII masking
  const maskedEmail = maskPII(rawEmail);

  // 2. Extract structured data with OpenAI
  const extraction = await extractFields(maskedEmail);

  // 3. Store ticket
  const ticket = await createTicket({
    source,
    customerEmail: maskPII(customerEmail),
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
      model: "gpt-4"
    });

    return {
      ticket,
      draft,
      extraction,
      confidence
    };
  }

  return {
    ticket,
    extraction,
    confidence: 0
  };
}

async function extractFields(maskedEmail: string): Promise<ExtractionResult> {
  const completion = await openai.beta.chat.completions.parse({
    model: "gpt-4o-2024-08-06",
    messages: [
      { role: "system", content: systemPolicyEN },
      { role: "user", content: extractionPrompt(maskedEmail) }
    ],
    response_format: zodResponseFormat(extractionSchema, "extraction")
  });

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("Failed to parse extraction response");
  }

  return extractionSchema.parse(parsed);
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

