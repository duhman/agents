import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectCancellationIntentEnhanced,
  isNonCancellationEmail,
  analyzeEmailStructure
} from "../../../../packages/prompts/src/patterns.js";

describe("Email Classification", () => {
  describe("Non-Cancellation Detection", () => {
    it("detects feedback request emails", () => {
      const email = "Subject: How would you rate the received customer service?\n\nInquiry # 493729";
      assert.equal(isNonCancellationEmail(email), true);
      assert.equal(detectCancellationIntentEnhanced(email), false);
    });

    it("detects general question emails", () => {
      const email = "Subject: How do I update my payment information?\n\nI need help updating my card.";
      assert.equal(isNonCancellationEmail(email), true);
      assert.equal(detectCancellationIntentEnhanced(email), false);
    });

    it("detects support request emails", () => {
      const email = "Subject: App not working\n\nI cannot access the charging station.";
      assert.equal(isNonCancellationEmail(email), true);
      assert.equal(detectCancellationIntentEnhanced(email), false);
    });

    it("detects rating/survey emails", () => {
      const email = "Subject: Rate our service\n\nPlease rate your experience with our customer service.";
      assert.equal(isNonCancellationEmail(email), true);
      assert.equal(detectCancellationIntentEnhanced(email), false);
    });

    it("detects inquiry emails", () => {
      const email = "Subject: Inquiry # 12345\n\nHow can I contact support?";
      assert.equal(isNonCancellationEmail(email), true);
      assert.equal(detectCancellationIntentEnhanced(email), false);
    });
  });

  describe("Cancellation Detection", () => {
    it("detects clear cancellation requests", () => {
      const email = "Subject: Cancellation request\n\nI am moving and want to cancel my subscription.";
      assert.equal(isNonCancellationEmail(email), false);
      assert.equal(detectCancellationIntentEnhanced(email), true);
    });

    it("detects Norwegian cancellation requests", () => {
      const email = "Subject: Oppsigelse\n\nJeg skal flytte og ønsker å si opp abonnementet mitt.";
      assert.equal(detectCancellationIntentEnhanced(email), true);
    });

    it("detects English cancellation requests", () => {
      const email = "Subject: Cancel subscription\n\nI need to cancel my subscription because I am moving.";
      assert.equal(detectCancellationIntentEnhanced(email), true);
    });

    it("detects cancellation intent in body with neutral subject", () => {
      const email = "Subject: Question about my account\n\nI am moving and would like to cancel my subscription.";
      assert.equal(detectCancellationIntentEnhanced(email), true);
    });
  });

  describe("Email Structure Analysis", () => {
    it("parses subject and body", () => {
      const email = "Subject: Test Subject\n\nThis is the email body content.";
      const result = analyzeEmailStructure(email);

      assert.equal(result.subject, "Test Subject");
      assert.equal(result.body, "This is the email body content.");
      assert.equal(result.hasSubject, true);
    });

    it("handles emails without subject line", () => {
      const email = "This is just the email body without a subject line.";
      const result = analyzeEmailStructure(email);

      assert.equal(result.subject, "This is just the email body without a subject line.");
      assert.equal(result.body, "This is just the email body without a subject line.");
      assert.equal(result.hasSubject, false);
    });

    it("handles case-insensitive subject parsing", () => {
      const email = "subject: Test Subject\n\nThis is the email body content.";
      const result = analyzeEmailStructure(email);

      assert.equal(result.subject, "Test Subject");
      assert.equal(result.body, "This is the email body content.");
      assert.equal(result.hasSubject, true);
    });
  });

});
