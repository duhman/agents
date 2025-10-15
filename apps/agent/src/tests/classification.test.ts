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

    it("flags Apple ID login issues as non-cancellation", () => {
      const email = `Subject: Kontakt - Ladeabonnement.\n\nHei.\n\nJeg har forsøkt å kontakte dere via Support skjema, men har ikke fått bekreftelse på at dere har mottatt min henvendelse;\n\nJeg har en konto hos dere som er laget med skjult e-post adresse fra Apple-ID og jeg får ikke logget inn på brukeren min. Dette ønsker jeg å ha tilgang til.\n\nSiden det ikke er mulig å endre e-post adresse via deres system (i følge deres ChatBot) lurer jeg på om en løsning kan være at dere sletter den brukeren og jeg får opprettet nytt.\n\nHilsen Marian Sundal`;
      assert.equal(isNonCancellationEmail(email), true);
      assert.equal(detectCancellationIntentEnhanced(email), false);
    });

    it("flags charging session issues as non-cancellation", () => {
      const email = "Subject: Lading\n\nFår ikke avsluttd lading i solheimslien.";
      assert.equal(isNonCancellationEmail(email), true);
      assert.equal(detectCancellationIntentEnhanced(email), false);
    });

    it("flags installer onboarding requests as non-cancellation", () => {
      const email = `Subject: Montasje av ny EVlink PRO AC på Plass 17 på Marienlyst Garasjer\n\nJeg har montert en EVlink PRO AC på Plass 17 på Marienlyst Garasjer og trenger at dere legger denne inn i deres backend.\n\nChargebox ID: B25216020006`;
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
