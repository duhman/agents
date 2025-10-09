// JS version of webhook to avoid TS types and monorepo type resolution in Vercel
import { randomUUID } from "crypto";
import type { VercelRequest, VercelResponse } from "@vercel/node";
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
    const rawEmail = typeof body.rawEmail === "string" && body.rawEmail ? body.rawEmail : "";

    if (!rawEmail) {
      res.status(400).json({ error: "validation: rawEmail is required", request_id: requestId });
      return;
    }
    log("info", "Request validation successful", { source, requestId });
    const parseAndMaskEmail = (text: string) => {
      const masked = maskPII(text || "");
      const lines = masked.split(/\r?\n/);
      let subject = "";
      let bodyStartIdx = 0;

      for (let i = 0; i < lines.length; i++) {
        const l = lines[i] || "";
        if (!subject && /^subject\s*:/i.test(l)) {
          subject = l.replace(/^subject\s*:\s*/i, "").trim();
        }
        if (lines[i] === "" && i < lines.length - 1) {
          bodyStartIdx = i + 1;
          break;
        }
      }

      if (!subject) {
        const firstNonEmpty = lines.find((l: string) => (l || "").trim().length > 0) || "";
        subject = firstNonEmpty.trim();
      }

      const body = lines.slice(bodyStartIdx).join("\n").trim();
      const finalBody = body || masked;
      return { subject, body: finalBody };
    };


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
        // Fire and forget - don't await Slack posting to stay under 5s
        const extraction =
          typeof result.extraction === "object" && result.extraction !== null
            ? (result.extraction as Record<string, unknown>)
            : {};

        const { subject: maskedSubject, body: maskedBody } = parseAndMaskEmail(rawEmail);

        const slackPayload: PostReviewParams & { originalEmailSubject?: string; originalEmailBody?: string } = {
          ticketId: result.ticket.id,
          draftId: result.draft.id,
          originalEmail: `${maskedSubject}\n\n${maskedBody}`,
          originalEmailSubject: maskedSubject,
          originalEmailBody: maskedBody,
          draftText: result.draft.draftText,
          confidence: result.confidence,
          extraction,
          channel: slackChannel
        };

        postReview(slackPayload).catch((error: unknown) => {
          log("error", "Slack posting failed", {
            error: parseErrorMessage(error),
            requestId
          });
          // Don't fail the webhook if Slack fails
        });
      } else {
        log("warn", "SLACK_REVIEW_CHANNEL not configured", { requestId });
      }
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
