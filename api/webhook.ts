/**
 * Vercel Function: webhook handler for inbound emails (HubSpot or other sources)
 * Updated to use Agents SDK exclusively
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processEmail } from "../apps/agent/dist/index.js";
import { postReview } from "../apps/slack-bot/dist/index.js";
import {
  validateWebhookRequest,
  generateRequestId,
  logInfo,
  logError,
  logWarn,
  type LogContext
} from "@agents/core";

// Configure Vercel function runtime
export const config = {
  runtime: "nodejs",
  regions: ["iad1"]
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Start timing for monitoring
  const startTime = Date.now();
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };

  logInfo("Webhook received", logContext, {
    method: req.method,
    url: req.url,
    userAgent: req.headers["user-agent"]
  });

  if (req.method !== "POST") {
    logWarn("Invalid HTTP method", logContext, { method: req.method });
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validate request body using middleware
    const { source, customerEmail, rawEmail } = validateWebhookRequest(req.body);
    logInfo("Request validation successful", logContext, { source });

    // Process email through Agents SDK
    logInfo("Processing email through Agents SDK", logContext);
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
          logError("Slack posting failed", logContext, error);
          // Don't fail the webhook if Slack fails
        });
      } else {
        logWarn("SLACK_REVIEW_CHANNEL not configured", logContext);
      }
    }

    const duration = Date.now() - startTime;
    logInfo(
      "Webhook processing completed successfully",
      {
        ...logContext,
        duration
      },
      {
        success: result.success,
        ticketId: result.ticket?.id,
        draftId: result.draft?.id,
        confidence: result.confidence,
        route: result.route
      }
    );

    return res.status(200).json({
      success: result.success,
      ticket_id: result.ticket?.id,
      draft_id: result.draft?.id,
      confidence: result.confidence,
      route: result.route,
      request_id: requestId,
      processing_time_ms: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError("Webhook processing failed", { ...logContext, duration }, error);

    // Return appropriate status codes based on error type
    const statusCode = error.message?.includes("quota")
      ? 402
      : error.message?.includes("rate limit")
        ? 429
        : error.message?.includes("timeout")
          ? 504
          : error.message?.includes("validation")
            ? 400
            : 500;

    return res.status(statusCode).json({
      error: error.message || "Internal server error",
      request_id: requestId,
      processing_time_ms: duration
    });
  }
}
