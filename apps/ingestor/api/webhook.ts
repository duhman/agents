/**
 * Vercel Function: webhook handler for inbound emails (HubSpot or other sources)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { processEmail } from "@agents/agent";
import { postReview } from "@agents/slack-bot";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { source, customerEmail, rawEmail } = req.body;

    if (!source || !customerEmail || !rawEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Process email through agent
    const result = await processEmail({
      source,
      customerEmail,
      rawEmail
    });

    // If draft created, post to Slack for HITM review
    if (result.draft && result.ticket) {
      await postReview({
        ticketId: result.ticket.id,
        draftId: result.draft.id,
        originalEmail: result.ticket.rawEmailMasked,
        draftText: result.draft.draftText,
        confidence: result.confidence,
        extraction: result.extraction,
        channel: process.env.SLACK_REVIEW_CHANNEL || "C12345" // Configure your Slack channel
      });
    }

    return res.status(200).json({
      success: true,
      ticket_id: result.ticket.id,
      draft_id: result.draft?.id,
      confidence: result.confidence
    });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: error.message });
  }
}

