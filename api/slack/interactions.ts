import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHumanReview, resetDbClient, getDraftById } from "@agents/db";
import { createHmac, timingSafeEqual } from "crypto";

export const config = { runtime: "nodejs", regions: ["fra1"] };

type LogLevel = "info" | "warn" | "error";

const RAW_BODY_SYMBOL = Symbol.for("agents.slack.rawBody");

const log = (level: LogLevel, message: string, data: Record<string, unknown> = {}): void => {
  const payload = JSON.stringify({ level, message, timestamp: new Date().toISOString(), ...data });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const existing = (req as any)[RAW_BODY_SYMBOL];
  if (existing) {
    return existing;
  }

  if (typeof req.body === "string") {
    const buffer = Buffer.from(req.body);
    (req as any)[RAW_BODY_SYMBOL] = buffer;
    return buffer;
  }

  if (req.body && Buffer.isBuffer(req.body)) {
    const buffer = req.body as Buffer;
    (req as any)[RAW_BODY_SYMBOL] = buffer;
    return buffer;
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const buffer = Buffer.concat(chunks);
  (req as any)[RAW_BODY_SYMBOL] = buffer;
  return buffer;
}

/**
 * Verify Slack request signature to prevent unauthorized requests
 * https://api.slack.com/authentication/verifying-requests-from-slack
 */
function verifySlackSignature(req: VercelRequest, requestBody: string): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    log("error", "SLACK_SIGNING_SECRET not configured - signature verification disabled");
    return true; // Allow in development, but log warning
  }

  const slackSignature = req.headers["x-slack-signature"] as string | undefined;
  const slackTimestamp = req.headers["x-slack-request-timestamp"] as string | undefined;

  if (!slackSignature || !slackTimestamp) {
    log("error", "Missing Slack signature headers", {
      hasSignature: !!slackSignature,
      hasTimestamp: !!slackTimestamp
    });
    return false;
  }

  // Verify timestamp is recent (within 5 minutes) to prevent replay attacks
  const currentTime = Math.floor(Date.now() / 1000);
  const requestTime = parseInt(slackTimestamp, 10);

  if (Math.abs(currentTime - requestTime) > 60 * 5) {
    log("error", "Slack request timestamp too old", {
      currentTime,
      requestTime,
      diff: currentTime - requestTime
    });
    return false;
  }

  // Compute signature
  const sigBasestring = `v0:${slackTimestamp}:${requestBody}`;
  const computedSignature = `v0=${createHmac("sha256", signingSecret)
    .update(sigBasestring, "utf8")
    .digest("hex")}`;

  // Use timing-safe comparison to prevent timing attacks
  try {
    const signatureBuffer = Buffer.from(slackSignature);
    const computedBuffer = Buffer.from(computedSignature);

    if (signatureBuffer.length !== computedBuffer.length) {
      log("error", "Slack signature length mismatch");
      return false;
    }

    const isValid = timingSafeEqual(signatureBuffer, computedBuffer);

    if (!isValid) {
      log("error", "Slack signature verification failed", {
        receivedSignature: slackSignature.slice(0, 20) + "...",
        computedSignature: computedSignature.slice(0, 20) + "..."
      });
    }

    return isValid;
  } catch (error: any) {
    log("error", "Error during signature verification", { error: error?.message || String(error) });
    return false;
  }
}

const TOKEN_VALIDATION_TTL_MS = 5 * 60 * 1000;
let lastSuccessfulTokenValidation = 0;
let lastTokenValidationResult: boolean | null = null;
let tokenValidationInFlight: Promise<boolean> | null = null;

function parseSlackPayload(rawBody: string, contentTypeHeader: string | undefined): any | null {
  if (!rawBody) {
    return null;
  }

  const contentType = (contentTypeHeader || "").toLowerCase();

  try {
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const params = new URLSearchParams(rawBody);
      const payload = params.get("payload");
      if (payload) {
        return JSON.parse(payload);
      }

      const result: Record<string, string> = {};
      params.forEach((value, key) => {
        result[key] = value;
      });
      return result;
    }

    return JSON.parse(rawBody);
  } catch (_error) {
    return null;
  }
}

