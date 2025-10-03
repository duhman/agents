/**
 * Vercel Function: webhook handler for inbound emails (HubSpot or other sources)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processEmail } from "@agents/agent";
import { postReview } from "@agents/slack-bot";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Start timing for monitoring
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  console.log(`[${requestId}] Webhook received`, {
    method: req.method,
    url: req.url
  });

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { source, customerEmail, rawEmail } = req.body;

    // Validate required fields
    if (!source || !customerEmail || !rawEmail) {
      console.warn(`[${requestId}] Missing required fields`);
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["source", "customerEmail", "rawEmail"]
      });
    }

    // Additional validation
    if (typeof source !== 'string' || typeof customerEmail !== 'string' || typeof rawEmail !== 'string') {
      console.warn(`[${requestId}] Invalid field types`);
      return res.status(400).json({ error: "Invalid field types" });
    }

    // Process email through agent
    console.log(`[${requestId}] Processing email from ${source}`);
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
          console.error(`[${requestId}] Slack posting error:`, error);
          // Don't fail the webhook if Slack fails
        });
      } else {
        console.warn(`[${requestId}] SLACK_REVIEW_CHANNEL not configured`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] Processing completed in ${duration}ms`);

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
    console.error(`[${requestId}] Webhook error after ${duration}ms:`, {
      message: error.message,
      stack: error.stack
    });
    
    // Return appropriate status codes
    const statusCode = error.message?.includes('quota') ? 402 :
                       error.message?.includes('rate limit') ? 429 :
                       error.message?.includes('timeout') ? 504 : 500;
    
    return res.status(statusCode).json({ 
      error: error.message || "Internal server error",
      request_id: requestId
    });
  }
}

