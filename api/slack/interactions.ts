import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHumanReview } from "@agents/db";

export const config = { runtime: "nodejs", regions: ["iad1"] };

type LogLevel = "info" | "warn" | "error";

const log = (level: LogLevel, message: string, data: Record<string, unknown> = {}): void => {
  const payload = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...data });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
};

function parseSlackPayload(req: VercelRequest): any | null {
  try {
    if (typeof req.body === "string") {
      const ct = String(req.headers["content-type"] || "");
      if (ct.includes("application/x-www-form-urlencoded")) {
        const params = new URLSearchParams(req.body);
        const payload = params.get("payload");
        return payload ? JSON.parse(payload) : null;
      }
      return JSON.parse(req.body);
    }

    if (req.body && typeof req.body === "object") {
      if (typeof (req.body as any).payload === "string") {
        return JSON.parse((req.body as any).payload);
      }
      return req.body;
    }
  } catch (_e) {
    return null;
  }
  return null;
}

async function slackApi(method: string, body: Record<string, unknown>) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN not configured");
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method} failed: ${json.error || "unknown_error"}`);
  return json;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Slack expects a 200 within 3s
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const payload = parseSlackPayload(req);
  if (!payload) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  try {
    // Immediately ack; process asynchronously
    res.status(200).json({ ok: true });

    const type = payload.type as string;
    if (type === "block_actions") {
      const action = payload.actions?.[0];
      const actionId = action?.action_id as string | undefined;
      const channelId = payload.channel?.id as string | undefined;
      const messageTs = payload.message?.ts as string | undefined;
      const triggerId = payload.trigger_id as string | undefined;
      const userId = payload.user?.id as string | undefined;

      if (!actionId) return;

      if (actionId === "approve") {
        const { ticketId, draftId, draftText } = JSON.parse(action.value);
        await createHumanReview({
          ticketId,
          draftId,
          decision: "approve",
          finalText: draftText,
          reviewerSlackId: userId || "unknown"
        });

        if (channelId && messageTs) {
          await slackApi("chat.update", {
            channel: channelId,
            ts: messageTs,
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
        }
        log("info", "Slack approve handled", { ticketId, draftId, userId });
        return;
      }

      if (actionId === "reject") {
        const { ticketId, draftId } = JSON.parse(action.value);
        await createHumanReview({
          ticketId,
          draftId,
          decision: "reject",
          finalText: "",
          reviewerSlackId: userId || "unknown"
        });
        if (channelId && messageTs) {
          await slackApi("chat.update", {
            channel: channelId,
            ts: messageTs,
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
        }
        log("info", "Slack reject handled", { ticketId, draftId, userId });
        return;
      }

      if (actionId === "edit" && triggerId) {
        const { ticketId, draftId, draftText } = JSON.parse(action.value);
        await slackApi("views.open", {
          trigger_id: triggerId,
          view: {
            type: "modal",
            callback_id: "edit_modal",
            private_metadata: JSON.stringify({
              ticketId,
              draftId,
              channelId,
              messageTs
            }),
            title: { type: "plain_text", text: "Edit Draft" },
            submit: { type: "plain_text", text: "Send" },
            close: { type: "plain_text", text: "Cancel" },
            blocks: [
              {
                type: "input",
                block_id: "final_text_block",
                label: { type: "plain_text", text: "Final Reply" },
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
        log("info", "Slack edit modal opened", { ticketId, draftId, userId });
        return;
      }
    }

    if (type === "view_submission" && payload.view?.callback_id === "edit_modal") {
      const md = JSON.parse(payload.view.private_metadata || "{}");
      const finalText = payload.view?.state?.values?.final_text_block?.final_text?.value || "";
      const userId = payload.user?.id as string | undefined;

      await createHumanReview({
        ticketId: md.ticketId,
        draftId: md.draftId,
        decision: "edit",
        finalText,
        reviewerSlackId: userId || "unknown"
      });

      if (md.channelId && md.messageTs) {
        await slackApi("chat.update", {
          channel: md.channelId,
          ts: md.messageTs,
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
      }
      log("info", "Slack edit submission handled", {
        ticketId: md.ticketId,
        draftId: md.draftId,
        userId
      });
      return;
    }

    log("warn", "Unhandled Slack interaction", { type: payload.type });
  } catch (error: any) {
    log("error", "Slack interaction error", { error: error?.message || String(error) });
  }
}
