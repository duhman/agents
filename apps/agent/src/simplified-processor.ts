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

import "dotenv/config";
import {
  maskPII,
  generateRequestId,
  logInfo,
  logError,
  type LogContext
} from "@agents/core";
import { createTicket, createDraft } from "@agents/db";
import {
  generateDraftEnhanced,
  calculateConfidenceEnhanced,
  detectEdgeCase,
  validatePolicyCompliance,
  type ExtractionResultEnhanced
} from "@agents/prompts";
import { 
  detectCancellationIntent,
  detectCancellationIntentEnhanced,
  detectPaymentIssue,
  detectLanguage,
  extractCustomerConcerns,
  calculateConfidenceFactors,
  detectEdgeCaseFromPatterns
} from "@agents/prompts";

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
  error?: string;
}

/**
 * Helper function to calculate months from now
 */
function getMonthsFromNow(dateStr: string): number {
  try {
    const moveDate = new Date(dateStr);
    const now = new Date();
    const months = (moveDate.getFullYear() - now.getFullYear()) * 12 + 
                   (moveDate.getMonth() - now.getMonth());
    return months;
  } catch {
    return 0;
  }
}

/**
 * Deterministic email extraction using enhanced pattern matching
 * Uses patterns from patterns.ts for better accuracy
 */
export function extractEmailData(email: string): ExtractionResultEnhanced {
  // Use enhanced detection with subject/body separation
  const isCancellation = detectCancellationIntentEnhanced(email);
  const hasPaymentIssue = detectPaymentIssue(email);
  const language = detectLanguage(email);
  const customerConcerns = extractCustomerConcerns(email);
  const confidenceFactors = calculateConfidenceFactors(email);
  
  const emailLower = email.toLowerCase();
  
  const movingKeywords = [
    'flytt', 'moving', 'relocat', 'move', 'new address', 'ny adresse', 'nya adress'
  ];
  const isMoving = movingKeywords.some(keyword => emailLower.includes(keyword));
  
  let moveDate: string | null = null;
  const datePatterns = [
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
    /\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/,
    /\b(\d{1,2})\.?\s+(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember)/i,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/i,
    /\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/i
  ];
  
  for (const pattern of datePatterns) {
    const match = email.match(pattern);
    if (match) {
      if (pattern.source.includes('\\d{4}-\\d{2}-\\d{2}')) {
        moveDate = match[0]; // Already ISO
      } else if (pattern.source.includes('[./]')) {
        const [_, day, month, year] = match;
        moveDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      } else {
        // For text dates, we'll keep them as-is for now
        moveDate = match[0];
      }
      break;
    }
  }
  
  // Determine reason with payment issue support
  let reason: "moving" | "payment_issue" | "other" | "unknown";
  if (isCancellation) {
    if (hasPaymentIssue) {
      reason = "payment_issue";
    } else if (isMoving) {
      reason = "moving";
    } else {
      reason = "other";
    }
  } else {
    reason = "unknown";
  }
  
  const policyRisks: string[] = [];
  if (isCancellation && !moveDate && isMoving) {
    policyRisks.push("Moving mentioned but no date found");
  }
  if (hasPaymentIssue && !customerConcerns.includes('payment_issue')) {
    policyRisks.push("Payment issue detected but not explicitly mentioned");
  }
  
  // Detect edge cases using enhanced detection
  const detectedEdgeCase = detectEdgeCaseFromPatterns(email);
  const edgeCase = detectedEdgeCase as "none" | "no_app_access" | "corporate_account" | "future_move_date" | "already_canceled" | "sameie_concern" | "payment_dispute";
  
  // Determine urgency
  const urgency: "immediate" | "future" | "unclear" = moveDate ? 
    (getMonthsFromNow(moveDate) > 1 ? "future" : "immediate") : 
    (isCancellation ? "immediate" : "unclear");
  
  // Extract payment concerns
  const paymentConcerns: string[] = [];
  if (hasPaymentIssue) {
    if (emailLower.includes('refund') || emailLower.includes('refusjon') || emailLower.includes('återbetalning')) {
      paymentConcerns.push('refund_request');
    }
    if (emailLower.includes('double') || emailLower.includes('dobbel') || emailLower.includes('dubbel')) {
      paymentConcerns.push('double_charge');
    }
    if (emailLower.includes('error') || emailLower.includes('feil') || emailLower.includes('fel')) {
      paymentConcerns.push('billing_error');
    }
  }
  
  return {
    is_cancellation: isCancellation,
    reason,
    move_date: moveDate,
    language,
    edge_case: edgeCase,
    has_payment_issue: hasPaymentIssue,
    payment_concerns: paymentConcerns,
    urgency,
    customer_concerns: customerConcerns,
    policy_risks: policyRisks,
    confidence_factors: confidenceFactors
  };
}

