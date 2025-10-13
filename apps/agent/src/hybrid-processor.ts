/**
 * Hybrid Email Processor
 * 
 * Uses deterministic extraction for standard cases (fast, free)
 * Falls back to OpenAI for complex/ambiguous cases (accurate, costs API)
 * 
 * Flow:
 * 1. Mask PII
 * 2. Try deterministic extraction
 * 3. If complex case detected → Use OpenAI extraction
 * 4. Generate enhanced draft
 * 5. Save to database
 * 6. Post to Slack for human review
 */

import "dotenv/config";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import {
  maskPII,
  generateRequestId,
  logInfo,
  logError,
  logWarn,
  withRetry,
  type LogContext
} from "@agents/core";
import { createTicket, createDraft } from "@agents/db";
import {
  extractionSchemaEnhanced,
  extractionPromptEnhanced,
  generateDraftEnhanced,
  calculateConfidenceEnhanced,
  detectEdgeCase,
  validatePolicyCompliance,
  type ExtractionResultEnhanced
} from "@agents/prompts";
import { isNonCancellationEmail } from "@agents/prompts";
import { getVectorStoreContext } from "./rag-context.js";
import { extractEmailData as extractEmailDataDeterministic } from "./simplified-processor.js";
import { metricsCollector } from "./metrics.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface ProcessEmailParams {
  source: string;
  customerEmail: string;
  rawEmail: string;
}

export interface ProcessEmailResult {
  success: boolean;
  ticket?: { id: string } | null;
  draft?: { id: string; draftText: string } | null;
  extraction?: ExtractionResultEnhanced;
  confidence?: number;
  extraction_method?: "deterministic" | "openai";
  error?: string;
}

/**
 * Extract using OpenAI for complex cases
 */
async function extractWithOpenAI(
  maskedEmail: string,
  logContext: LogContext
): Promise<ExtractionResultEnhanced> {
  logInfo("Using OpenAI extraction for complex case", logContext);
  
  const completion = await withRetry(
    async () => {
      return await openai.chat.completions.parse(
        {
          model: "gpt-4o-2024-08-06",
          messages: [
            {
              role: "system",
              content: "You are an expert email classifier for Elaway's customer service automation system."
            },
            {
              role: "user",
              content: extractionPromptEnhanced(maskedEmail)
            }
          ],
          response_format: zodResponseFormat(extractionSchemaEnhanced, "extraction"),
          temperature: 0
        },
        { timeout: 30000 }
      );
    },
    3,
    1000
  );

  const parsed = completion.choices[0]?.message?.parsed;
  if (!parsed) {
    throw new Error("Failed to parse extraction response from OpenAI");
  }

  return extractionSchemaEnhanced.parse(parsed);
}

/**
 * Hybrid email processor - uses deterministic for standard cases, OpenAI for complex
 */
