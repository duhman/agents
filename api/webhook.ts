// JS version of webhook to avoid TS types and monorepo type resolution in Vercel
import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { waitUntil } from "@vercel/functions";
// @ts-expect-error - compiled output does not ship type definitions
import { processEmail } from "../apps/agent/dist/index.js";
// @ts-expect-error - compiled output does not ship type definitions
import { postReview } from "../apps/slack-bot/dist/index.js";
import { maskPII } from "@agents/core";


export const config = { runtime: "nodejs", regions: ["iad1"] };

type LogLevel = "info" | "warn" | "error" | "debug";

interface WebhookPayload {
  source?: string;
  customerEmail?: string;
  rawEmail?: string;
  subject?: string;
  body?: string;
}

interface ProcessEmailResult {
  success: boolean;
  ticket?: { id: string } | null;
  draft?: { id: string; draftText: string } | null;
  confidence: number;
  route?: string | null;
  extraction?: unknown;
  error?: string;
}

interface PostReviewParams {
  ticketId: string;
  draftId: string;
  originalEmail: string;
  draftText: string;
  confidence: number;
  extraction: Record<string, unknown>;
  channel: string;
}

const parseErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const log = (
  level: LogLevel,
  message: string,
  data: Record<string, unknown> = {}
): void => {
  const payload = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data
  });

  if (level === "error") {
    console.error(payload);
  } else if (level === "warn") {
    console.warn(payload);
  } else {
    console.log(payload);
  }
};

// Simple helper to parse subject from rawEmail format
function parseSubjectBody(text: string): { subject: string; body: string } {
  const lines = text.split(/\r?\n/);
  const subjectLine = lines.find(l => /^subject\s*:/i.test(l));
  
  if (subjectLine) {
    const subject = subjectLine.replace(/^subject\s*:\s*/i, "").trim();
    const bodyStartIdx = lines.indexOf(subjectLine) + 1;
    const body = lines.slice(bodyStartIdx).join("\n").trim();
    return { subject, body: body || text };
  }
  
  return { subject: "", body: text };
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Start timing for monitoring
  const startTime = Date.now();
  const requestId = randomUUID();

  log("info", "Webhook received", {
    method: req.method,
    url: req.url,
    ua: req.headers["user-agent"],
    requestId
  });

  if (req.method !== "POST") {
    log("warn", "Invalid HTTP method", { method: req.method, requestId });
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    // Minimal validation (avoid zod/types at edge)
    const rawBody = typeof req.body === "string" ? JSON.parse(req.body) : req.body ?? {};
    const body = (rawBody ?? {}) as WebhookPayload;
    const source = typeof body.source === "string" && body.source ? body.source : "hubspot";
    const customerEmail =
      typeof body.customerEmail === "string" && body.customerEmail
        ? body.customerEmail
        : "masked@example.com";

    // Support both formats: rawEmail (legacy) or subject+body (new)
    let rawEmail = "";
    let originalSubject = "";
    let originalBody = "";
    
    if (typeof body.rawEmail === "string" && body.rawEmail) {
      rawEmail = body.rawEmail;
      // Parse subject/body from legacy format
      const parsed = parseSubjectBody(rawEmail);
      originalSubject = parsed.subject;
      originalBody = parsed.body;
    } else {
      originalSubject = typeof body.subject === "string" ? body.subject : "";
      originalBody = typeof body.body === "string" ? body.body : "";
      
      if (!originalSubject && !originalBody) {
        res.status(400).json({ 
          error: "validation: Either rawEmail or subject/body must be provided", 
          request_id: requestId 
        });
        return;
      }
      
      // Construct rawEmail format from subject and body for processing
      rawEmail = originalSubject ? `Subject: ${originalSubject}\n\n${originalBody}` : originalBody;
    }
    log("info", "Request validation successful", { 
      source, 
      requestId,
      format: body.rawEmail ? "legacy" : "webhook-only",
      subjectLength: originalSubject.length,
      bodyLength: originalBody.length,
      subjectPreview: originalSubject.slice(0, 50),
      bodyPreview: originalBody.slice(0, 50)
    });


    // Process email through Agents SDK
    log("info", "Processing email through Agents SDK", { requestId });
    const result: ProcessEmailResult = await processEmail({
      source,
      customerEmail,
      rawEmail
    });

    // If draft created, post to Slack for HITM review
    if (result.draft && result.ticket) {
      const slackChannel = process.env.SLACK_REVIEW_CHANNEL;
      if (slackChannel) {
        log("info", "Attempting to post draft to Slack", {
          requestId,
          channel: slackChannel,
          ticketId: result.ticket.id,
          draftId: result.draft.id,
          confidence: result.confidence
        });
        
        // Fire and forget - don't await Slack posting to stay under 5s
        const extraction =
          typeof result.extraction === "object" && result.extraction !== null
            ? (result.extraction as Record<string, unknown>)
            : {};

        // Use original subject/body values directly (already masked by PII masking in processing)
        const maskedRawEmail = maskPII(rawEmail);
        const maskedSubject = maskPII(originalSubject);
        const maskedBody = maskPII(originalBody);

        const slackPayload: PostReviewParams & { originalEmailSubject?: string; originalEmailBody?: string } = {
          ticketId: result.ticket.id,
          draftId: result.draft.id,
          originalEmail: maskedRawEmail,
          originalEmailSubject: maskedSubject,
          originalEmailBody: maskedBody,
          draftText: result.draft.draftText,
          confidence: result.confidence,
          extraction,
          channel: slackChannel
        };

        const slackTask = postReview(slackPayload).catch((error: unknown) => {
          log("error", "Slack posting failed", {
            error: parseErrorMessage(error),
            requestId,
            channel: slackChannel,
            ticketId: result.ticket?.id,
            draftId: result.draft?.id
          });
        });

        if (typeof waitUntil === "function") {
          waitUntil(slackTask);
        } else {
          // Non-Vercel environments: still fire-and-forget without blocking response
          void slackTask;
        }
      } else {
        log("warn", "SLACK_REVIEW_CHANNEL not configured", { requestId });
      }
    } else {
      log("warn", "No draft or ticket created, skipping Slack posting", {
        requestId,
        hasDraft: !!result.draft,
        hasTicket: !!result.ticket,
        success: result.success
      });
    }

    const duration = Date.now() - startTime;
    log("info", "Webhook processing completed successfully", {
      duration,
      success: result.success,
      ticketId: result.ticket?.id,
      draftId: result.draft?.id,
      confidence: result.confidence,
      route: result.route,
      requestId
    });

    res.status(200).json({
      success: result.success,
      ticket_id: result.ticket?.id,
      draft_id: result.draft?.id,
      confidence: result.confidence,
      route: result.route,
      request_id: requestId,
      processing_time_ms: duration
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const message = parseErrorMessage(error);
    log("error", "Webhook processing failed", { duration, error: message, requestId });

    // Return appropriate status codes based on error type
    const normalized = message.toLowerCase();
    const statusCode = normalized.includes("quota")
      ? 402
      : normalized.includes("rate limit")
        ? 429
        : normalized.includes("timeout")
          ? 504
          : normalized.includes("validation")
            ? 400
            : 500;

    res.status(statusCode).json({
      error: message || "Internal server error",
      request_id: requestId,
      processing_time_ms: duration
    });
  }
}
