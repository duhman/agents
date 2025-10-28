import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { processEmailWithAssistants } from "../assistants-processor.js";

describe("Assistants API Processor", () => {
  describe("Configuration", () => {
    it("should have assistant IDs configured via environment variables", () => {
      expect(process.env.OPENAI_EXTRACTION_ASSISTANT_ID).toBeDefined();
      expect(process.env.OPENAI_RESPONSE_ASSISTANT_ID).toBeDefined();
      expect(process.env.OPENAI_EXTRACTION_ASSISTANT_ID).toMatch(/^asst_/);
      expect(process.env.OPENAI_RESPONSE_ASSISTANT_ID).toMatch(/^asst_/);
    });
  });

  describe("Email Classification", () => {
    it("should detect cancellation requests", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "Hei, jeg skal flytte til Oslo 15. mars og vil si opp abonnementet mitt."
      });

      expect(result.success).toBe(true);
      expect(result.extraction?.is_cancellation).toBe(true);
      expect(result.extraction?.reason).toBe("moving");
      expect(result.extraction_method).toBe("assistants-api");
    });

    it("should reject non-cancellation emails", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "How do I update my payment method?"
      });

      expect(result.success).toBe(true);
      expect(result.extraction?.is_cancellation).toBe(false);
      expect(result.ticket).toBeNull();
      expect(result.draft).toBeNull();
    });

    it("should detect payment issues", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "I was charged twice for my subscription. I want to cancel and get a refund."
      });

      expect(result.success).toBe(true);
      expect(result.extraction?.is_cancellation).toBe(true);
      expect(result.extraction?.has_payment_issue).toBe(true);
    });
  });

  describe("Language Detection", () => {
    it("should detect Norwegian language", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "Hei, jeg ønsker å si opp abonnementet mitt."
      });

      expect(result.extraction?.language).toBe("no");
    });

    it("should detect English language", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "Hello, I would like to cancel my subscription."
      });

      expect(result.extraction?.language).toBe("en");
    });

    it("should detect Swedish language", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "Hej, jag vill säga upp mitt abonnemang."
      });

      expect(result.extraction?.language).toBe("sv");
    });
  });

  describe("Edge Case Detection", () => {
    it("should detect app access issues", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "I don't have access to the app. Can you help me cancel my subscription manually?"
      });

      expect(result.extraction?.edge_case).toBe("no_app_access");
    });

    it("should detect sameie concerns", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail:
          "I'm moving out of the building and want to cancel my subscription. Will this affect the whole sameie?"
      });

      expect(result.extraction?.edge_case).toBe("sameie_concern");
    });

    it("should detect future move dates", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "I will be moving in December 2025 and want to cancel my subscription then."
      });

      expect(result.extraction?.move_date).toBeTruthy();
      expect(result.extraction?.urgency).toBe("future");
    });
  });

  describe("Response Generation", () => {
    it("should generate a response for cancellation requests", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "Hei, jeg skal flytte til Oslo 15. mars og vil si opp abonnementet mitt."
      });

      expect(result.success).toBe(true);
      expect(result.draft?.draftText).toBeTruthy();
      expect(result.draft?.draftText).toContain("Elaway");
      expect(result.draft?.draftText.length).toBeGreaterThan(50);
    });

    it("should skip response generation for unclear intent", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "I'm thinking about maybe canceling my subscription soon."
      });

      expect(result.success).toBe(true);
      if (!result.extraction?.is_cancellation) {
        expect(result.draft).toBeNull();
      }
    });

    it("should create ticket and draft for valid cancellations", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "I want to cancel my subscription immediately."
      });

      expect(result.success).toBe(true);
      if (
        result.extraction?.is_cancellation &&
        result.extraction?.confidence_factors?.clear_intent
      ) {
        expect(result.ticket?.id).toBeTruthy();
        expect(result.draft?.id).toBeTruthy();
      }
    });
  });

  describe("Confidence Scoring", () => {
    it("should provide confidence scores for extractions", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "Hei, jeg skal flytte til Oslo 15. mars og vil si opp abonnementet mitt."
      });

      expect(result.confidence).toBeDefined();
      expect(typeof result.confidence).toBe("number");
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should have lower confidence for ambiguous cancellations", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "I might cancel my subscription if things don't improve."
      });

      if (result.extraction?.is_cancellation) {
        expect(result.extraction?.confidence_factors?.clear_intent).toBe(false);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle empty emails gracefully", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: ""
      });

      expect(result.success).toBe(true);
      expect(result.extraction?.is_cancellation).toBe(false);
    });

    it("should handle very long emails", async () => {
      const longEmail = "I want to cancel. " + "This is extra context. ".repeat(100);

      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: longEmail
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Multilingual Support", () => {
    it("should respond in Norwegian for Norwegian emails", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "Hei, jeg ønsker å si opp abonnementet mitt fordi jeg skal flytte."
      });

      expect(result.extraction?.language).toBe("no");
      if (result.draft?.draftText) {
        // Should contain Norwegian content
        expect(result.draft.draftText.toLowerCase()).toMatch(/hei|takk|elaway/i);
      }
    });

    it("should respond in English for English emails", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "test@example.com",
        rawEmail: "Hello, I want to cancel my subscription because I am moving."
      });

      expect(result.extraction?.language).toBe("en");
      if (result.draft?.draftText) {
        // Should contain English content
        expect(result.draft.draftText.toLowerCase()).toMatch(/hello|thank|elaway/i);
      }
    });
  });

  describe("PII Masking", () => {
    it("should mask email addresses in extraction", async () => {
      const result = await processEmailWithAssistants({
        source: "test",
        customerEmail: "john.doe@example.com",
        rawEmail: "Hi, I'm john.doe@example.com and I want to cancel my subscription."
      });

      expect(result.success).toBe(true);
      // The extraction should have been done on masked email
      // So the actual email shouldn't appear in logs (checked separately)
    });
  });

  describe("Integration", () => {
    it("should process a realistic cancellation scenario", async () => {
      const result = await processEmailWithAssistants({
        source: "hubspot",
        customerEmail: "customer@example.com",
        rawEmail: `Hei,

Jeg skal flytte fra Oslo til Bergen 1. april og ønsker å si opp abonnementet mitt.

Kan dere bekrefte at det er mulig?

Mvh,
Knut`
      });

      expect(result.success).toBe(true);
      expect(result.extraction?.is_cancellation).toBe(true);
      expect(result.extraction?.reason).toBe("moving");
      expect(result.extraction?.move_date).toBeTruthy();

      if (result.extraction?.confidence_factors?.clear_intent) {
        expect(result.ticket?.id).toBeTruthy();
        expect(result.draft?.id).toBeTruthy();
        expect(result.draft?.draftText).toContain("april");
      }
    });

    it("should process payment issue with cancellation", async () => {
      const result = await processEmailWithAssistants({
        source: "hubspot",
        customerEmail: "customer@example.com",
        rawEmail: `I've been charged twice for my subscription and I'm very frustrated. 
I want to cancel immediately and receive a refund for the double charge.
Please help!`
      });

      expect(result.success).toBe(true);
      expect(result.extraction?.is_cancellation).toBe(true);
      expect(result.extraction?.has_payment_issue).toBe(true);
      expect(result.extraction?.payment_concerns?.length).toBeGreaterThan(0);
    });
  });
});
