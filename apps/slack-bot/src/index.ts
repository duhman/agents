import "dotenv/config";
import { envSchema } from "@agents/core";
import {
  createSlackRetryQueueItem,
  getSlackRetryQueueItemsToProcess,
  updateSlackRetryQueueItem,
  deleteSlackRetryQueueItem,
  getSlackRetryQueueStats,
  claimSlackRetryQueueItem
} from "@agents/db";

const SUBJECT_MAX_LENGTH = 250;
const BODY_BLOCK_MAX_LENGTH = 2900;
const DRAFT_BLOCK_MAX_LENGTH = 2900;
export const DEFAULT_RETRY_DELAY_MS = 5 * 60 * 1000;

export function computeBackoffMs(retryCount: number): number {
  return DEFAULT_RETRY_DELAY_MS * Math.pow(2, Math.max(0, retryCount));
}

/**
 * Escape special markdown characters to prevent formatting issues in Slack
 * https://api.slack.com/reference/surfaces/formatting#escaping
 */
function escapeMrkdwn(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function sanitizeForCodeBlock(text: string): string {
  return text.replace(/```/g, "`\u200b`\u200b`");
}

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
  hubspotTicketUrl?: string;
}

interface SlackHealthCheck {
  reachable: boolean;
  responseTime: number;
  error?: string;
  statusCode?: number;
  timestamp: number;
}

export interface PostReviewOptions {
  onRateLimited?: (delaySeconds: number) => Promise<void>;
  onSoftFailure?: (error: string) => Promise<void>;
}

export interface PostReviewResult {
  ok: boolean;
  error?: string;
  retryAfterSeconds?: number;
}

interface SlackRetryQueueItem {
  id: string;
  ticketId: string;
  draftId: string;
  channel: string;
  originalEmail: string;
  originalEmailSubject: string | null;
  originalEmailBody: string | null;
  draftText: string;
  confidence: number | string | { toString(): string };
  extraction: unknown;
  hubspotTicketUrl: string | null;
  retryCount: number | string;
  nextRetryAt: Date;
  lastError: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface RetryProcessorDependencies {
  maxRetries: number;
  defaultRetryDelayMs: number;
  computeBackoffMs: (retryCount: number) => number;
  getItemsToProcess: (maxRetries: number) => Promise<SlackRetryQueueItem[]>;
  claimItem: (id: string) => Promise<SlackRetryQueueItem | null>;
  updateItem: (
    id: string,
    data: {
      retryCount?: string;
      nextRetryAt?: Date;
      lastError?: string;
      status?: string;
    }
  ) => Promise<SlackRetryQueueItem>;
  postReview: (params: PostReviewParams, options: PostReviewOptions) => Promise<PostReviewResult>;
}

async function testSlackConnectivity(token: string): Promise<SlackHealthCheck> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch("https://slack.com/api/auth.test", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;
    const result = await res.json();

    return {
      reachable: result.ok === true,
      responseTime,
      statusCode: res.status,
      timestamp: Date.now(),
      error: result.ok ? undefined : result.error
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      reachable: false,
      responseTime,
      timestamp: Date.now(),
      error: error?.message || String(error)
    };
  }
}

// Database-backed retry queue for production reliability
async function queueSlackRetry(
  params: PostReviewParams,
  options: { nextRetryAt?: Date; reason?: string; retryCount?: number } = {}
): Promise<void> {
  try {
    const nextRetryAt = options.nextRetryAt ?? new Date(Date.now() + DEFAULT_RETRY_DELAY_MS);
    const retryCount = options.retryCount ?? 0;

    await createSlackRetryQueueItem({
      ticketId: params.ticketId,
      draftId: params.draftId,
      channel: params.channel,
      originalEmail: params.originalEmail,
      originalEmailSubject: params.originalEmailSubject,
      originalEmailBody: params.originalEmailBody,
      draftText: params.draftText,
      confidence: params.confidence.toString(),
      extraction: params.extraction,
      hubspotTicketUrl: params.hubspotTicketUrl,
      retryCount: retryCount.toString(),
      nextRetryAt
    });

    console.log(
      JSON.stringify({
        level: "info",
        message: "Queued Slack post for retry in database",
        timestamp: new Date().toISOString(),
        ticketId: params.ticketId,
        draftId: params.draftId,
        retryCount,
        reason: options.reason || "automatic_retry",
        nextRetryAt: nextRetryAt.toISOString()
      })
    );
  } catch (error: any) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Failed to queue Slack retry to database",
        timestamp: new Date().toISOString(),
        ticketId: params.ticketId,
        draftId: params.draftId,
        error: error?.message || String(error)
      })
    );
  }
}