/**
 * Main simplified email processor
 * No multi-agent complexity - just clean, deterministic processing
 */
export async function processEmailSimplified(
  params: ProcessEmailParams
): Promise<ProcessEmailResult> {
  const { source, customerEmail, rawEmail } = params;
  const requestId = generateRequestId();
  const startTime = Date.now();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting simplified email processing", logContext, {
      source,
      customerEmail: maskPII(customerEmail)
    });

    const maskedEmail = maskPII(rawEmail);
    const maskedCustomerEmail = maskPII(customerEmail);
    
    logInfo("PII masked successfully", logContext);

    const extraction = extractEmailData(rawEmail);
    
    logInfo("Email data extracted", logContext, {
      isCancellation: extraction.is_cancellation,
      reason: extraction.reason,
      language: extraction.language
    });

    if (!extraction.is_cancellation) {
      logInfo("Not a cancellation request - no action taken", logContext);
      return {
        success: true,
        ticket: null,
        draft: null,
        extraction,
        error: undefined
      };
    }

    const ticket = await createTicket({
      source,
      customerEmail: maskedCustomerEmail,
      rawEmailMasked: maskedEmail,
      reason: extraction.reason !== "unknown" ? extraction.reason : undefined,
      moveDate: extraction.move_date ? new Date(extraction.move_date) : undefined
    });
    
    logInfo("Ticket created", logContext, { ticketId: ticket.id });

    const draftText = generateDraftEnhanced({
      language: extraction.language,
      reason: extraction.reason,
      moveDate: extraction.move_date,
      edgeCase: extraction.edge_case,
      customerConcerns: extraction.customer_concerns,
      hasPaymentIssue: extraction.has_payment_issue,
      paymentConcerns: extraction.payment_concerns,
      ragContext: [] // No RAG context in simplified processor
    });
    
    const wordCount = draftText.split(/\s+/).filter(w => w.length > 0).length;
    
    logInfo("Draft generated from enhanced template", logContext, {
      language: extraction.language,
      edgeCase: extraction.edge_case,
      wordCount,
      length: draftText.length
    });

    const confidenceScore = calculateConfidenceEnhanced(extraction);

    const draft = await createDraft({
      ticketId: ticket.id,
      language: extraction.language,
      draftText,
      confidence: String(confidenceScore),
      model: "template-enhanced-v1"
    });
    
    logInfo("Draft saved", logContext, { draftId: draft.id });

    const duration = Date.now() - startTime;
    logInfo("Email processing completed successfully", {
      ...logContext,
      duration,
      confidence: confidenceScore
    });

    return {
      success: true,
      ticket: { id: ticket.id },
      draft: {
        id: draft.id,
        draftText
      },
      extraction,
      confidence: confidenceScore,
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
 * Health check for simplified processor
 */
export async function healthCheckSimplified(): Promise<{
  status: "healthy" | "unhealthy";
  version: string;
  timestamp: string;
  error?: string;
}> {
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };

  try {
    logInfo("Starting health check", logContext);

    const testExtraction = extractEmailData(
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

    logInfo("Health check completed successfully", logContext);

    return {
      status: "healthy",
      version: "template-enhanced-v1",
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logError("Health check failed", logContext, error);

    return {
      status: "unhealthy",
      version: "template-enhanced-v1",
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}
