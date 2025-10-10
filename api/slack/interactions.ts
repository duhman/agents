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

function isTransientDbError(message: string): boolean {
  return /CONNECT_TIMEOUT|ETIMEDOUT|ECONNRESET|ECONNABORTED|EAI_AGAIN|ENOTFOUND|Too many connections|connection timed out/i.test(
    message || ""
  );
}

async function withDbRetry<T>(op: () => Promise<T>, ctx: { requestId: string; actionId?: string }) {
  const maxAttempts = 3;
  const baseDelayMs = 200;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await op();
    } catch (e: any) {
      const msg = e?.message || String(e);
      const transient = isTransientDbError(msg);
      if (transient && attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        log("warn", "DB transient error, retrying", { requestId: ctx.requestId, actionId: ctx.actionId, attempt, error: msg });
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      log("error", "DB operation failed", { requestId: ctx.requestId, actionId: ctx.actionId, error: msg });
      throw e;
    }
  }
  throw new Error("DB retries exhausted");
}

async function slackApi(method: string, body: Record<string, unknown>, requestId?: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN not configured");

  const maxAttempts = 3;
  const baseDelayMs = 250;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`https://slack.com/api/${method}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);

      let text: string | undefined;
      let json: any | undefined;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        json = await res.json();
      } else {
        text = await res.text();
      }

      if (!res.ok) {
        const snippet = (text || JSON.stringify(json || {})).slice(0, 300);
        const err = new Error(`Slack HTTP ${res.status} for ${method}: ${snippet}${requestId ? ` (requestId=${requestId})` : ""}`);
        if (res.status >= 500 && attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
          continue;
        }
        throw err;
      }

      if (json && json.ok !== true) {
        throw new Error(`${method} failed: ${json.error || "unknown_error"}${requestId ? ` (requestId=${requestId})` : ""}`);
      }

      return json ?? { ok: true, raw: text };
    } catch (e: any) {
      clearTimeout(timeout);
      const isAbort = e?.name === "AbortError";
      const message = isAbort ? "timeout" : e?.message || String(e);
      const canRetry =
        isAbort || /fetch failed|ECONNRESET|ENOTFOUND|EAI_AGAIN|TLS|ETIMEDOUT/i.test(message);
      if (canRetry && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
        continue;
      }
      throw new Error(`slackApi(${method}) error: ${message}${requestId ? ` (requestId=${requestId})` : ""}`);
    }
  }

  throw new Error(`slackApi(${method}) exhausted retries${requestId ? ` (requestId=${requestId})` : ""}`);
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

    log("info", "Slack interaction received (serverless)", {
      raw_type: payload?.type,
      has_actions: Array.isArray(payload?.actions),
      has_view: !!payload?.view
    });

  try {
    res.status(200).json({ ok: true });
 
    const type = payload.type as string;
    const requestId =
      payload?.message?.ts ||
      payload?.container?.message_ts ||
      payload?.trigger_id ||
      String(Date.now());
 
    log("info", "Slack interaction acked", { type, requestId });

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
        try {
          await withDbRetry(
            () =>
              createHumanReview({
                ticketId,
                draftId,
                decision: "approve",
                finalText: draftText,
                reviewerSlackId: userId || "unknown"
              }),
            { requestId, actionId }
          );

          if (channelId && messageTs) {
            await slackApi(
              "chat.update",
              {
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
              },
              requestId
            );
          }
          log("info", "Slack approve handled", { ticketId, draftId, userId, requestId });
        } catch (error: any) {
          const errMsg = error?.message || String(error);
          log("error", "Slack approve failed", { requestId, ticketId, draftId, userId, error: errMsg });
          if (channelId && messageTs) {
            await slackApi(
              "chat.postMessage",
              {
                channel: channelId,
                text: `Kunne ikke lagre godkjenningen for <@${userId}> – prøv igjen om noen sekunder.`,
                thread_ts: messageTs
              },
              requestId
            ).catch(() => {});
          }
        }
        return;
      }

      if (actionId === "reject") {
        const { ticketId, draftId } = JSON.parse(action.value);
        try {
          await withDbRetry(
            () =>
              createHumanReview({
                ticketId,
                draftId,
                decision: "reject",
                finalText: "",
                reviewerSlackId: userId || "unknown"
              }),
            { requestId, actionId }
          );
          if (channelId && messageTs) {
            await slackApi(
              "chat.update",
              {
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
              },
              requestId
            );
          }
          log("info", "Slack reject handled", { ticketId, draftId, userId, requestId });
        } catch (error: any) {
          const errMsg = error?.message || String(error);
          log("error", "Slack reject failed", { requestId, ticketId, draftId, userId, error: errMsg });
          if (channelId && messageTs) {
            await slackApi(
              "chat.postMessage",
              {
                channel: channelId,
                text: `Kunne ikke lagre avslaget for <@${userId}> – prøv igjen om noen sekunder.`,
                thread_ts: messageTs
              },
              requestId
            ).catch(() => {});
          }
        }
        return;
      }

      if (actionId === "edit" && triggerId) {
        const { ticketId, draftId, draftText } = JSON.parse(action.value);
        (async () => {
          try {
            await slackApi(
              "views.open",
              {
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
              },
              requestId
            );
            log("info", "Slack edit modal opened", { ticketId, draftId, userId, requestId });
          } catch (e: any) {
            const msg = e?.message || String(e);
            if (/expired_trigger_id|exchanged_trigger_id/i.test(msg)) {
              log("warn", "views.open trigger_id not usable", { requestId, ticketId, draftId, reason: msg });
            } else {
              log("error", "Slack views.open failed", { requestId, ticketId, draftId, error: msg });
            }
          }
        })();
        return;
      }
    }

    if (type === "view_submission" && payload.view?.callback_id === "edit_modal") {
      const md = JSON.parse(payload.view.private_metadata || "{}");
      const finalText = payload.view?.state?.values?.final_text_block?.final_text?.value || "";
      const userId = payload.user?.id as string | undefined;

      try {
        await withDbRetry(
          () =>
            createHumanReview({
              ticketId: md.ticketId,
              draftId: md.draftId,
              decision: "edit",
              finalText,
              reviewerSlackId: userId || "unknown"
            }),
          { requestId, actionId: "edit" }
        );

        if (md.channelId && md.messageTs) {
          await slackApi(
            "chat.update",
            {
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
            },
            requestId
          );
        }
        log("info", "Slack edit submission handled", {
          ticketId: md.ticketId,
          draftId: md.draftId,
          userId,
          requestId
        });
      } catch (error: any) {
        const errMsg = error?.message || String(error);
        log("error", "Slack edit submission failed", {
          requestId,
          ticketId: md.ticketId,
          draftId: md.draftId,
          userId,
          error: errMsg
        });
        if (md.channelId && md.messageTs) {
          await slackApi(
            "chat.postMessage",
            {
              channel: md.channelId,
              text: `Kunne ikke lagre redigeringen for <@${userId}> – prøv igjen om noen sekunder.`,
              thread_ts: md.messageTs
            },
            requestId
          ).catch(() => {});
        }
      }
      return;
    }

    log("warn", "Unhandled Slack interaction", { type: payload.type, requestId });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    log("error", "Slack interaction error", {
      error: errMsg,
      type: payload?.type,
      actionId: payload?.actions?.[0]?.action_id,
      requestId: payload?.message?.ts || payload?.trigger_id || null
    });
  }
}