export function createSlackRetryProcessor(deps: RetryProcessorDependencies) {
  return async function processRetryQueue(): Promise<void> {
    try {
      const itemsToRetry = await deps.getItemsToProcess(deps.maxRetries);

      console.log(
        JSON.stringify({
          level: "info",
          message: "Processing Slack retry queue from database",
          timestamp: new Date().toISOString(),
          itemCount: itemsToRetry.length
        })
      );

      for (const pendingItem of itemsToRetry) {
        const item = await deps.claimItem(pendingItem.id);
        if (!item) {
          continue;
        }

        const retryCount = parseInt(item.retryCount.toString());

        console.log(
          JSON.stringify({
            level: "info",
            message: "Processing Slack retry queue item",
            timestamp: new Date().toISOString(),
            ticketId: item.ticketId,
            draftId: item.draftId,
            retryCount
          })
        );

        const params: PostReviewParams = {
          ticketId: item.ticketId,
          draftId: item.draftId,
          originalEmail: item.originalEmail,
          originalEmailSubject: item.originalEmailSubject || undefined,
          originalEmailBody: item.originalEmailBody || undefined,
          draftText: item.draftText,
          confidence: parseFloat(item.confidence.toString()),
          extraction: item.extraction as Record<string, any>,
          channel: item.channel,
          hubspotTicketUrl: item.hubspotTicketUrl || undefined
        };

        const scheduleRetry = async (errorMessage: string, delayMs: number) => {
          const newRetryCount = retryCount + 1;
          if (newRetryCount >= deps.maxRetries) {
            await deps.updateItem(item.id, {
              status: "failed",
              retryCount: newRetryCount.toString(),
              lastError: errorMessage
            });

            console.error(
              JSON.stringify({
                level: "error",
                message: "Slack retry exhausted - marked as failed",
                timestamp: new Date().toISOString(),
                ticketId: item.ticketId,
                draftId: item.draftId,
                finalRetryCount: newRetryCount,
                error: errorMessage
              })
            );
          } else {
            const nextRetryAt = new Date(Date.now() + delayMs);
            await deps.updateItem(item.id, {
              retryCount: newRetryCount.toString(),
              nextRetryAt,
              status: "pending",
              lastError: errorMessage
            });

            console.log(
              JSON.stringify({
                level: "info",
                message: "Slack retry rescheduled",
                timestamp: new Date().toISOString(),
                ticketId: item.ticketId,
                draftId: item.draftId,
                retryCount: newRetryCount,
                nextRetryAt: nextRetryAt.toISOString(),
                error: errorMessage
              })
            );
          }
        };

        let handled = false;

        const result = await deps.postReview(params, {
          onRateLimited: async delaySeconds => {
            handled = true;
            const delayMs = Math.max(delaySeconds * 1000, deps.defaultRetryDelayMs);
            await scheduleRetry("Slack rate limited", delayMs);
          },
          onSoftFailure: async errorMessage => {
            handled = true;
            await scheduleRetry(errorMessage, deps.computeBackoffMs(retryCount + 1));
          }
        });

        if (handled) {
          continue;
        }

        if (result.ok && !result.error) {
          await deps.updateItem(item.id, {
            status: "succeeded"
          });

          console.log(
            JSON.stringify({
              level: "info",
              message: "Slack retry successful - marked as succeeded",
              timestamp: new Date().toISOString(),
              ticketId: item.ticketId,
              draftId: item.draftId,
              retryCount
            })
          );
        } else {
          const errorMessage = result.error || "non_retryable_error";
          await deps.updateItem(item.id, {
            status: "failed",
            retryCount: (retryCount + 1).toString(),
            lastError: errorMessage
          });

          console.error(
            JSON.stringify({
              level: "error",
              message: "Slack retry failed without recovery",
              timestamp: new Date().toISOString(),
              ticketId: item.ticketId,
              draftId: item.draftId,
              retryCount,
              error: errorMessage
            })
          );
        }
      }
    } catch (error: any) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "Failed to process Slack retry queue",
          timestamp: new Date().toISOString(),
          error: error?.message || String(error)
        })
      );
    }
  };
}

