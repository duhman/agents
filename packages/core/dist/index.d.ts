import { z } from "zod";
export declare const envSchema: z.ZodObject<{
    DATABASE_URL: z.ZodString;
    OPENAI_API_KEY: z.ZodString;
    OPENAI_VECTOR_STORE_ID: z.ZodOptional<z.ZodString>;
    SLACK_BOT_TOKEN: z.ZodOptional<z.ZodString>;
    SLACK_SIGNING_SECRET: z.ZodOptional<z.ZodString>;
    HUBSPOT_ACCESS_TOKEN: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    DATABASE_URL: string;
    OPENAI_API_KEY: string;
    OPENAI_VECTOR_STORE_ID?: string | undefined;
    SLACK_BOT_TOKEN?: string | undefined;
    SLACK_SIGNING_SECRET?: string | undefined;
    HUBSPOT_ACCESS_TOKEN?: string | undefined;
}, {
    DATABASE_URL: string;
    OPENAI_API_KEY: string;
    OPENAI_VECTOR_STORE_ID?: string | undefined;
    SLACK_BOT_TOKEN?: string | undefined;
    SLACK_SIGNING_SECRET?: string | undefined;
    HUBSPOT_ACCESS_TOKEN?: string | undefined;
}>;
export declare function maskPII(input: string): string;
/**
 * Retry logic with exponential backoff for OpenAI API calls
 */
export declare function withRetry<T>(fn: () => Promise<T>, maxRetries?: number, baseDelay?: number): Promise<T>;
/**
 * Generate a UUID for request tracking
 */
export declare function generateRequestId(): string;
/**
 * Structured logging interface
 */
export interface LogContext {
    requestId: string;
    userId?: string;
    ticketId?: string;
    duration?: number;
    [key: string]: any;
}
/**
 * Structured logging functions
 */
export declare function logInfo(message: string, context: LogContext, data?: any): void;
export declare function logError(message: string, context: LogContext, error?: any): void;
export declare function logWarn(message: string, context: LogContext, data?: any): void;
/**
 * Webhook request validation schema
 */
export declare const webhookRequestSchema: z.ZodObject<{
    source: z.ZodString;
    customerEmail: z.ZodString;
    rawEmail: z.ZodString;
}, "strip", z.ZodTypeAny, {
    source: string;
    customerEmail: string;
    rawEmail: string;
}, {
    source: string;
    customerEmail: string;
    rawEmail: string;
}>;
export type WebhookRequest = z.infer<typeof webhookRequestSchema>;
/**
 * Validate webhook request body
 */
export declare function validateWebhookRequest(body: any): WebhookRequest;
export { getFlags } from "./flags.js";
//# sourceMappingURL=index.d.ts.map