export async function processEmailHybrid(
  params: ProcessEmailParams
): Promise<ProcessEmailResult> {
  const { source, customerEmail, rawEmail } = params;
  const requestId = generateRequestId();
  const startTime = Date.now();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting hybrid email processing", logContext, {
      source,
      customerEmail: maskPII(customerEmail)
    });

    const maskedEmail = maskPII(rawEmail);
    const maskedCustomerEmail = maskPII(customerEmail);

    // Try deterministic extraction first
    let extraction = extractEmailDataDeterministic(rawEmail);
    let extractionMethod: "deterministic" | "openai" = "deterministic";

    // Determine if we need OpenAI for complex cases
    const needsOpenAI = 
      !extraction.confidence_factors.standard_case ||
      extraction.confidence_factors.clear_intent === false ||
      extraction.policy_risks.length > 1 ||
      (extraction.edge_case !== "none" && extraction.edge_case !== "sameie_concern" && extraction.edge_case !== "no_app_access");

    if (needsOpenAI) {
      try {
        logInfo("Complex case detected, using OpenAI", logContext, {
          reasons: {
            non_standard: !extraction.confidence_factors.standard_case,
            unclear_intent: !extraction.confidence_factors.clear_intent,
            multiple_risks: extraction.policy_risks.length > 1,
            edge_case: extraction.edge_case
          }
        });
        
        extraction = await extractWithOpenAI(maskedEmail, logContext);
        extractionMethod = "openai";
        
        // Auto-detect edge case if OpenAI missed it
        if (extraction.edge_case === "none") {
          const detectedEdgeCase = detectEdgeCase(rawEmail, extraction);
          if (detectedEdgeCase !== "none") {
            extraction.edge_case = detectedEdgeCase as typeof extraction.edge_case;
            logInfo("Edge case detected post-extraction", logContext, {
              edge_case: detectedEdgeCase
            });
          }
        }
      } catch (error: any) {
        logWarn("OpenAI extraction failed, falling back to deterministic", logContext, {
          error: error.message
        });
        // Fall back to deterministic result
        extraction = extractEmailDataDeterministic(rawEmail);
        extractionMethod = "deterministic";
      }
    }

    logInfo("Email data extracted", logContext, {
      method: extractionMethod,
      isCancellation: extraction.is_cancellation,
      reason: extraction.reason,
      language: extraction.language,
      edgeCase: extraction.edge_case
    });

    // CRITICAL: Validate extraction result
    if (!extraction.is_cancellation) {
      logInfo("Not a cancellation request - no action taken", logContext, {
        detected_type: isNonCancellationEmail(rawEmail) ? "non_cancellation_pattern" : "no_cancellation_intent"
      });
      return {
        success: true,
        ticket: null,
        draft: null,
        extraction,
        extraction_method: extractionMethod,
        error: undefined
      };
    }
    
    // Additional validation: Check confidence factors
    if (extraction.confidence_factors.clear_intent === false) {
      logWarn("Unclear cancellation intent - flagging for review", logContext, {
        extraction
      });
    }

    // Create ticket
    const ticket = await createTicket({
      source,
      customerEmail: maskedCustomerEmail,
      rawEmailMasked: maskedEmail,
      reason: extraction.reason !== "unknown" ? extraction.reason : undefined,
      moveDate: extraction.move_date ? new Date(extraction.move_date) : undefined
    });

    logInfo("Ticket created", logContext, { ticketId: ticket.id });

    // Get RAG context for enhanced draft generation
    const ragContext = await getVectorStoreContext(extraction, logContext);
    
    logInfo("RAG context retrieved", logContext, {
      contextCount: ragContext.length,
      hasContext: ragContext.length > 0
    });

    // Generate enhanced draft with RAG context
    const draftText = generateDraftEnhanced({
      language: extraction.language,
      reason: extraction.reason,
      moveDate: extraction.move_date,
      edgeCase: extraction.edge_case,
      customerConcerns: extraction.customer_concerns,
      hasPaymentIssue: extraction.has_payment_issue,
      paymentConcerns: extraction.payment_concerns,
      ragContext: ragContext
    });

    const wordCount = draftText.split(/\s+/).filter(w => w.length > 0).length;

    // Validate policy compliance
    const validation = validatePolicyCompliance(draftText, extraction.language, extraction.edge_case);

    if (!validation.compliant) {
      logError("Draft failed policy compliance", logContext, {
        errors: validation.errors,
        warnings: validation.warnings
      });
      // Still save but log the issue
    }

    if (validation.warnings.length > 0) {
      logWarn("Draft has policy warnings", logContext, {
        warnings: validation.warnings
      });
    }

    logInfo("Draft generated from enhanced template", logContext, {
      language: extraction.language,
      edgeCase: extraction.edge_case,
      wordCount,
      policyCompliant: validation.compliant
    });

    // Calculate confidence
    const confidence = calculateConfidenceEnhanced(extraction);

    const draft = await createDraft({
      ticketId: ticket.id,
      language: extraction.language,
      draftText,
      confidence: String(confidence),
      model: extractionMethod === "openai" ? "gpt-4o-hybrid-v1" : "template-enhanced-v1"
    });

    logInfo("Draft saved", logContext, { 
      draftId: draft.id,
      confidence
    });

    const duration = Date.now() - startTime;
    
    // Record metrics
    metricsCollector.record({
      extraction_method: extractionMethod,
      is_cancellation: extraction.is_cancellation,
      edge_case: extraction.edge_case,
      confidence,
      processing_time_ms: duration,
      policy_compliant: validation.compliant,
      language: extraction.language,
      rag_context_used: ragContext.length > 0,
      rag_context_count: ragContext.length,
      has_payment_issue: extraction.has_payment_issue,
      non_cancellation_detected: isNonCancellationEmail(rawEmail),
      subject_analyzed: true
    });
    
    logInfo("Email processing completed successfully", {
      ...logContext,
      duration,
      extraction_method: extractionMethod
    });

    return {
      success: true,
      ticket: { id: ticket.id },
      draft: { id: draft.id, draftText },
      extraction,
      confidence,
      extraction_method: extractionMethod,
      error: undefined
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError("Email processing failed", { ...logContext, duration }, error);

    return {
      success: false,
      ticket: null,
      draft: null,
      extraction: undefined,
      error: error.message || "Unknown error occurred"
    };
  }
}

/**
 * Health check for hybrid processor
 */
export async function healthCheckHybrid(): Promise<{
  status: "healthy" | "unhealthy";
  version: string;
  timestamp: string;
  openai_available: boolean;
  error?: string;
}> {
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting health check", logContext);

    // Test deterministic extraction
    const testExtraction = extractEmailDataDeterministic(
      "Hei, jeg skal flytte og vil si opp abonnementet mitt."
    );

    if (!testExtraction.is_cancellation) {
      throw new Error("Test extraction failed - cancellation not detected");
    }

    // Test enhanced draft generation
    const testDraft = generateDraftEnhanced({
      language: testExtraction.language,
      reason: testExtraction.reason,
      moveDate: testExtraction.move_date,
      edgeCase: testExtraction.edge_case,
      customerConcerns: testExtraction.customer_concerns
    });

    if (!testDraft || testDraft.length < 50) {
      throw new Error("Test draft generation failed");
    }

    // Test OpenAI availability (non-blocking)
    let openaiAvailable = false;
    try {
      const testCompletion = await openai.chat.completions.create(
        {
          model: "gpt-4o-2024-08-06",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 5
        },
        { timeout: 5000 }
      );
      openaiAvailable = !!testCompletion;
    } catch (error: any) {
      logWarn("OpenAI health check failed (non-critical)", logContext, {
        error: error.message
      });
    }

    logInfo("Health check completed successfully", logContext);

    return {
      status: "healthy",
      version: "hybrid-enhanced-v1",
      timestamp: new Date().toISOString(),
      openai_available: openaiAvailable
    };
  } catch (error: any) {
    logError("Health check failed", logContext, error);

    return {
      status: "unhealthy",
      version: "hybrid-enhanced-v1",
      timestamp: new Date().toISOString(),
      openai_available: false,
      error: error.message
    };
  }
}

