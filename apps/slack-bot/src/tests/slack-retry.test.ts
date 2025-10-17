import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  postReview,
  createSlackRetryProcessor,
  DEFAULT_RETRY_DELAY_MS,
  computeBackoffMs,
  type PostReviewParams,
  type PostReviewOptions,
  type PostReviewResult
} from "../index.js";

const REQUIRED_ENV = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  OPENAI_API_KEY: "test-openai",
  SLACK_BOT_TOKEN: "xoxb-test-token"
};

const SAMPLE_PARAMS: PostReviewParams = {
  ticketId: "ticket-1",
  draftId: "draft-1",
  originalEmail: "Subject: Hello\n\nBody",
  originalEmailSubject: "Hello",
  originalEmailBody: "Body of email",
  draftText: "Draft reply",
  confidence: 0.75,
  extraction: {},
  channel: "C123",
  hubspotTicketUrl: undefined
};

const originalFetch = global.fetch;
const originalDateNow = Date.now;

function installEnv() {
  for (const [key, value] of Object.entries(REQUIRED_ENV)) {
    process.env[key] = value;
  }
}

describe("Slack retry behaviour", () => {
  beforeEach(() => {
    installEnv();
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    }
    Date.now = originalDateNow;
  });

  it("invokes onRateLimited when Slack responds with HTTP 429", async () => {
    let fetchCall = 0;
    global.fetch = async () => {
      fetchCall += 1;
      if (fetchCall === 1) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
        status: 429,
        headers: { "Retry-After": "42" }
      });
    };

    let observedDelay: number | undefined;
    const result = await postReview(SAMPLE_PARAMS, {
      onRateLimited: async (delaySeconds: number) => {
        observedDelay = delaySeconds;
      }
    });

    assert.equal(observedDelay, 42);
    assert.deepEqual(result, { ok: false, error: "rate_limited", retryAfterSeconds: 42 });
  });

  it("invokes onSoftFailure when Slack is unreachable", async () => {
    global.fetch = async () => {
      throw new Error("network down");
    };

    let observedMessage: string | undefined;
    const result = await postReview(SAMPLE_PARAMS, {
      onSoftFailure: async (message: string) => {
        observedMessage = message;
      }
    });

    assert.equal(result.ok, false);
    assert.ok(observedMessage);
    assert.ok(observedMessage?.includes("Slack unreachable"));
  });

  it("reschedules retry items on rate limiting", async () => {
    const fixedNow = Date.UTC(2025, 0, 1, 0, 0, 0);
    Date.now = () => fixedNow;

    const queueItem = {
      id: "item-1",
      ticketId: "ticket-1",
      draftId: "draft-1",
      channel: "C123",
      originalEmail: "Subject: Hello\n\nBody",
      originalEmailSubject: "Hello",
      originalEmailBody: "Body",
      draftText: "Draft reply",
      confidence: "0.7",
      extraction: {},
      hubspotTicketUrl: null,
      retryCount: "0",
      nextRetryAt: new Date(fixedNow),
      lastError: null,
      status: "pending",
      createdAt: new Date(fixedNow),
      updatedAt: new Date(fixedNow)
    };

    const updates: Array<{ id: string; data: Record<string, unknown> }> = [];

    const processor = createSlackRetryProcessor({
      maxRetries: 3,
      defaultRetryDelayMs: DEFAULT_RETRY_DELAY_MS,
      computeBackoffMs,
      getItemsToProcess: async () => [queueItem],
      claimItem: async () => queueItem,
      updateItem: async (id, data) => {
        updates.push({ id, data });
        return { ...queueItem, ...data };
      },
      postReview: async (_params: PostReviewParams, options: PostReviewOptions): Promise<PostReviewResult> => {
        await options.onRateLimited?.(10);
        return { ok: false, error: "rate_limited", retryAfterSeconds: 10 };
      }
    });

    await processor();

    assert.equal(updates.length, 1);
    const update = updates[0].data as {
      retryCount: string;
      status: string;
      lastError: string;
      nextRetryAt: Date;
    };

    assert.equal(update.retryCount, "1");
    assert.equal(update.status, "pending");
    assert.equal(update.lastError, "Slack rate limited");
    assert.ok(update.nextRetryAt instanceof Date);
    assert.equal(update.nextRetryAt.getTime() - fixedNow, DEFAULT_RETRY_DELAY_MS);
  });

  it("marks items as succeeded when postReview succeeds", async () => {
    const queueItem = {
      id: "item-2",
      ticketId: "ticket-2",
      draftId: "draft-2",
      channel: "C456",
      originalEmail: "Subject: Hi\n\nBody",
      originalEmailSubject: "Hi",
      originalEmailBody: "Body",
      draftText: "Draft",
      confidence: "0.9",
      extraction: {},
      hubspotTicketUrl: null,
      retryCount: "1",
      nextRetryAt: new Date(),
      lastError: null,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updates: Array<Record<string, unknown>> = [];

    const processor = createSlackRetryProcessor({
      maxRetries: 3,
      defaultRetryDelayMs: DEFAULT_RETRY_DELAY_MS,
      computeBackoffMs,
      getItemsToProcess: async () => [queueItem],
      claimItem: async () => queueItem,
      updateItem: async (_id, data) => {
        updates.push(data);
        return { ...queueItem, ...data };
      },
      postReview: async () => ({ ok: true })
    });

    await processor();

    assert.equal(updates.length, 1);
    assert.equal(updates[0]?.status, "succeeded");
  });
});
