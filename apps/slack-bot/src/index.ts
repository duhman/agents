import "dotenv/config";
// Import CommonJS package using default import for ES module compatibility
import slackBolt from "@slack/bolt";
import type {
  App as AppType,
  SlackActionMiddlewareArgs,
  BlockButtonAction,
  SlackViewMiddlewareArgs,
  ViewSubmitAction,
  AllMiddlewareArgs
} from "@slack/bolt";
import { envSchema } from "@agents/core";
import { createHumanReview, getTicketById, getDraftById } from "@agents/db";

// Extract App from the CommonJS default export
const { App } = slackBolt;

let app: AppType | undefined;

function getEnv() {
  // Parse lazily to avoid throwing during module import in serverless functions
  return envSchema.parse(process.env);
}

function getApp(): AppType {
  if (app) return app;
  const env = getEnv();
  if (!env.SLACK_BOT_TOKEN || !env.SLACK_SIGNING_SECRET) {
    throw new Error("SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET are required");
  }
  app = new App({ token: env.SLACK_BOT_TOKEN, signingSecret: env.SLACK_SIGNING_SECRET });
  return app;
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

  const slack = getApp();
  try {
    const result = await slack.client.chat.postMessage({
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
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Confidence:* ${(confidence * 100).toFixed(0)}%`
            },
            {
              type: "mrkdwn",
              text: `*Language:* ${extraction.language || "unknown"}`
            },
            {
              type: "mrkdwn",
              text: `*Reason:* ${extraction.reason || "unknown"}`
            },
            {
              type: "mrkdwn",
              text: `*Move Date:* ${extraction.move_date || "N/A"}`
            }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Original Email – Subject (masked):*\n${
              (originalEmailSubject ?? (originalEmail?.split("\n")[0] ?? "")).slice(0, 3000)
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
    });
    return result;
  } catch (e: any) {
    const msg = e?.data?.error || e?.message || String(e);
    console.error(JSON.stringify({
      level: "error",
      message: "Slack postReview failed",
      timestamp: new Date().toISOString(),
      error: msg,
      ticketId,
      draftId
    }));
    throw e;
  }
}

// Approve action
function registerHandlers(slack: AppType) {
  slack.action(
    "approve",
    async ({
      ack,
      body,
      client
    }: SlackActionMiddlewareArgs<BlockButtonAction> & AllMiddlewareArgs) => {
      await ack();

      const value = JSON.parse((body as any).actions[0].value);
      const { ticketId, draftId, draftText } = value;
      const userId = body.user.id;

      console.log(JSON.stringify({ level: "info", source: "bolt", action: "approve", ticketId, draftId }));
      // Store human review
      await createHumanReview({
        ticketId,
        draftId,
        decision: "approve",
        finalText: draftText,
        reviewerSlackId: userId
      });

      // Update message
      await client.chat.update({
        channel: (body as any).channel.id,
        ts: (body as any).message.ts,
        text: "Draft approved",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✅ *Approved* by <@${userId}>\n\nReply will be sent to customer.`
            }
          }
        ]
      });

      // TODO: trigger mailer to send
      console.log(`Approved: ticket=${ticketId}, draft=${draftId}`);
    }
  );

  // Edit action (opens modal)
  slack.action(
    "edit",
    async ({
      ack,
      body,
      client
    }: SlackActionMiddlewareArgs<BlockButtonAction> & AllMiddlewareArgs) => {
      await ack();

      const value = JSON.parse((body as any).actions[0].value);
      const { ticketId, draftId, draftText } = value;

      console.log(JSON.stringify({ level: "info", source: "bolt", action: "edit_open", ticketId, draftId }));
      await client.views.open({
        trigger_id: (body as any).trigger_id,
        view: {
          type: "modal",
          callback_id: "edit_modal",
          private_metadata: JSON.stringify({
            ticketId,
            draftId,
            channelId: (body as any).channel.id,
            messageTs: (body as any).message.ts
          }),
          title: {
            type: "plain_text",
            text: "Edit Draft"
          },
          submit: {
            type: "plain_text",
            text: "Send"
          },
          close: {
            type: "plain_text",
            text: "Cancel"
          },
          blocks: [
            {
              type: "input",
              block_id: "final_text_block",
              label: {
                type: "plain_text",
                text: "Final Reply"
              },
              element: {
                type: "plain_text_input",
                action_id: "final_text",
                multiline: true,
                initial_value: draftText
              }
            }
          ]
        }
      });
    }
  );

  // Modal submission
  slack.view(
    "edit_modal",
    async ({
      ack,
      body,
      view,
      client
    }: SlackViewMiddlewareArgs<ViewSubmitAction> & AllMiddlewareArgs) => {
      await ack();

      const metadata = JSON.parse(view.private_metadata);
      const { ticketId, draftId, channelId, messageTs } = metadata;
      const userId = body.user.id;

      const finalText = view.state.values.final_text_block.final_text.value || "";

      console.log(JSON.stringify({ level: "info", source: "bolt", action: "edit_submit", ticketId, draftId }));
      // Store human review
      await createHumanReview({
        ticketId,
        draftId,
        decision: "edit",
        finalText,
        reviewerSlackId: userId
      });

      // Update original message
      await client.chat.update({
        channel: channelId,
        ts: messageTs,
        text: "Draft edited and approved",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `✏️ *Edited* by <@${userId}>\n\nCustom reply will be sent.`
            }
          }
        ]
      });

      // TODO: trigger mailer to send edited version
      console.log(`Edited: ticket=${ticketId}, draft=${draftId}`);
    }
  );

  // Reject action
  slack.action(
    "reject",
    async ({
      ack,
      body,
      client
    }: SlackActionMiddlewareArgs<BlockButtonAction> & AllMiddlewareArgs) => {
      await ack();

      const value = JSON.parse((body as any).actions[0].value);
      const { ticketId, draftId } = value;
      const userId = body.user.id;

      console.log(JSON.stringify({ level: "info", source: "bolt", action: "reject", ticketId, draftId }));
      // Store human review
      await createHumanReview({
        ticketId,
        draftId,
        decision: "reject",
        finalText: "",
        reviewerSlackId: userId
      });

      // Update message
      await client.chat.update({
        channel: (body as any).channel.id,
        ts: (body as any).message.ts,
        text: "Draft rejected",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `❌ *Rejected* by <@${userId}>\n\nNo automated reply will be sent.`
            }
          }
        ]
      });

      console.log(`Rejected: ticket=${ticketId}, draft=${draftId}`);
    }
  );
}

export async function startSlackBot(port?: number): Promise<void> {
  const listenPort = port ?? (Number(process.env.PORT) || 3000);
  const slack = getApp();
  if (process.env.SLACK_USE_BOLT_LOCAL === "true") {
    registerHandlers(slack);
    console.log("Bolt local handlers registered (SLACK_USE_BOLT_LOCAL=true)");
  } else {
    console.log("Using serverless interactions handler; Bolt local handlers not registered (set SLACK_USE_BOLT_LOCAL=true to enable).");
  }
  await slack.start(listenPort);
  console.log(`⚡️ Slack bot running on port ${listenPort}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startSlackBot().catch(err => {
    console.error("Slack bot failed to start:", err);
    process.exit(1);
  });
}
