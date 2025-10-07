// JS version of webhook to avoid TS types and monorepo type resolution in Vercel
import { processEmail } from "../apps/agent/dist/index.js";
import { postReview } from "../apps/slack-bot/dist/index.js";

export const config = { runtime: "nodejs", regions: ["iad1"] };

export default async function handler(req, res) {
  // Start timing for monitoring
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  const log = (level, message, data = {}) => {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      JSON.stringify({ level, message, timestamp: new Date().toISOString(), requestId, ...data })
    );
  };

  log("info", "Webhook received", {
    method: req.method,
    url: req.url,
    ua: req.headers["user-agent"]
  });

  if (req.method !== "POST") {
    log("warn", "Invalid HTTP method", { method: req.method });
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Minimal validation (avoid zod/types at edge)
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const source = typeof body.source === "string" && body.source ? body.source : "hubspot";
    const customerEmail =
      typeof body.customerEmail === "string" && body.customerEmail
        ? body.customerEmail
        : "masked@example.com";
    const rawEmail = typeof body.rawEmail === "string" && body.rawEmail ? body.rawEmail : "";

    if (!rawEmail) {
      return res
        .status(400)
        .json({ error: "validation: rawEmail is required", request_id: requestId });
    }
    log("info", "Request validation successful", { source });

    // Process email through Agents SDK
    log("info", "Processing email through Agents SDK");
    const result = await processEmail({
      source,
      customerEmail,
      rawEmail
    });

    // If draft created, post to Slack for HITM review
    if (result.draft && result.ticket) {
      const slackChannel = process.env.SLACK_REVIEW_CHANNEL;
      if (slackChannel) {
        // Fire and forget - don't await Slack posting to stay under 5s
        postReview({
          ticketId: result.ticket.id,
          draftId: result.draft.id,
          originalEmail: rawEmail, // Use original for Slack display
          draftText: result.draft.draftText,
          confidence: result.confidence,
          extraction: result.extraction || {},
          channel: slackChannel
        }).catch(error => {
          log("error", "Slack posting failed", { error: error?.message || String(error) });
          // Don't fail the webhook if Slack fails
        });
      } else {
        log("warn", "SLACK_REVIEW_CHANNEL not configured");
      }
    }

    const duration = Date.now() - startTime;
    log("info", "Webhook processing completed successfully", {
      duration,
      success: result.success,
      ticketId: result.ticket?.id,
      draftId: result.draft?.id,
      confidence: result.confidence,
      route: result.route
    });

    return res.status(200).json({
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
    log("error", "Webhook processing failed", { duration, error: error?.message || String(error) });

    // Return appropriate status codes based on error type
    const msg = error?.message || "";
    const statusCode = msg.includes("quota")
      ? 402
      : msg.includes("rate limit")
        ? 429
        : msg.includes("timeout")
          ? 504
          : msg.includes("validation")
            ? 400
            : 500;

    return res.status(statusCode).json({
      error: msg || "Internal server error",
      request_id: requestId,
      processing_time_ms: duration
    });
  }
}
