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

async function validateSlackToken(requestId?: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN not configured");
  
  try {
    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });
    
    const result = await res.json();
    if (!result.ok) {
      log("error", "Slack token validation failed", { requestId, error: result.error });
      throw new Error(`Invalid Slack token: ${result.error}`);
    }
    
    log("info", "Slack token validated", { 
      requestId, 
      botId: result.bot_id, 
      userId: result.user_id,
      team: result.team
    });
    
    return result;
  } catch (error: any) {
    log("error", "Slack token validation error", { requestId, error: error.message });
    throw error;
  }
}

async function slackApi(method: string, body: Record<string, unknown>, requestId?: string) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN not configured");

  const maxAttempts = 3;
  const baseDelayMs = 250;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // Increased to 10 seconds
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
        const errorDetails = {
          method,
          error: json.error,
          response_metadata: json.response_metadata,
          requestId
        };
        log("error", "Slack API error response", errorDetails);
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

interface EditModalViewParams {
  ticketId: string;
  draftId: string;
  channelId?: string;
  messageTs?: string;
  draftText: string;
}

export interface EditModalViewBuildResult {
  view: Record<string, unknown>;
  trimmedDraft: boolean;
  metadataLength: number;
}

type ApproveActionValue = {
  ticketId: string;
  draftId: string;
  draftText: string;
};

type RejectActionValue = {
  ticketId: string;
  draftId: string;
};

export function buildEditModalView(params: EditModalViewParams): EditModalViewBuildResult {
  const { ticketId, draftId, channelId, messageTs } = params;
  const draftText = params.draftText ?? "";

  const trimmedDraft = draftText.length > 3000;
  const initialValue = trimmedDraft ? draftText.slice(0, 3000) : draftText;

  const metadataPayload: Record<string, string> = {
    ticketId,
    draftId
  };
  if (channelId) metadataPayload.channelId = channelId;
  if (messageTs) metadataPayload.messageTs = messageTs;

  const privateMetadata = JSON.stringify(metadataPayload);

  return {
    view: {
      type: "modal",
      callback_id: "edit_modal",
      private_metadata: privateMetadata,
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
            initial_value: initialValue
          }
        }
      ]
    },
    trimmedDraft,
    metadataLength: privateMetadata.length
  };
}

function safeParseAction(
  action: { value?: unknown },
  requestId: string,
  actionId: "approve"
): ApproveActionValue | null;
function safeParseAction(
  action: { value?: unknown },
  requestId: string,
  actionId: "reject"
): RejectActionValue | null;
function safeParseAction(
  action: { value?: unknown },
  requestId: string,
  actionId: "approve" | "reject"
): ApproveActionValue | RejectActionValue | null {
  try {
    const payload = typeof action.value === "string" ? JSON.parse(action.value) : action.value;
    if (!payload || typeof payload !== "object") throw new Error("empty_payload");

    const ticketId = (payload as any).ticketId;
    const draftId = (payload as any).draftId;
    if (typeof ticketId !== "string" || typeof draftId !== "string") {
      throw new Error("missing_ticket_or_draft_id");
    }

    if (actionId === "approve") {
      const draftText = (payload as any).draftText;
      if (typeof draftText !== "string") throw new Error("missing_draft_text");
      return { ticketId, draftId, draftText };
    }

    return { ticketId, draftId };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    log("error", "Slack action payload parse failed", { requestId, actionId, error: errMsg });
    return null;
  }
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

  let responded = false;
  const respond = (body: Record<string, unknown>, status: number = 200) => {
    if (responded) return;
    responded = true;
    res.status(status).json(body);
  };

  const respondOk = () => respond({ ok: true });

  try {
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

      if (!actionId) {
        respondOk();
        log("warn", "Slack block action missing action_id", { requestId, channelId, messageTs, userId });
        return;
      }

      log("info", "Slack block action dispatched", {
        requestId,
        actionId,
        channelId,
        messageTs,
        userId
      });

      if (actionId === "approve") {
        respondOk();
        void (async () => {
          const parsed = safeParseAction(action, requestId, "approve");
          if (!parsed) return;
          const { ticketId, draftId, draftText } = parsed;
          try {
            log("info", "Slack approve handling started", { requestId, ticketId, draftId, userId });
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
        })();
        return;
      }

      if (actionId === "reject") {
        respondOk();
        void (async () => {
          const parsed = safeParseAction(action, requestId, "reject");
          if (!parsed) return;
          const { ticketId, draftId } = parsed;
          try {
            log("info", "Slack reject handling started", { requestId, ticketId, draftId, userId });
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
        })();
        return;
      }

      if (actionId === "edit") {
        respondOk();
        void (async () => {
          try {
            // Validate Slack token first
            await validateSlackToken(requestId);
            
            const { ticketId, draftId, draftText } = JSON.parse(action.value);
            log("info", "Slack edit modal opening", { requestId, ticketId, draftId, userId, triggerId });
            
            const { view, trimmedDraft, metadataLength } = buildEditModalView({
              ticketId,
              draftId,
              channelId,
              messageTs,
              draftText
            });

            if (trimmedDraft) {
              log("warn", "Draft text trimmed for modal", { requestId, ticketId, draftId, userId });
            }
            if (metadataLength > 2000) {
              log("warn", "Modal private metadata approaching Slack size limit", {
                requestId,
                ticketId,
                draftId,
                metadataLength
              });
            }

            // Validate trigger_id before using it
            if (!triggerId) {
              throw new Error("Missing trigger_id in block_actions payload");
            }
            
            log("info", "Attempting views.open", { 
              requestId, 
              ticketId, 
              draftId, 
              userId, 
              triggerId: triggerId.substring(0, 20) + "...",
              hasView: !!view,
              viewType: view?.type
            });

            // Use views.open with trigger_id
            const result = await slackApi(
              "views.open",
              {
                trigger_id: triggerId,
                view
              },
              requestId
            );
            
            log("info", "Slack edit modal opened successfully", { 
              ticketId, 
              draftId, 
              userId, 
              requestId,
              viewId: result?.view?.id,
              ok: result?.ok,
              responseKeys: Object.keys(result || {})
            });
          } catch (error: any) {
            const errMsg = error?.message || String(error);
            log("error", "Slack edit modal open failed", { requestId, userId, error: errMsg });
            
            if (channelId && messageTs) {
              await slackApi(
                "chat.postMessage",
                {
                  channel: channelId,
                  text: `Kunne ikke åpne redigeringsvinduet for <@${userId}> – prøv igjen om noen sekunder.`,
                  thread_ts: messageTs
                },
                requestId
              ).catch(() => {});
            }
          }
        })();
        return;
      }

      respondOk();
      log("warn", "Unhandled Slack block action", { requestId, actionId });
      return;
    }

    if (type === "view_submission" && payload.view?.callback_id === "edit_modal") {
      respondOk();
      const md = JSON.parse(payload.view.private_metadata || "{}");
      const finalText = payload.view?.state?.values?.final_text_block?.final_text?.value || "";
      const userId = payload.user?.id as string | undefined;

      log("info", "Slack view submission dispatched", {
        requestId,
        ticketId: md.ticketId,
        draftId: md.draftId,
        userId
      });

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

    respondOk();
    log("warn", "Unhandled Slack interaction", { type: payload.type, requestId });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    log("error", "Slack interaction error", {
      error: errMsg,
      type: payload?.type,
      actionId: payload?.actions?.[0]?.action_id,
      requestId: payload?.message?.ts || payload?.trigger_id || null
    });
    if (!responded) {
      respond({ ok: false, error: "internal_error" }, 500);
    }
  }
}
