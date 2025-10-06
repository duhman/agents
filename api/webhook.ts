/**
 * Vercel Function: webhook handler for inbound emails (HubSpot or other sources)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processEmail } from "@agents/agent";
import { postReview } from "@agents/slack-bot";
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

    // Process email through agent
    logInfo("Processing email through agent", logContext);
    const result = await processEmail({
      source,
      customerEmail,
      rawEmail
    });

    // If draft created, post to Slack for HITM review (async, don't block response)
    if (result.draft && result.ticket) {
      const slackChannel = process.env.SLACK_REVIEW_CHANNEL;
      if (slackChannel) {
        // Fire and forget - don't await Slack posting to stay under 5s
        postReview({
          ticketId: result.ticket.id,
          draftId: result.draft.id,
          originalEmail: result.ticket.rawEmailMasked,
          draftText: result.draft.draftText,
          confidence: result.confidence,
          extraction: result.extraction,
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
      { ...logContext, duration },
      {
        ticketId: result.ticket.id,
        draftId: result.draft?.id,
        confidence: result.confidence
      }
    );

    return res.status(200).json({
      success: true,
      ticket_id: result.ticket.id,
      draft_id: result.draft?.id,
      confidence: result.confidence,
      request_id: requestId,
      processing_time_ms: duration
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError("Webhook processing failed", { ...logContext, duration }, error);

    // Return appropriate status codes
    const statusCode = error.message?.includes("quota")
      ? 402
      : error.message?.includes("rate limit")
        ? 429
        : error.message?.includes("timeout")
          ? 504
          : 500;

    return res.status(statusCode).json({
      error: error.message || "Internal server error",
      request_id: requestId
    });
  }
}
