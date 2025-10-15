import { z } from "zod";
export const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_VECTOR_STORE_ID: z.string().optional(),
    SLACK_BOT_TOKEN: z.string().optional(),
    SLACK_SIGNING_SECRET: z.string().optional(),
    HUBSPOT_ACCESS_TOKEN: z.string().optional(),
    HUBSPOT_PORTAL_ID: z.string().optional(),
    HUBSPOT_PORTAL_BASE_URL: z.string().optional()
});
export function maskPII(input) {
    return (input
        // emails
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
        // phone-like
        .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]")
        // simple address-like tokens (very conservative)
        .replace(/\b\d{1,4}\s+\w+\s+(Street|St|Road|Rd|Ave|Avenue|Gate|Gata)\b/gi, "[address]"));
}
/**
 * Retry logic with exponential backoff for OpenAI API calls
 */
export async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            if (attempt === maxRetries)
                throw error;
            // Only retry on specific OpenAI error codes
            if (error.code === "rate_limit_exceeded" || error.code === "timeout") {
                const delay = baseDelay * Math.pow(2, attempt);
                console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            // Don't retry on other errors (quota, auth, etc.)
            throw error;
        }
    }
    throw new Error("Max retries exceeded");
}
/**
 * Generate a UUID for request tracking
 */
export function generateRequestId() {
    return crypto.randomUUID();
}
/**
 * Structured logging functions
 */
export function logInfo(message, context, data) {
    console.log(JSON.stringify({
        level: "info",
        message,
        timestamp: new Date().toISOString(),
        ...context,
        ...data
    }));
}
export function logError(message, context, error) {
    console.error(JSON.stringify({
        level: "error",
        message,
        timestamp: new Date().toISOString(),
        ...context,
        error: error?.message || error,
        stack: error?.stack
    }));
}
export function logWarn(message, context, data) {
    console.warn(JSON.stringify({
        level: "warn",
        message,
        timestamp: new Date().toISOString(),
        ...context,
        ...data
    }));
}
/**
 * Webhook request validation schema
 */
export const webhookRequestSchema = z.object({
    source: z.string().min(1),
    customerEmail: z.string().email(),
    // Accept either rawEmail (legacy) OR subject+body (new webhook approach)
    rawEmail: z.string().min(1).optional(),
    subject: z.string().optional(),
    body: z.string().optional()
}).refine(data => data.rawEmail || (data.subject || data.body), { message: "Either rawEmail or subject/body must be provided" });
/**
 * Validate webhook request body
 */
export function validateWebhookRequest(body) {
    try {
        return webhookRequestSchema.parse(body);
    }
    catch (error) {
        if (error.name === "ZodError") {
            const errorMessage = error.errors
                .map((e) => `${e.path.join(".")}: ${e.message}`)
                .join(", ");
            throw new Error(`Validation error: ${errorMessage}`);
        }
        throw error;
    }
}
export { getFlags } from "./flags.js";
//# sourceMappingURL=index.js.map