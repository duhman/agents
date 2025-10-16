/**
 * RAG Context Retrieval for Enhanced Draft Generation
 *
 * Provides contextual information from vector store for edge cases and payment issues
 * to improve draft quality using real customer support conversations.
 */
import type { LogContext } from "@agents/core";
import type { ExtractionResultEnhanced } from "@agents/prompts";
/**
 * Get vector store context for enhanced draft generation
 * Only queries vector store for edge cases, payment issues, or unclear scenarios
 */
export declare function getVectorStoreContext(extraction: ExtractionResultEnhanced, logContext: LogContext): Promise<string[]>;
/**
 * Extract relevant guidance from RAG context for payment issues
 */
export declare function extractPaymentGuidanceFromContext(context: string[], language: string): string | null;
/**
 * Extract tone guidance from RAG context for edge cases
 */
export declare function extractToneGuidanceFromContext(context: string[], language: string): {
    empathetic: boolean;
    apologetic: boolean;
    urgent: boolean;
};
/**
 * Enhance draft with RAG context insights
 */
export declare function enhanceDraftWithRagInsights(baseDraft: string, context: string[], extraction: ExtractionResultEnhanced): string;
/**
 * Get context summary for logging and metrics
 */
export declare function getContextSummary(context: string[]): {
    hasContext: boolean;
    contextCount: number;
    avgContextLength: number;
    containsPaymentGuidance: boolean;
    containsToneGuidance: boolean;
};
//# sourceMappingURL=rag-context.d.ts.map
