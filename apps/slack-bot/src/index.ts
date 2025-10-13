import "dotenv/config";
import { envSchema } from "@agents/core";

const SUBJECT_MAX_LENGTH = 250;

function getEnv() {
  // Parse lazily to avoid throwing during module import in serverless functions
  return envSchema.parse(process.env);
}

export interface PostReviewParams {
  ticketId: string;
  draftId: string;
  originalEmail: string;
  originalEmailSubject?: string;
  originalEmailBody?: string;
  draftText: string;
  confidence: number;
  extraction: Record<string, any>;
  channel: string;
}

export async function postReview(params: PostReviewParams) {
  const {
    ticketId,
    draftId,
    originalEmail,
    originalEmailSubject,
    originalEmailBody,
    draftText,
    confidence,
    extraction,
    channel
  } = params;

  console.log(JSON.stringify({
    level: "info",
    message: "postReview called",
    timestamp: new Date().toISOString(),
    ticketId,
    draftId,
    channel,
    confidence,
    draftTextLength: draftText?.length || 0
  }));

  const env = getEnv();
  if (!env.SLACK_BOT_TOKEN) {
    throw new Error("SLACK_BOT_TOKEN is required");
  }

  const maxAttempts = 3;
  const baseDelayMs = 1000;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const result = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
        },
        body: JSON.stringify({
        channel,
        text: `Draft Review Required – ${(confidence * 100).toFixed(0)}% confidence, language: ${
          extraction.language || "unknown"
        }`,
        blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "🤖 Draft Review Required"
          }
        },
        // Show payment concerns and customer concerns if they exist
        ...(extraction.payment_concerns && extraction.payment_concerns.length > 0 ? [{
          type: "section" as const,
          text: {
            type: "mrkdwn" as const,
            text: `*💳 Payment Concerns:* ${extraction.payment_concerns.join(", ")}`
          }
        }] : []),
        ...(extraction.customer_concerns && extraction.customer_concerns.length > 0 ? [{
          type: "section" as const,
          text: {
            type: "mrkdwn" as const,
            text: `*🤔 Customer Concerns:* ${extraction.customer_concerns.join(", ")}`
          }
        }] : []),
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Original Email – Subject (masked):*\n${
              (originalEmailSubject ?? (originalEmail?.split("\n")[0] ?? "")).slice(0, SUBJECT_MAX_LENGTH)
            }`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: (() => {
              const body = originalEmailBody ?? originalEmail ?? "";
              const MAX = 2900;
              const safeBody = body.length > MAX ? body.slice(0, MAX) + "\n…[truncated]" : body;
              return `*Original Email – Body (masked):*\n\`\`\`${safeBody}\`\`\``;
            })()
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Draft Reply:*\n\`\`\`${draftText}\`\`\``
          }
        },
        {
          type: "actions",
          block_id: "review_actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "✅ Approve"
              },
              style: "primary",
              action_id: "approve",
              value: JSON.stringify({ ticketId, draftId, draftText })
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "✏️ Edit"
              },
              action_id: "edit",
              value: JSON.stringify({ ticketId, draftId, draftText })
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "❌ Reject"
              },
              style: "danger",
              action_id: "reject",
              value: JSON.stringify({ ticketId, draftId })
            }
          ]
        }
        ]
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);

      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(`Slack API error: ${result.status} ${errorText}`);
      }

      const response = await result.json();
      if (!response.ok) {
        throw new Error(`Slack API error: ${response.error}`);
      }

      console.log(JSON.stringify({
        level: "info",
        message: "Slack postReview successful",
        timestamp: new Date().toISOString(),
        ticketId,
        draftId,
        channel,
        messageTs: response.ts,
        attempt
      }));

      return response;
    } catch (e: any) {
      const msg = e?.data?.error || e?.message || String(e);
      const isAbort = e?.name === "AbortError" || msg.includes("aborted");
      const canRetry = isAbort || /fetch failed|ECONNRESET|ENOTFOUND|EAI_AGAIN|TLS|ETIMEDOUT/i.test(msg);
      
      console.error(JSON.stringify({
        level: "error",
        message: "Slack postReview attempt failed",
        timestamp: new Date().toISOString(),
        error: msg,
        ticketId,
        draftId,
        attempt,
        canRetry,
        isAbort
      }));
      
      if (canRetry && attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(JSON.stringify({
          level: "info",
          message: "Retrying Slack postReview",
          timestamp: new Date().toISOString(),
          ticketId,
          draftId,
          attempt: attempt + 1,
          delayMs: delay
        }));
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      throw e;
    }
  }
  
  throw new Error("Slack postReview exhausted retries");
}