function isTransientDbError(message: string): boolean {
  return /CONNECT_TIMEOUT|ETIMEDOUT|ECONNRESET|ECONNABORTED|EAI_AGAIN|ENOTFOUND|Too many connections|connection timed out|Authentication timed out/i.test(
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
      const authTimeout = /Authentication timed out/i.test(msg);
      const transient = isTransientDbError(msg) || authTimeout;

      if (transient) {
        const reason = authTimeout ? "authentication_timeout" : "transient_error";
        log("warn", "DB transient error encountered, resetting client", {
          requestId: ctx.requestId,
          actionId: ctx.actionId,
          attempt,
          error: msg,
          authTimeout,
          willRetry: attempt < maxAttempts
        });
        await resetDbClient(`${reason}_attempt_${attempt}`);
      }

      if (transient && attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      log("error", "DB operation failed", {
        requestId: ctx.requestId,
        actionId: ctx.actionId,
        error: msg
      });
      throw e;
    }
  }
  throw new Error("DB retries exhausted");
}

async function validateSlackToken(requestId?: string): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    log("error", "Slack token validation failed", {
      requestId,
      error: "SLACK_BOT_TOKEN not configured"
    });
    return false;
  }

  const now = Date.now();

  if (
    lastTokenValidationResult === true &&
    now - lastSuccessfulTokenValidation < TOKEN_VALIDATION_TTL_MS
  ) {
    log("info", "Slack token validation skipped (cached success)", { requestId });
    return true;
  }

  if (tokenValidationInFlight) {
    log("info", "Slack token validation reusing in-flight check", { requestId });
    return tokenValidationInFlight;
  }

  try {
    tokenValidationInFlight = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch("https://slack.com/api/auth.test", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          signal: controller.signal
        });

        clearTimeout(timeout);

        const result = await res.json();
        if (!res.ok || result.ok !== true) {
          const error = result?.error || `status_${res.status}`;
          log("error", "Slack token validation failed", { requestId, error });
          lastTokenValidationResult = false;
          return false;
        }

        log("info", "Slack token validated", {
          requestId,
          botId: result.bot_id,
          userId: result.user_id,
          team: result.team
        });

        lastSuccessfulTokenValidation = Date.now();
        lastTokenValidationResult = true;
        return true;
      } catch (error: any) {
        log("error", "Slack token validation error", {
          requestId,
          error: error?.message || String(error)
        });
        lastTokenValidationResult = false;
        return false;
      } finally {
        clearTimeout(timeout);
      }
    })();

    return await tokenValidationInFlight;
  } finally {
    tokenValidationInFlight = null;
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
      log("info", "Slack API request started", { method, attempt, requestId });
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
        const err = new Error(
          `Slack HTTP ${res.status} for ${method}: ${snippet}${requestId ? ` (requestId=${requestId})` : ""}`
        );
        if (res.status >= 500 && attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
          continue;
        }
        throw err;
      }

      if (json && json.ok !== true) {
        const error = json.error || "unknown_error";

        // Handle specific Slack API error codes
        if (error === "expired_trigger_id" || error === "trigger_expired") {
          log("error", "Slack modal trigger expired (>3s)", {
            method,
            attempt,
            requestId,
            error,
            remedy: "Ensure views.open is called within 3 seconds of receiving trigger_id"
          });
          throw new Error(
            `Trigger expired: ${error}. Modal must open within 3 seconds${requestId ? ` (requestId=${requestId})` : ""}`
          );
        }

        if (error === "not_in_channel") {
          log("error", "Slack error: Bot not in channel", {
            method,
            attempt,
            requestId,
            error,
            remedy: "Invite bot to channel with /invite @bot"
          });
          throw new Error(
            `Bot not in channel. Run /invite @bot${requestId ? ` (requestId=${requestId})` : ""}`
          );
        }

        if (error === "channel_not_found") {
          log("error", "Slack error: Channel not found or bot lacks access", {
            method,
            attempt,
            requestId,
            error
          });
          throw new Error(
            `Channel not found or bot lacks access${requestId ? ` (requestId=${requestId})` : ""}`
          );
        }

        if (error === "invalid_auth" || error === "token_expired" || error === "token_revoked") {
          log("error", "Slack authentication failed", {
            method,
            attempt,
            requestId,
            error,
            remedy: "Check SLACK_BOT_TOKEN validity"
          });
          throw new Error(
            `Authentication failed: ${error}${requestId ? ` (requestId=${requestId})` : ""}`
          );
        }

        if (error === "missing_scope") {
          log("error", "Slack error: Missing required OAuth scope", {
            method,
            attempt,
            requestId,
            error,
            needed: json.needed,
            remedy: "Add required scopes and reinstall app"
          });
          throw new Error(
            `Missing scope: ${json.needed || "unknown"}${requestId ? ` (requestId=${requestId})` : ""}`
          );
        }

        if (error === "rate_limited" || error === "ratelimited") {
          const retryAfter = json.retry_after || 60;
          log("error", "Slack rate limited", {
            method,
            attempt,
            requestId,
            error,
            retryAfter
          });
          throw new Error(
            `Rate limited. Retry after ${retryAfter}s${requestId ? ` (requestId=${requestId})` : ""}`
          );
        }

        if (error === "view_too_large") {
          log("error", "Slack modal view too large", {
            method,
            attempt,
            requestId,
            error,
            remedy: "Reduce modal content size (blocks, metadata, or text fields)"
          });
          throw new Error(
            `Modal view too large. Reduce content size${requestId ? ` (requestId=${requestId})` : ""}`
          );
        }

        // Generic error fallback
        log("error", "Slack API error response", {
          method,
          attempt,
          requestId,
          error,
          response: json
        });
        const errorDetails = {
          method,
          error,
          response_metadata: json.response_metadata,
          requestId
        };
        log("error", "Slack API error response (details)", errorDetails);
        throw new Error(
          `${method} failed: ${error}${requestId ? ` (requestId=${requestId})` : ""}`
        );
      }

      log("info", "Slack API request succeeded", {
        method,
        attempt,
        requestId,
        responseKeys: json ? Object.keys(json) : [],
        ok: json?.ok
      });

      return json ?? { ok: true, raw: text };
    } catch (e: any) {
      clearTimeout(timeout);
      const isAbort = e?.name === "AbortError";
      const message = isAbort ? "timeout" : e?.message || String(e);
      const canRetry =
        isAbort || /fetch failed|ECONNRESET|ENOTFOUND|EAI_AGAIN|TLS|ETIMEDOUT/i.test(message);
      log(canRetry && attempt < maxAttempts ? "warn" : "error", "Slack API request failed", {
        method,
        attempt,
        requestId,
        error: message,
        abort: isAbort,
        willRetry: canRetry && attempt < maxAttempts
      });
      if (canRetry && attempt < maxAttempts) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
        continue;
      }
      throw new Error(
        `slackApi(${method}) error: ${message}${requestId ? ` (requestId=${requestId})` : ""}`
      );
    }
  }

  throw new Error(
    `slackApi(${method}) exhausted retries${requestId ? ` (requestId=${requestId})` : ""}`
  );
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
};

