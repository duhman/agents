import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  SLACK_BOT_TOKEN: z.string().min(1).optional(),
  SLACK_SIGNING_SECRET: z.string().min(1).optional(),
  HUBSPOT_ACCESS_TOKEN: z.string().min(1).optional()
});

export function maskPII(input: string): string {
  return input
    // emails
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    // phone-like
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]")
    // simple address-like tokens (very conservative)
    .replace(/\b\d{1,4}\s+\w+\s+(Street|St|Road|Rd|Ave|Avenue|Gate|Gata)\b/gi, "[address]");
}

