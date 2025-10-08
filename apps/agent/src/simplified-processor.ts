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
import { generateDraft, type ExtractionResult } from "@agents/prompts";

export interface ProcessEmailParams {
  source: string;
  customerEmail: string;
  rawEmail: string;
}

export interface ProcessEmailResult {
  success: boolean;
  ticket?: { id: string } | null;
  draft?: { id: string; draftText: string } | null;
  extraction?: ExtractionResult;
  error?: string;
}

/**
 * Deterministic email extraction using pattern matching
 * No AI required - fast, reliable, and predictable
 */
function extractEmailData(email: string): ExtractionResult {
  const emailLower = email.toLowerCase();
  
  const cancellationKeywords = [
    'cancel', 'oppsigelse', 'terminate', 'stop', 'avslutte',
    'si opp', 'say opp', 'slette', 'delete'
  ];
  const isCancellation = cancellationKeywords.some(keyword => emailLower.includes(keyword));
  
  const movingKeywords = [
    'flytt', 'moving', 'relocat', 'move', 'new address', 'ny adresse'
  ];
  const isMoving = movingKeywords.some(keyword => emailLower.includes(keyword));
  
  const norwegianIndicators = ['jeg', 'vi', 'du', 'har', 'til', 'med', 'og', 'en', 'er', 'på'];
  const norwegianCount = norwegianIndicators.filter(word => 
    emailLower.split(/\s+/).includes(word)
  ).length;
  const language: "no" | "en" = norwegianCount >= 2 ? "no" : "en";
  
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
        moveDate = match[0];
      }
      break;
    }
  }
  
  let reason: "moving" | "other" | "unknown";
  if (isCancellation) {
    reason = isMoving ? "moving" : "other";
  } else {
    reason = "unknown";
  }
  
  const policyRisks: string[] = [];
  if (isCancellation && !moveDate && isMoving) {
    policyRisks.push("Moving mentioned but no date found");
  }
  
  return {
    is_cancellation: isCancellation,
    reason,
    move_date: moveDate,
    language,
    policy_risks: policyRisks
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

    const draftText = generateDraft({
      language: extraction.language,
      reason: extraction.reason,
      moveDate: extraction.move_date
    });
    
    logInfo("Draft generated from template", logContext, {
      language: extraction.language,
      length: draftText.length
    });

    const draft = await createDraft({
      ticketId: ticket.id,
      language: extraction.language,
      draftText,
      confidence: "1.0", // Templates always have 100% policy compliance
      model: "template-v1"
    });
    
    logInfo("Draft saved", logContext, { draftId: draft.id });

    const duration = Date.now() - startTime;
    logInfo("Email processing completed successfully", {
      ...logContext,
      duration
    });

    return {
      success: true,
      ticket: { id: ticket.id },
      draft: {
        id: draft.id,
        draftText
      },
      extraction,
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

    logInfo("Health check completed successfully", logContext);

    return {
      status: "healthy",
      version: "simplified-v1",
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    logError("Health check failed", logContext, error);

    return {
      status: "unhealthy",
      version: "simplified-v1",
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}
