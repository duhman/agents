import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { postReview, type PostReviewParams } from "../index.js";

const REQUIRED_ENV = {
  DATABASE_URL: "postgres://user:pass@localhost:5432/db",
  OPENAI_API_KEY: "test-openai",
  SLACK_BOT_TOKEN: "xoxb-test-token"
};

function installEnv() {
  for (const [key, value] of Object.entries(REQUIRED_ENV)) {
    process.env[key] = value;
  }
}

describe("Slack message blocks rendering", () => {
  it("builds valid Slack blocks for draft review (smoke test)", async () => {
    installEnv();

    const testParams: PostReviewParams = {
      ticketId: "00000000-0000-0000-0000-000000000001",
      draftId: "00000000-0000-0000-0000-000000000002",
      originalEmail: "Subject: Cancel subscription\n\nI am moving to another city.",
      originalEmailSubject: "Cancel subscription",
      originalEmailBody: "I am moving to another city.",
      draftText: "Thank you for notifying us. We will process your cancellation request.",
      confidence: 0.85,
      extraction: {
        language: "en",
        reason: "moving",
        is_cancellation: true,
        payment_concerns: [],
        customer_concerns: []
      },
      channel: "C-test-channel",
      hubspotTicketUrl: "https://app.hubspot.com/contacts/123/record/0-5/456"
    };

    // Mock fetch to prevent actual Slack API call
    const originalFetch = global.fetch;
    let capturedBlocks: any = null;
    let callCount = 0;

    global.fetch = async (url: string, options: any) => {
      callCount++;
      
      // First call is auth.test (health check)
      if (url.includes("auth.test")) {
        return new Response(JSON.stringify({ ok: true, bot_id: "B123", user_id: "U123", team: "T123" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      
      // Subsequent calls are chat.postMessage
      if (url.includes("chat.postMessage")) {
        const body = JSON.parse(options.body);
        capturedBlocks = body.blocks;
        return new Response(JSON.stringify({ ok: true, ts: "1234567890.123456" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify({ ok: false }), { status: 500 });
    };

    try {
      await postReview(testParams);

      assert.ok(capturedBlocks, "Blocks should be captured from Slack API call");
      assert.ok(Array.isArray(capturedBlocks), "Blocks should be an array");
      assert.ok(capturedBlocks.length > 0, "Blocks array should not be empty");

      // Verify block structure
      const headerBlock = capturedBlocks.find((b: any) => b.type === "header");
      assert.ok(headerBlock, "Should have header block");
      assert.ok(headerBlock.text.text.includes("Draft Review"), "Header should mention draft review");

      const draftBlock = capturedBlocks.find((b: any) => b.type === "section" && b.text?.text?.includes("Draft Reply"));
      assert.ok(draftBlock, "Should have draft reply section");

      const actionsBlock = capturedBlocks.find((b: any) => b.type === "actions");
      assert.ok(actionsBlock, "Should have actions block with buttons");

      const buttons = actionsBlock.elements;
      assert.ok(buttons.length >= 3, "Should have at least 3 buttons (Approve, Edit, Reject)");

      const approveBtn = buttons.find((b: any) => b.action_id === "approve");
      const editBtn = buttons.find((b: any) => b.action_id === "edit");
      const rejectBtn = buttons.find((b: any) => b.action_id === "reject");

      assert.ok(approveBtn, "Should have Approve button");
      assert.ok(editBtn, "Should have Edit button");
      assert.ok(rejectBtn, "Should have Reject button");

      // Verify button values contain ticketId and draftId
      const approveValue = JSON.parse(approveBtn.value);
      assert.equal(approveValue.ticketId, testParams.ticketId);
      assert.equal(approveValue.draftId, testParams.draftId);

      // Verify HubSpot link is included
      const hubspotBlock = capturedBlocks.find(
        (b: any) => b.type === "section" && b.text?.text?.includes("HubSpot ticket")
      );
      assert.ok(hubspotBlock, "Should include HubSpot ticket link when URL provided");

      console.log("✓ Slack blocks rendering smoke test passed");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("renders blocks without HubSpot URL when not provided", async () => {
    installEnv();

    const testParams: PostReviewParams = {
      ticketId: "00000000-0000-0000-0000-000000000003",
      draftId: "00000000-0000-0000-0000-000000000004",
      originalEmail: "Subject: Test\n\nBody",
      originalEmailSubject: "Test",
      originalEmailBody: "Body",
      draftText: "Reply",
      confidence: 0.5,
      extraction: { language: "no" },
      channel: "C-test",
      hubspotTicketUrl: undefined
    };

    const originalFetch = global.fetch;
    let capturedBlocks: any = null;

    global.fetch = async (url: string, options: any) => {
      // First call is auth.test (health check)
      if (url.includes("auth.test")) {
        return new Response(JSON.stringify({ ok: true, bot_id: "B123", user_id: "U123", team: "T123" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      
      // Subsequent calls are chat.postMessage
      if (url.includes("chat.postMessage")) {
        const body = JSON.parse(options.body);
        capturedBlocks = body.blocks;
        return new Response(JSON.stringify({ ok: true, ts: "1234567890.123456" }), {
          status: 200,
          headers: { "content-type": "application/json" }
        });
      }
      
      return new Response(JSON.stringify({ ok: false }), { status: 500 });
    };

    try {
      await postReview(testParams);

      assert.ok(capturedBlocks, "Blocks should be captured");

      const hubspotBlock = capturedBlocks.find(
        (b: any) => b.type === "section" && b.text?.text?.includes("HubSpot ticket")
      );
      assert.equal(hubspotBlock, undefined, "Should NOT include HubSpot link when URL not provided");

      console.log("✓ Slack blocks without HubSpot URL test passed");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
