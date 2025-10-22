/**
 * Simplified Email Processor for HITM Workflow
 *
 * This replaces the complex multi-agent system with a straightforward,
 * deterministic approach optimized for human-in-the-middle review.
 *
 * Flow:
 * 1. Mask PII
 * 2. Extract data (regex-based, deterministic)
 * 3. Generate draft (template-based)
 * 4. Save to database
 * 5. Post to Slack for human review
 */
import type { ExtractionResultEnhanced } from "@agents/prompts";
export interface ProcessEmailParams {
  source: string;
  customerEmail: string;
  rawEmail: string;
}
export interface ProcessEmailResult {
  success: boolean;
  ticket?: {
    id: string;
  } | null;
  draft?: {
    id: string;
    draftText: string;
  } | null;
  extraction?: ExtractionResultEnhanced;
  confidence?: number;
  extraction_method?: "deterministic" | "openai" | "ai-sdk";
  error?: string;
}
/**
 * Deterministic email extraction using enhanced pattern matching
 * Uses patterns from patterns.ts for better accuracy
 */
export declare function extractEmailData(email: string): ExtractionResultEnhanced;
/**
 * Main simplified email processor
 * No multi-agent complexity - just clean, deterministic processing
 */
export declare function processEmailSimplified(
  params: ProcessEmailParams
): Promise<ProcessEmailResult>;
/**
 * Health check for simplified processor
 */
export declare function healthCheckSimplified(): Promise<{
  status: "healthy" | "unhealthy";
  version: string;
  timestamp: string;
  error?: string;
}>;
//# sourceMappingURL=simplified-processor.d.ts.map