const processRetryQueue = createSlackRetryProcessor({
  maxRetries: 3,
  defaultRetryDelayMs: DEFAULT_RETRY_DELAY_MS,
  computeBackoffMs,
  getItemsToProcess: getSlackRetryQueueItemsToProcess,
  claimItem: claimSlackRetryQueueItem,
  updateItem: updateSlackRetryQueueItem,
  postReview: (params, options) => postReview(params, options)
});

export async function postReview(
  params: PostReviewParams,
  options: PostReviewOptions = {}
): Promise<PostReviewResult> {
  const {
    ticketId,
    draftId,
    originalEmail,
    originalEmailSubject,
    originalEmailBody,
    draftText,
    confidence,
    extraction,
    channel,
    hubspotTicketUrl
  } = params;

  const language = typeof extraction?.language === "string" ? extraction.language : "unknown";
  const paymentConcerns = Array.isArray(extraction?.payment_concerns)
    ? extraction.payment_concerns
        .filter(
          (value: unknown) =>
            value !== undefined && value !== null && String(value).trim().length > 0
        )
        .map((value: unknown) => escapeMrkdwn(String(value)))
    : [];
  const customerConcerns = Array.isArray(extraction?.customer_concerns)
    ? extraction.customer_concerns
        .filter(
          (value: unknown) =>
            value !== undefined && value !== null && String(value).trim().length > 0
        )
        .map((value: unknown) => escapeMrkdwn(String(value)))
    : [];

  console.log(
    JSON.stringify({
      level: "debug",
      message: "postReview: Slack message construction started",
      timestamp: new Date().toISOString(),
      ticketId,
      draftId,
      channel,
      hasHubSpotUrl: !!hubspotTicketUrl,
      hubspotTicketUrl
    })
  );

  console.log(
    JSON.stringify({
      level: "info",
      message: "postReview called",
      timestamp: new Date().toISOString(),
      ticketId,
      draftId,
      channel,
      confidence,
      draftTextLength: draftText?.length || 0
    })
  );

  const env = getEnv();
  if (!env.SLACK_BOT_TOKEN) {
    throw new Error("SLACK_BOT_TOKEN is required");
  }

  const slackHealth = await testSlackConnectivity(env.SLACK_BOT_TOKEN);

  console.log(
    JSON.stringify({
      level: "info",
      message: "Slack API health check",
      timestamp: new Date().toISOString(),
      ticketId,
      draftId,
      reachable: slackHealth.reachable,
      responseTime: slackHealth.responseTime,
      statusCode: slackHealth.statusCode,
      error: slackHealth.error
    })
  );

  if (!slackHealth.reachable) {
    const errorMessage = `Slack unreachable${slackHealth.error ? `: ${slackHealth.error}` : ""}`;

    console.error(
      JSON.stringify({
        level: "error",
        message: "Slack API is not reachable - queuing for retry",
        timestamp: new Date().toISOString(),
        ticketId,
        draftId,
        healthCheck: slackHealth
      })
    );

    if (options.onSoftFailure) {
      await options.onSoftFailure(errorMessage);
    } else {
      await queueSlackRetry(params, { reason: "slack_unreachable" });
    }

    return { ok: false, error: "slack_unreachable" };
  }

  const subjectLine = originalEmailSubject ?? originalEmail?.split("\n")[0] ?? "";
  const subjectBlockText = escapeMrkdwn(subjectLine.slice(0, SUBJECT_MAX_LENGTH));

  const rawBody = originalEmailBody ?? originalEmail ?? "";
  const trimmedBody =
    rawBody.length > BODY_BLOCK_MAX_LENGTH
      ? `${rawBody.slice(0, BODY_BLOCK_MAX_LENGTH)}\n…[truncated]`
      : rawBody;
  const bodyBlockText = sanitizeForCodeBlock(trimmedBody);

  const trimmedDraft =
    draftText.length > DRAFT_BLOCK_MAX_LENGTH
      ? `${draftText.slice(0, DRAFT_BLOCK_MAX_LENGTH)}\n…[truncated]`
      : draftText;
  const draftBlockText = sanitizeForCodeBlock(trimmedDraft);

  const confidencePercent = Number.isFinite(confidence) ? Math.round(confidence * 100) : 0;

  const blocks: Record<string, any>[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "🤖 Draft Review Required"
      }
    }
  ];

  if (hubspotTicketUrl) {
    console.log(
      JSON.stringify({
        level: "debug",
        message: "postReview: Including HubSpot ticket link block",
        timestamp: new Date().toISOString(),
        ticketId,
        draftId,
        url: hubspotTicketUrl
      })
    );
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*HubSpot ticket:* <${hubspotTicketUrl}|HubSpot ticket>`
      }
    });
  } else {
    console.log(
      JSON.stringify({
        level: "debug",
        message: "postReview: Skipping HubSpot link - no URL provided",
        timestamp: new Date().toISOString(),
        ticketId,
        draftId,
        reason: "hubspotTicketUrl is falsy"
      })
    );
  }

  if (paymentConcerns.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*💳 Payment Concerns:* ${paymentConcerns.join(", ")}`
      }
    });
  }

  if (customerConcerns.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🤔 Customer Concerns:* ${customerConcerns.join(", ")}`
      }
    });
  }

  blocks.push(
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Original Email – Subject:*\n${subjectBlockText}`
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Original Email – Body:*\n\`\`\`${bodyBlockText}\`\`\``
      }
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Draft Reply:*\n\`\`\`${draftBlockText}\`\`\``
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
            text: "Approve"
          },
          style: "primary",
          action_id: "approve",
          value: JSON.stringify({ ticketId, draftId })
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Edit"
          },
          action_id: "edit",
          value: JSON.stringify({ ticketId, draftId })
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Reject"
          },
          style: "danger",
          action_id: "reject",
          value: JSON.stringify({ ticketId, draftId })
        }
      ]
    }
  );

  const payload = {
    channel,
    text: `Draft Review Required – ${confidencePercent}% confidence, language: ${language}`,
    blocks
  };

  const maxAttempts = 2;
  const baseDelayMs = 500;

  const parseRetryAfterSeconds = (
    header: string | null,
    fallback?: unknown
  ): number | undefined => {
    if (header) {
      const parsed = parseInt(header, 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }
    const fallbackNumber =
      typeof fallback === "number"
        ? fallback
        : typeof fallback === "string"
          ? parseInt(fallback, 10)
          : undefined;
    if (fallbackNumber && fallbackNumber > 0) {
      return fallbackNumber;
    }
    return undefined;
  };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${env.SLACK_BOT_TOKEN}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const retryAfterHeader = response.headers.get("retry-after");

      if (response.status === 429) {
        const retryAfterSeconds = parseRetryAfterSeconds(retryAfterHeader) ?? 60;

        console.error(
          JSON.stringify({
            level: "error",
            message: "Slack rate limited response received",
            timestamp: new Date().toISOString(),
            ticketId,
            draftId,
            channel,
            retryAfterSeconds
          })
        );

        if (options.onRateLimited) {
          await options.onRateLimited(retryAfterSeconds);
        } else {
          await queueSlackRetry(params, {
            nextRetryAt: new Date(Date.now() + retryAfterSeconds * 1000),
            reason: "rate_limited"
          });
        }

        return { ok: false, error: "rate_limited", retryAfterSeconds };
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack API error: ${response.status} ${errorText}`);
      }

      const json = await response.json();

      if (!json.ok) {
        const error = json.error || "unknown_error";

        if (error === "rate_limited" || error === "ratelimited") {
          const retryAfterSeconds =
            parseRetryAfterSeconds(retryAfterHeader, json.retry_after) ?? 60;

          console.error(
            JSON.stringify({
              level: "error",
              message: "Slack rate limited response body",
              timestamp: new Date().toISOString(),
              ticketId,
              draftId,
              channel,
              retryAfterSeconds
            })
          );

          if (options.onRateLimited) {
            await options.onRateLimited(retryAfterSeconds);
          } else {
            await queueSlackRetry(params, {
              nextRetryAt: new Date(Date.now() + retryAfterSeconds * 1000),
              reason: "rate_limited"
            });
          }

          return { ok: false, error: "rate_limited", retryAfterSeconds };
        }

        const errorMessage = `Slack API error: ${error}`;

        console.error(
          JSON.stringify({
            level: "error",
            message: "Slack API error response",
            timestamp: new Date().toISOString(),
            ticketId,
            draftId,
            channel,
            error,
            response: json
          })
        );

        if (options.onSoftFailure) {
          await options.onSoftFailure(errorMessage);
        } else {
          await queueSlackRetry(params, { reason: error });
        }

        return { ok: false, error };
      }

      console.log(
        JSON.stringify({
          level: "info",
          message: "Slack postReview successful",
          timestamp: new Date().toISOString(),
          ticketId,
          draftId,
          channel,
          messageTs: json.ts,
          attempt,
          includedHubSpotLink: !!hubspotTicketUrl
        })
      );

      return { ok: true };
    } catch (e: any) {
      const msg = e?.data?.error || e?.message || String(e);
      const isAbort = e?.name === "AbortError" || msg.includes("aborted");
      const canRetry =
        isAbort || /fetch failed|ECONNRESET|ENOTFOUND|EAI_AGAIN|TLS|ETIMEDOUT/i.test(msg);

      console.error(
        JSON.stringify({
          level: "error",
          message: "Slack postReview attempt failed",
          timestamp: new Date().toISOString(),
          error: msg,
          ticketId,
          draftId,
          attempt,
          canRetry,
          isAbort
        })
      );

      if (canRetry && attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(
          JSON.stringify({
            level: "info",
            message: "Retrying Slack postReview",
            timestamp: new Date().toISOString(),
            ticketId,
            draftId,
            attempt: attempt + 1,
            delayMs: delay
          })
        );
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      const errorMessage = msg;

      if (options.onSoftFailure) {
        await options.onSoftFailure(errorMessage);
      } else {
        await queueSlackRetry(params, { reason: "soft_failure" });
      }

      console.error(
        JSON.stringify({
          level: "error",
          message:
            "Slack postReview failed after all retries - continuing without Slack notification",
          timestamp: new Date().toISOString(),
          error: msg,
          ticketId,
          draftId,
          finalAttempt: attempt
        })
      );

      return { ok: false, error: "soft_failure" };
    }
  }

  console.error(
    JSON.stringify({
      level: "error",
      message: "Slack postReview exhausted retries - continuing without Slack notification",
      timestamp: new Date().toISOString(),
      ticketId,
      draftId
    })
  );

  return { ok: false, error: "unknown_failure" };
}

// Export function to process retry queue (call this periodically)
export async function processSlackRetryQueue(): Promise<void> {
  await processRetryQueue();
}

// Export function to get retry queue status
export async function getSlackRetryQueueStatus(): Promise<{
  count: number;
  pending: number;
  processing: number;
  succeeded: number;
  failed: number;
  byRetryCount: Record<number, number>;
}> {
  try {
    return await getSlackRetryQueueStats();
  } catch (error: any) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Failed to get Slack retry queue stats",
        timestamp: new Date().toISOString(),
        error: error?.message || String(error)
      })
    );
    return {
      count: 0,
      pending: 0,
      processing: 0,
      succeeded: 0,
      failed: 0,
      byRetryCount: {}
    };
  }
}