type RejectActionValue = {
  ticketId: string;
  draftId: string;
};

const MAX_REJECTION_REASON_LENGTH = 2000;

const escapeMrkdwn = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

interface RejectModalViewParams {
  ticketId: string;
  draftId: string;
  channelId?: string;
  messageTs?: string;
}

export function buildRejectModalView(params: RejectModalViewParams): {
  view: Record<string, unknown>;
  metadataLength: number;
} {
  const { ticketId, draftId, channelId, messageTs } = params;
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
      callback_id: "reject_modal",
      private_metadata: privateMetadata,
      title: { type: "plain_text", text: "Reject Draft" },
      submit: { type: "plain_text", text: "Submit" },
      close: { type: "plain_text", text: "Cancel" },
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Help us improve future replies by sharing why this draft should be rejected."
          }
        },
        {
          type: "input",
          block_id: "rejection_reason_block",
          element: {
            type: "plain_text_input",
            action_id: "rejection_reason",
            multiline: true,
            max_length: MAX_REJECTION_REASON_LENGTH,
            focus_on_load: true
          },
          label: { type: "plain_text", text: "Rejection Reason" }
        }
      ]
    },
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

  const rawBodyBuffer = await getRawBody(req);
  const rawBody = rawBodyBuffer.toString("utf8");

  // Verify Slack signature to prevent unauthorized requests
  if (!verifySlackSignature(req, rawBody)) {
    log("error", "Slack signature verification failed - rejecting request");
    res.status(401).json({ error: "invalid_signature" });
    return;
  }

  const payload = parseSlackPayload(rawBody, req.headers["content-type"] as string | undefined);
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

  const respondOk = () => respond({});

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
        log("warn", "Slack block action missing action_id", {
          requestId,
          channelId,
          messageTs,
          userId
        });
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
          const { ticketId, draftId } = parsed;
          try {
            const draft = await withDbRetry(() => getDraftById(draftId), { requestId, actionId });

            if (!draft || typeof draft.draftText !== "string") {
              log("error", "Slack approve failed - draft not found", {
                requestId,
                ticketId,
                draftId,
                userId
              });
              if (channelId && messageTs) {
                await slackApi(
                  "chat.postMessage",
                  {
                    channel: channelId,
                    text: `Kunne ikke finne utkastet for <@${userId}> – prøv igjen om noen sekunder.`,
                    thread_ts: messageTs
                  },
                  requestId
                ).catch(() => {});
              }
              return;
            }

            log("info", "Slack approve handling started", { requestId, ticketId, draftId, userId });
            await withDbRetry(
              () =>
                createHumanReview({
                  ticketId,
                  draftId,
                  decision: "approve",
                  finalText: draft.draftText,
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
            log("error", "Slack approve failed", {
              requestId,
              ticketId,
              draftId,
              userId,
              error: errMsg
            });
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
            // Provide immediate visual feedback while the modal is opening
            if (channelId && messageTs) {
              await slackApi(
                "chat.update",
                {
                  channel: channelId,
                  ts: messageTs,
                  text: "Awaiting rejection reason",
                  blocks: [
                    {
                      type: "section",
                      text: {
                        type: "mrkdwn",
                        text: `❌ *Rejecting* – waiting for <@${userId}> to provide a reason.`
                      }
                    }
                  ]
                },
                requestId
              ).catch((error: any) => {
                log("warn", "Slack reject pre-update failed", {
                  requestId,
                  ticketId,
                  draftId,
                  channelId,
                  messageTs,
                  error: error?.message || String(error)
                });
              });
            }

            // Start token validation but don't await - run in background
            void validateSlackToken(requestId).catch((error: any) => {
              log("warn", "Background token validation failed", {
                requestId,
                error: error?.message || String(error)
              });
            });

            log("info", "Slack reject modal opening", {
              requestId,
              ticketId,
              draftId,
              userId,
              triggerId
            });

            const { view, metadataLength } = buildRejectModalView({
              ticketId,
              draftId,
              channelId,
              messageTs
            });

            if (metadataLength > 2000) {
              log("warn", "Reject modal metadata approaching size limit", {
                requestId,
                ticketId,
                draftId,
                metadataLength
              });
            }

            if (!triggerId) {
              throw new Error("Missing trigger_id in block_actions payload");
            }

            const result = await slackApi(
              "views.open",
              {
                trigger_id: triggerId,
                view
              },
              requestId
            );

            log("info", "Slack reject modal opened successfully", {
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
            log("error", "Slack reject modal open failed", {
              requestId,
              ticketId,
              draftId,
              userId,
              error: errMsg
            });

            if (channelId && messageTs) {
              await slackApi(
                "chat.postMessage",
                {
                  channel: channelId,
                  text: `Kunne ikke åpne avslagsvinduet for <@${userId}> – prøv igjen om noen sekunder.`,
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
        try {
          const parsed = safeParseAction(action, requestId, "approve");
          if (!parsed) {
            respondOk();
            return;
          }

          const { ticketId, draftId } = parsed;
          const draft = await withDbRetry(() => getDraftById(draftId), {
            requestId,
            actionId: "edit"
          });

          if (!draft || typeof draft.draftText !== "string" || !draft.draftText) {
            log("error", "Slack edit modal failed - draft not found", {
              requestId,
              ticketId,
              draftId,
              userId
            });
            respond({ ok: false, error: "draft_not_found" }, 200);
            if (channelId && messageTs) {
              await slackApi(
                "chat.postMessage",
                {
                  channel: channelId,
                  text: `Kunne ikke finne utkastet for <@${userId}> – prøv igjen om noen sekunder.`,
                  thread_ts: messageTs
                },
                requestId
              ).catch(() => {});
            }
            return;
          }

          // Start token validation but don't await - run in background
          // This optimizes latency while ensuring we open the modal within 3s window
          void validateSlackToken(requestId).catch((error: any) => {
            log("warn", "Background token validation failed", {
              requestId,
              error: error?.message || String(error)
            });
          });

          log("info", "Slack edit modal opening", {
            requestId,
            ticketId,
            draftId,
            userId,
            triggerId
          });

          const { view, trimmedDraft, metadataLength } = buildEditModalView({
            ticketId,
            draftId,
            channelId,
            messageTs,
            draftText: draft.draftText
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

          // IMPORTANT: Only respond after views.open succeeds
          // Responding first would invalidate the trigger_id and prevent modal from opening
          respondOk();
        } catch (error: any) {
          const errMsg = error?.message || String(error);
          log("error", "Slack edit modal open failed", { requestId, userId, error: errMsg });

          respond({ ok: false, error: "modal_open_failed" }, 200);

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

    if (type === "view_submission" && payload.view?.callback_id === "reject_modal") {
      const requestId = payload?.view?.id || payload?.trigger_id || String(Date.now());

      let metadata: Record<string, string> = {};
      try {
        metadata = JSON.parse(payload.view.private_metadata || "{}");
      } catch {
        metadata = {};
      }

      const userId = payload.user?.id as string | undefined;

      if (typeof metadata.ticketId !== "string" || typeof metadata.draftId !== "string") {
        log("error", "Slack reject submission missing identifiers", {
          requestId,
          metadataKeys: Object.keys(metadata || {})
        });
        respond({
          response_action: "errors",
          errors: {
            rejection_reason_block: "Kunne ikke finne utkastet. Lukk vinduet og prøv igjen."
          }
        });
        return;
      }

      const rawReason =
        payload.view?.state?.values?.rejection_reason_block?.rejection_reason?.value ?? "";
      const reason = (rawReason || "").trim();

      if (!reason) {
        respond({
          response_action: "errors",
          errors: {
            rejection_reason_block: "Please share a short reason so we can improve future drafts."
          }
        });
        return;
      }

      const trimmedReason =
        reason.length > MAX_REJECTION_REASON_LENGTH
          ? reason.slice(0, MAX_REJECTION_REASON_LENGTH)
          : reason;

      respondOk();

      log("info", "Slack reject submission dispatched", {
        requestId,
        ticketId: metadata.ticketId,
        draftId: metadata.draftId,
        userId,
        reasonLength: trimmedReason.length
      });

      try {
        await withDbRetry(
          () =>
            createHumanReview({
              ticketId: metadata.ticketId,
              draftId: metadata.draftId,
              decision: "reject",
              finalText: trimmedReason,
              reviewerSlackId: userId || "unknown"
            }),
          { requestId, actionId: "reject" }
        );

        if (metadata.channelId && metadata.messageTs) {
          const safeReason = escapeMrkdwn(trimmedReason);
          const quotedReason = safeReason.replace(/\n/g, "\n>");
          const fallbackReason = trimmedReason.replace(/\s+/g, " ").slice(0, 120);
          await slackApi(
            "chat.update",
            {
              channel: metadata.channelId,
              ts: metadata.messageTs,
              text: `Draft rejected: ${fallbackReason}`,
              blocks: [
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `❌ *Rejected* by <@${userId}> – no automated reply will be sent.`
                  }
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*Reason provided:*\n>${quotedReason}`
                  }
                }
              ]
            },
            requestId
          );
        }

        log("info", "Slack reject submission handled", {
          ticketId: metadata.ticketId,
          draftId: metadata.draftId,
          userId,
          requestId
        });
      } catch (error: any) {
        const errMsg = error?.message || String(error);
        log("error", "Slack reject submission failed", {
          requestId,
          ticketId: metadata.ticketId,
          draftId: metadata.draftId,
          userId,
          error: errMsg
        });

        if (metadata.channelId && metadata.messageTs) {
          await slackApi(
            "chat.postMessage",
            {
              channel: metadata.channelId,
              text: `Kunne ikke lagre avslaget med begrunnelse for <@${userId}> – prøv igjen om noen sekunder.`,
              thread_ts: metadata.messageTs
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
