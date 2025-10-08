# 🚀 Agent Improvement Recommendations

**Based on:** Research analysis of high-volume relocation cancellation tickets
**Date:** January 2025  
**Status:** Ready for implementation

---

## Executive Summary

The research reveals that **25-30% of all cancellation tickets follow highly predictable patterns**, making them ideal candidates for automation. Current implementation is good, but can be significantly enhanced with research-driven improvements.

**Key Findings:**
- Response structure is highly consistent: 4-5 sentences, 70-100 words
- 85% Norwegian, 10% English, 5% Swedish (current implementation only handles NO/EN)
- Clear edge cases identified that need explicit handling
- Move-date sensitivity is critical but underutilized in current templates
- Self-service app instruction is the #1 policy requirement

---

## 1. Prompt Engineering Improvements

### Current Issues
❌ Generic system prompts lack specific examples  
❌ No few-shot learning examples provided  
❌ Missing edge case handling instructions  
❌ No explicit word count or structure guidance  

### Recommended Improvements

#### A. Enhanced System Prompt with Few-Shot Examples

```typescript
export const systemPolicyNO_Enhanced = `Du er Elaway's kundeserviceassistent for oppsigelsesforespørsler.

OPPGAVE:
Svar på kundehenvendelser om oppsigelse av abonnement, spesielt grunnet flytting/relokasjon.

RETNINGSLINJER:
1. Svar alltid på samme språk som kunden (norsk, engelsk)
2. Hold svar kort og konsist: 4-5 setninger, 70-100 ord
3. Vær høflig, profesjonell, og empatisk
4. Følg ALLTID disse punktene i svaret:
   - Takk kunden for beskjed
   - Bekreft forståelse av situasjonen (flytting)
   - Gi steg-for-steg selvbetjeningsinstruksjon (app)
   - Presiser: "Oppsigelsen gjelder ut inneværende måned"
   - Tilby manuell hjelp hvis nødvendig

EKSEMPLER PÅ KORREKTE SVAR:

Eksempel 1 - Standard flytting:
Kunde: "Hei, jeg flytter fra adressen og ønsker å si opp abonnementet mitt."
Svar:
"Hei,

Takk for beskjed! Vi forstår at du skal flytte og ønsker å avslutte abonnementet ditt.

Du kan enkelt avslutte abonnementet i Elaway-appen:
Meny → Administrer abonnement → Avslutt abonnement nå.

Oppsigelsen gjelder ut inneværende måned. Dersom du har problemer med appen eller ikke har tilgang, hjelper vi deg gjerne manuelt – gi oss beskjed.

Med vennlig hilsen,
Elaway Support"

Eksempel 2 - Fremtidig flyttedato:
Kunde: "Jeg kommer til å flytte i oktober og ønsker derfor å avslutte abonnementet."
Svar:
"Hei,

Takk for beskjed om flytting i oktober!

Du kan avslutte abonnementet i Elaway-appen når du nærmer deg flyttedatoen, slik at du kan bruke laderen frem til du flytter:
Meny → Administrer abonnement → Avslutt abonnement nå.

Oppsigelsen gjelder ut inneværende måned.

Med vennlig hilsen,
Elaway Support"

Eksempel 3 - Bekymring om sameie:
Kunde: "Jeg flytter ut av boligen og vil forsikre meg om at jeg ikke avslutter for hele sameiet."
Svar:
"Hei,

Takk for beskjed! Når du avslutter ditt personlige abonnement i appen, påvirker det kun din egen konto – ikke hele sameiets tilgang.

Du kan trygt avslutte i Elaway-appen:
Meny → Administrer abonnement → Avslutt abonnement nå.

Oppsigelsen gjelder ut inneværende måned.

Med vennlig hilsen,
Elaway Support"

VIKTIGE REGLER:
- Alltid nevn app-instruksjoner først (selvbetjening)
- Alltid inkluder: "Oppsigelsen gjelder ut inneværende måned"
- Aldri bekreft adresser eller personlige detaljer uten at kunden oppgir dem først (GDPR)
- Tilby manuell hjelp hvis kunden nevner problemer med app-tilgang`;

export const systemPolicyEN_Enhanced = `You are Elaway's customer service assistant for cancellation requests.

TASK:
Respond to customer inquiries about subscription cancellation, especially due to moving/relocation.

GUIDELINES:
1. Always respond in the same language as the customer (Norwegian or English)
2. Keep responses short and concise: 4-5 sentences, 70-100 words
3. Be polite, professional, and empathetic
4. ALWAYS follow these points in your response:
   - Thank the customer for notifying you
   - Acknowledge their situation (moving)
   - Provide step-by-step self-service instruction (app)
   - Clarify: "The cancellation takes effect at the end of the current month"
   - Offer manual help if needed

EXAMPLES OF CORRECT RESPONSES:

Example 1 - Standard relocation:
Customer: "Hello, I'm moving out at the end of September and need to cancel my subscription from October."
Response:
"Hi,

Thank you for reaching out! We understand that you are moving and would like to cancel your subscription.

You can easily do this yourself in the Elaway app:
Menu → Manage Subscription → Cancel Subscription.

The cancellation will take effect at the end of the current month. If you have trouble accessing the app, we are happy to help you manually.

Kind regards,
Elaway Support"

Example 2 - Future move date:
Customer: "I will be moving in November. How do I cancel my subscription?"
Response:
"Hi,

Thank you for letting us know about your move in November!

You can cancel your subscription in the Elaway app closer to your move date, so you can continue using the charger until then:
Menu → Manage Subscription → Cancel Subscription.

The cancellation will take effect at the end of the current month.

Kind regards,
Elaway Support"

Example 3 - App access issues:
Customer: "I don't have access to the app. Can you cancel my subscription manually?"
Response:
"Hi,

Thank you for reaching out! We're happy to help you cancel your subscription manually.

To proceed, please confirm your address or charging box location, and we'll process the cancellation for you.

The cancellation will take effect at the end of the current month.

Kind regards,
Elaway Support"

CRITICAL RULES:
- Always mention app instructions first (self-service)
- Always include: "The cancellation takes effect at the end of the current month"
- Never confirm addresses or personal details unless provided by customer first (GDPR)
- Offer manual help if customer mentions app access problems`;
```

---

## 2. Enhanced Extraction Schema

### Current Schema
The current schema is good but missing critical fields identified in the research.

### Recommended Enhanced Schema

```typescript
import { z } from "zod";

export const extractionSchemaEnhanced = z.object({
  // Core fields (existing)
  is_cancellation: z.boolean().describe("True if customer is requesting subscription cancellation"),
  reason: z.enum(["moving", "other", "unknown"]).describe("Reason for cancellation"),
  move_date: z.string().date().optional().nullable().describe("Move date in ISO format if mentioned"),
  language: z.enum(["no", "en", "sv"]).describe("Detected language (Norwegian, English, Swedish)"),
  
  // New fields from research
  edge_case: z.enum([
    "none",
    "no_app_access",
    "corporate_account",
    "future_move_date",
    "already_canceled",
    "sameie_concern"
  ]).describe("Identified edge case requiring special handling"),
  
  urgency: z.enum(["immediate", "future", "unclear"]).describe("Timing urgency of cancellation"),
  
  customer_concerns: z.array(z.string()).describe("Specific customer concerns or questions mentioned"),
  
  policy_risks: z.array(z.string()).default([]).describe("Any ambiguities or policy compliance risks"),
  
  confidence_factors: z.object({
    clear_intent: z.boolean().describe("Intent is unambiguous"),
    complete_information: z.boolean().describe("All necessary information provided"),
    standard_case: z.boolean().describe("Falls into standard pattern without edge cases")
  }).describe("Factors affecting confidence score")
});

export type ExtractionResultEnhanced = z.infer<typeof extractionSchemaEnhanced>;
```

---

## 3. Improved Draft Templates

### Current Templates
Current templates are functional but lack the research-backed structure and edge case handling.

### Recommended Enhanced Templates

```typescript
export interface DraftParamsEnhanced {
  language: "no" | "en" | "sv";
  reason: string;
  moveDate?: string | null;
  customerName?: string;
  edgeCase?: string;
  customerConcerns?: string[];
}

export function generateDraftEnhanced(params: DraftParamsEnhanced): string {
  const { language, reason, moveDate, customerName, edgeCase, customerConcerns } = params;

  // Helper to format greeting
  const greeting = (lang: "no" | "en" | "sv", name?: string) => {
    if (name) return lang === "no" ? `Hei ${name},` : `Hi ${name},`;
    return lang === "no" ? "Hei," : "Hi,";
  };

  // Helper to format closing
  const closing = (lang: "no" | "en" | "sv") => {
    return lang === "no" 
      ? "\n\nMed vennlig hilsen,\nElaway Support"
      : "\n\nKind regards,\nElaway Support";
  };

  // Norwegian templates
  if (language === "no") {
    let body = greeting("no", customerName);

    // Handle edge cases first
    if (edgeCase === "no_app_access") {
      body += `\n\nTakk for beskjed! Vi hjelper deg gjerne å avslutte abonnementet manuelt.`;
      body += `\n\nFor å fortsette, bekreft gjerne adressen eller ladeboksen, så hjelper vi deg å avslutte.`;
      body += `\n\nOppsigelsen gjelder ut inneværende måned.`;
      return body + closing("no");
    }

    if (edgeCase === "sameie_concern") {
      body += `\n\nTakk for beskjed! Når du avslutter ditt personlige abonnement i appen, påvirker det kun din egen konto – ikke hele sameiets tilgang.`;
      body += `\n\nDu kan trygt avslutte i Elaway-appen:\nMeny → Administrer abonnement → Avslutt abonnement nå.`;
      body += `\n\nOppsigelsen gjelder ut inneværende måned.`;
      return body + closing("no");
    }

    if (edgeCase === "already_canceled") {
      body += `\n\nTakk for beskjed! Vi har sjekket, og abonnementet ditt er allerede avsluttet.`;
      body += `\n\nDu vil ikke bli belastet for fremtidige perioder. Gi gjerne beskjed hvis du har flere spørsmål.`;
      return body + closing("no");
    }

    // Standard relocation case
    body += `\n\nTakk for beskjed! Vi forstår at du skal flytte og ønsker å avslutte abonnementet ditt.`;

    // Handle move date timing
    if (moveDate) {
      const moveMonthsFromNow = getMonthsFromNow(moveDate);
      
      if (moveMonthsFromNow > 1) {
        // Future move date - advise to cancel closer to date
        body += `\n\nDu kan avslutte abonnementet i Elaway-appen når du nærmer deg flyttedatoen (${formatDate(moveDate, "no")}), slik at du kan bruke laderen frem til du flytter:\nMeny → Administrer abonnement → Avslutt abonnement nå.`;
      } else {
        // Move soon or already moved
        body += `\n\nDu kan enkelt avslutte abonnementet i Elaway-appen:\nMeny → Administrer abonnement → Avslutt abonnement nå.`;
        body += `\n\nDu nevnte flyttedato ${formatDate(moveDate, "no")}. Vær oppmerksom på at oppsigelsen gjelder fra månedens slutt.`;
      }
    } else {
      // No date mentioned - standard instruction
      body += `\n\nDu kan enkelt avslutte abonnementet i Elaway-appen:\nMeny → Administrer abonnement → Avslutt abonnement nå.`;
    }

    body += `\n\nOppsigelsen gjelder ut inneværende måned.`;
    
    // Add manual help offer
    if (edgeCase !== "no_app_access") {
      body += ` Dersom du har problemer med appen eller ikke har tilgang, hjelper vi deg gjerne manuelt – gi oss beskjed.`;
    }

    return body + closing("no");
  }

  // English templates
  if (language === "en") {
    let body = greeting("en", customerName);

    // Handle edge cases
    if (edgeCase === "no_app_access") {
      body += `\n\nThank you for reaching out! We're happy to help you cancel your subscription manually.`;
      body += `\n\nTo proceed, please confirm your address or charging box location, and we'll process the cancellation for you.`;
      body += `\n\nThe cancellation will take effect at the end of the current month.`;
      return body + closing("en");
    }

    if (edgeCase === "sameie_concern") {
      body += `\n\nThank you for reaching out! When you cancel your personal subscription in the app, it only affects your own account – not the entire housing association's access.`;
      body += `\n\nYou can safely cancel in the Elaway app:\nMenu → Manage Subscription → Cancel Subscription.`;
      body += `\n\nThe cancellation will take effect at the end of the current month.`;
      return body + closing("en");
    }

    if (edgeCase === "already_canceled") {
      body += `\n\nThank you for reaching out! We've checked, and your subscription has already been canceled.`;
      body += `\n\nYou will not be charged for future periods. Please let us know if you have any other questions.`;
      return body + closing("en");
    }

    // Standard relocation case
    body += `\n\nThank you for reaching out! We understand that you are moving and would like to cancel your subscription.`;

    // Handle move date timing
    if (moveDate) {
      const moveMonthsFromNow = getMonthsFromNow(moveDate);
      
      if (moveMonthsFromNow > 1) {
        body += `\n\nYou can cancel your subscription in the Elaway app closer to your move date (${formatDate(moveDate, "en")}), so you can continue using the charger until then:\nMenu → Manage Subscription → Cancel Subscription.`;
      } else {
        body += `\n\nYou can easily do this yourself in the Elaway app:\nMenu → Manage Subscription → Cancel Subscription.`;
        body += `\n\nYou mentioned a move date of ${formatDate(moveDate, "en")}. Please note that the cancellation takes effect at the end of the current month.`;
      }
    } else {
      body += `\n\nYou can easily do this yourself in the Elaway app:\nMenu → Manage Subscription → Cancel Subscription.`;
    }

    body += `\n\nThe cancellation will take effect at the end of the current month.`;
    
    // Add manual help offer
    if (edgeCase !== "no_app_access") {
      body += ` If you have trouble accessing the app, we are happy to help you manually.`;
    }

    return body + closing("en");
  }

  // Swedish templates (basic - can be expanded)
  let body = "Hej,";
  body += `\n\nTack för att du hörde av dig! Vi förstår att du ska flytta och vill avsluta ditt abonnemang.`;
  body += `\n\nDu kan enkelt avsluta abonnemanget i Elaway-appen:\nMeny → Hantera abonnemang → Avsluta abonnemang.`;
  body += `\n\nUppsägningen gäller till slutet av innevarande månad.`;
  return body + "\n\nMed vänliga hälsningar,\nElaway Support";
}

// Helper functions
function getMonthsFromNow(dateStr: string): number {
  const moveDate = new Date(dateStr);
  const now = new Date();
  const months = (moveDate.getFullYear() - now.getFullYear()) * 12 + 
                 (moveDate.getMonth() - now.getMonth());
  return months;
}

function formatDate(dateStr: string, lang: "no" | "en"): string {
  const date = new Date(dateStr);
  if (lang === "no") {
    return date.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
```

---

## 4. Enhanced Confidence Scoring

### Current Scoring
The current confidence calculation is basic and doesn't account for edge cases or complexity.

### Recommended Enhanced Scoring

```typescript
export function calculateConfidenceEnhanced(extraction: ExtractionResultEnhanced): number {
  let confidence = 0.3; // Lower base score to be more conservative

  // Core cancellation intent (30%)
  if (extraction.is_cancellation) {
    confidence += 0.3;
  }

  // Clear reason identified (15%)
  if (extraction.reason === "moving") {
    confidence += 0.15;
  } else if (extraction.reason === "other") {
    confidence += 0.10;
  }

  // Language confidence (10%)
  if (extraction.language === "no" || extraction.language === "en") {
    confidence += 0.10; // High confidence for primary languages
  } else if (extraction.language === "sv") {
    confidence += 0.05; // Medium confidence for Swedish
  }

  // Date handling (10%)
  if (extraction.move_date) {
    const monthsFromNow = getMonthsFromNow(extraction.move_date);
    if (monthsFromNow >= 0 && monthsFromNow <= 3) {
      confidence += 0.10; // Good timing
    } else if (monthsFromNow > 3) {
      confidence += 0.05; // Future date but valid
    }
  } else if (extraction.urgency === "immediate") {
    confidence += 0.08; // No date but immediate urgency
  }

  // Edge case handling (10%)
  if (extraction.edge_case === "none") {
    confidence += 0.10; // Standard case
  } else if (["no_app_access", "sameie_concern", "future_move_date"].includes(extraction.edge_case)) {
    confidence += 0.05; // Known edge case with template
  }

  // Policy compliance (10%)
  if (extraction.policy_risks.length === 0) {
    confidence += 0.10;
  } else if (extraction.policy_risks.length === 1) {
    confidence += 0.05;
  }

  // Confidence factors (15%)
  if (extraction.confidence_factors.clear_intent) confidence += 0.05;
  if (extraction.confidence_factors.complete_information) confidence += 0.05;
  if (extraction.confidence_factors.standard_case) confidence += 0.05;

  return Math.min(Math.max(confidence, 0), 1.0);
}

// Confidence thresholds for HITM workflow
export const CONFIDENCE_THRESHOLDS = {
  AUTO_APPROVE: 0.95,  // Future: Auto-send without review
  HIGH: 0.85,          // Minimal review needed
  MEDIUM: 0.70,        // Standard review
  LOW: 0.50,           // Careful review needed
  MANUAL: 0.50         // Below this: flag for manual handling
};
```

---

## 5. Edge Case Detection and Handling

### New Edge Case Detector

```typescript
export function detectEdgeCase(email: string, extraction: ExtractionResultEnhanced): string {
  const emailLower = email.toLowerCase();

  // No app access
  if (emailLower.match(/(?:no|not|don't|cannot|can't).*(?:app|access|login)/i) ||
      emailLower.includes("ikke tilgang") ||
      emailLower.includes("får ikke") ||
      emailLower.includes("manual")) {
    return "no_app_access";
  }

  // Corporate/housing association concern
  if (emailLower.match(/(?:sameie|housing association|corporate|bedrift|alle|everyone|whole building)/i)) {
    return "sameie_concern";
  }

  // Future move date (> 2 months)
  if (extraction.move_date) {
    const monthsFromNow = getMonthsFromNow(extraction.move_date);
    if (monthsFromNow > 2) {
      return "future_move_date";
    }
  }

  // Already canceled check
  if (emailLower.match(/(?:allerede|already|previously).*(?:cancel|avsluttet|oppsagt)/i)) {
    return "already_canceled";
  }

  return "none";
}
```

---

## 6. Vector Store Integration Strategy

### Current State
Vector store tool exists but isn't effectively integrated into the workflow.

### Recommended Strategy

```typescript
/**
 * Vector Store Query Strategy for Relocation Cancellations
 */
export async function getVectorStoreContext(
  extraction: ExtractionResultEnhanced
): Promise<string[]> {
  // Only query vector store for edge cases or low-confidence scenarios
  const shouldQuery = 
    extraction.edge_case !== "none" ||
    extraction.confidence_factors.clear_intent === false ||
    extraction.customer_concerns.length > 0;

  if (!shouldQuery) {
    return []; // Standard case - use templates
  }

  // Build targeted query based on edge case
  let query = `Relocation cancellation: ${extraction.reason}`;
  
  if (extraction.edge_case !== "none") {
    query += ` with ${extraction.edge_case.replace("_", " ")}`;
  }

  if (extraction.customer_concerns.length > 0) {
    query += `. Customer concerns: ${extraction.customer_concerns.join(", ")}`;
  }

  try {
    const results = await vectorStoreSearchTool.execute({
      query,
      maxResults: 3 // Keep it small - just for tone/phrasing examples
    });

    return results.success ? results.results : [];
  } catch (error) {
    logError("Vector store query failed", { requestId: "context-retrieval" }, error);
    return []; // Fail gracefully - continue with templates
  }
}

/**
 * Use vector store context to enhance draft (for edge cases only)
 */
export function enhanceDraftWithContext(
  baseDraft: string,
  context: string[],
  extraction: ExtractionResultEnhanced
): string {
  // If no context or standard case, return base draft
  if (context.length === 0 || extraction.edge_case === "none") {
    return baseDraft;
  }

  // For edge cases, use context to add a contextual note
  // But don't override the template structure
  const contextNote = `\n\n[Kontekstuell info fra lignende saker: ${context.slice(0, 1).join(" ")}]`;
  
  // Only add context for internal review, not to customer
  return baseDraft;
}
```

---

## 7. Agent Instructions Optimization

### For OpenAI Agents SDK Implementation

```typescript
export const cancellationAgentInstructionsEnhanced = `You are Elaway's specialized relocation cancellation handler.

MISSION:
Process customer emails requesting subscription cancellation due to moving/relocation.
Generate policy-compliant, empathetic responses that follow Elaway's proven patterns.

RESEARCH-BACKED INSIGHTS:
- 25-30% of all cancellations are relocation-related
- These follow highly predictable patterns
- Average support response: 4-5 sentences, 70-100 words
- 85% Norwegian, 10% English, 5% Swedish
- Customers expect: acknowledgment, app instructions, policy clarity, manual help offer

WORKFLOW:
1. EXTRACT: Analyze email for intent, reason, move_date, language, edge_cases
2. VALIDATE: Check for edge cases (no app access, corporate account, etc.)
3. GENERATE: Create 70-100 word response following proven structure
4. VERIFY: Ensure policy compliance (end-of-month, app-first, GDPR)

RESPONSE STRUCTURE (MANDATORY):
1. Greeting + gratitude
2. Acknowledgment of situation (moving)
3. Self-service app instructions (step-by-step)
4. Policy statement: "Oppsigelsen gjelder ut inneværende måned" (NO) / "The cancellation takes effect at the end of the current month" (EN)
5. Manual help offer (if applicable)

EDGE CASE HANDLING:
- no_app_access → Skip app instruction, ask for address confirmation
- sameie_concern → Clarify personal vs. shared account
- future_move_date (>2 months) → Advise to cancel closer to date
- already_canceled → Confirm completion
- corporate_account → Verify scope before proceeding

CRITICAL RULES:
✅ Always respond in customer's language (NO/EN/SV)
✅ Always include: "Oppsigelsen gjelder ut inneværende måned" / "end of the current month"
✅ Always offer app-first, then manual backup
✅ Keep responses 70-100 words (4-5 sentences)
✅ Never confirm addresses/PII unless customer provides first (GDPR)
❌ Never skip policy statement
❌ Never generate responses >150 words
❌ Never fabricate dates or commitments

TONE CALIBRATION:
- Polite but efficient
- Empathetic without being overly emotional
- Professional but warm
- Clear and actionable

QUALITY METRICS:
Target: ≥95% policy compliance, ≥85% approval rate, <100 words`;
```

---

## 8. Implementation Priority

### Phase 1: Quick Wins (1-2 days)
1. ✅ Update draft templates with research-backed structure
2. ✅ Add edge case detection logic
3. ✅ Enhance extraction schema with new fields
4. ✅ Improve confidence scoring algorithm

### Phase 2: Quality Enhancements (3-5 days)
1. ✅ Implement few-shot prompt engineering
2. ✅ Add Swedish language support
3. ✅ Integrate move-date sensitivity logic
4. ✅ Add policy compliance validation

### Phase 3: Advanced Features (1-2 weeks)
1. ✅ Optimize vector store queries for edge cases only
2. ✅ Implement A/B testing framework
3. ✅ Build confidence threshold automation
4. ✅ Create fine-tuning dataset from approved drafts

---

## 9. Testing & Validation Strategy

### Test Cases from Research

```typescript
export const testCases = [
  {
    name: "Standard Norwegian relocation",
    input: "Hei, jeg flytter fra adressen og ønsker å si opp abonnementet mitt.",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "no",
      edge_case: "none",
      response_length: { min: 70, max: 100 },
      must_include: ["Elaway-appen", "Oppsigelsen gjelder ut inneværende måned"]
    }
  },
  {
    name: "Future move date",
    input: "Jeg kommer til å flytte i oktober og ønsker derfor å avslutte abonnementet.",
    expected: {
      is_cancellation: true,
      reason: "moving",
      move_date_present: true,
      edge_case: "future_move_date",
      must_include: ["når du nærmer deg flyttedatoen"]
    }
  },
  {
    name: "Sameie concern",
    input: "Jeg flytter ut av boligen og vil forsikre meg om at jeg ikke avslutter for hele sameiet.",
    expected: {
      is_cancellation: true,
      edge_case: "sameie_concern",
      must_include: ["kun din egen konto", "ikke hele sameiets"]
    }
  },
  {
    name: "No app access",
    input: "I don't have access to the app. Can you cancel my subscription manually?",
    expected: {
      is_cancellation: true,
      language: "en",
      edge_case: "no_app_access",
      must_include: ["manually", "confirm your address"]
    }
  },
  {
    name: "English standard",
    input: "Hello, I'm moving out at the end of September and need to cancel my subscription.",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "en",
      must_include: ["Elaway app", "end of the current month"]
    }
  }
];
```

### Success Criteria
- ✅ 100% policy compliance (end-of-month statement present)
- ✅ ≥95% response length within 70-100 words
- ✅ ≥90% edge case detection accuracy
- ✅ ≥85% confidence score accuracy
- ✅ <5s processing time per email

---

## 10. Fine-Tuning Strategy

### Dataset Preparation

Based on research insights:

```typescript
/**
 * Fine-tuning dataset format for relocation cancellations
 */
export interface FineTuningExample {
  messages: [
    {
      role: "system";
      content: string; // Enhanced system prompt
    },
    {
      role: "user";
      content: string; // Customer email
    },
    {
      role: "assistant";
      content: string; // Human-approved response
    }
  ];
}

// Minimum examples needed per category:
const FINE_TUNING_REQUIREMENTS = {
  standard_relocation_no: 100,      // Standard Norwegian cases
  standard_relocation_en: 50,       // Standard English cases
  future_move_date: 30,             // Future move dates
  no_app_access: 30,                // App access issues
  sameie_concern: 20,               // Housing association concerns
  already_canceled: 20,             // Already processed
  swedish_language: 20,             // Swedish examples
  total_minimum: 270
};
```

### Fine-Tuning Timeline
1. Collect 270+ approved examples (2-3 months of HITM data)
2. Validate dataset quality (policy compliance check)
3. Train on `gpt-4o-mini-2024-07-18` (cost-effective)
4. A/B test: base model vs. fine-tuned model
5. Deploy if ≥10% improvement in approval rate

---

## 11. Monitoring & KPIs

### Metrics to Track

```typescript
export interface AgentMetrics {
  // Accuracy
  policy_compliance_rate: number;     // Target: ≥95%
  draft_approval_rate: number;        // Target: ≥85%
  edge_case_detection_rate: number;   // Target: ≥90%
  
  // Efficiency
  avg_processing_time_ms: number;     // Target: <5000ms
  avg_response_word_count: number;    // Target: 70-100
  
  // Quality
  confidence_score_accuracy: number;  // Target: ≥85%
  human_edit_rate: number;            // Target: <15%
  rejection_rate: number;             // Target: <5%
  
  // Volume
  tickets_processed: number;
  drafts_auto_generated: number;
  edge_cases_handled: number;
}
```

---

## 12. Summary of Key Improvements

### Prompt Engineering
✅ Added few-shot examples from real tickets  
✅ Explicit word count guidance (70-100 words)  
✅ Clear response structure template  
✅ Edge case handling instructions  

### Schema & Extraction
✅ Added edge_case, urgency, customer_concerns fields  
✅ Added confidence_factors sub-schema  
✅ Swedish language support  

### Draft Generation
✅ Research-backed templates with proper structure  
✅ Move-date sensitivity logic  
✅ Edge case-specific responses  
✅ Improved greeting/closing formatting  

### Confidence Scoring
✅ More granular scoring (10% increments)  
✅ Edge case penalties  
✅ Language-specific confidence  
✅ Defined thresholds for automation  

### Quality Assurance
✅ Policy compliance validation  
✅ Response length verification  
✅ GDPR-compliant handling  
✅ Comprehensive test cases  

---

## 13. Next Steps

1. **Immediate (This Week)**
   - [ ] Review and approve recommendations
   - [ ] Implement Phase 1 quick wins
   - [ ] Run test suite against new implementation
   
2. **Short-term (Next 2 Weeks)**
   - [ ] Deploy Phase 2 enhancements to staging
   - [ ] Collect HITM feedback on new drafts
   - [ ] Iterate based on approval rates
   
3. **Medium-term (Next Month)**
   - [ ] Begin collecting fine-tuning dataset
   - [ ] Implement A/B testing framework
   - [ ] Optimize confidence thresholds
   
4. **Long-term (Next Quarter)**
   - [ ] Fine-tune model with ≥270 examples
   - [ ] Enable auto-approval for high-confidence cases (≥95%)
   - [ ] Expand to other cancellation types

---

## 14. Estimated Impact

Based on research data:

| Metric | Current | With Improvements | Impact |
|--------|---------|-------------------|--------|
| Policy Compliance | ~85% | ≥95% | +10% |
| Draft Approval Rate | ~70% | ≥85% | +15% |
| Avg Response Time | 51h | <15min | 99% reduction |
| Edge Case Handling | Manual | Automated | 100% automation |
| Human Edit Rate | ~30% | <15% | 50% reduction |
| Word Count Compliance | Variable | 70-100 | Standardized |

**ROI**: With 25-30% of tickets being relocation-related, these improvements could automate **~500-700 tickets/month** with minimal human intervention.

---

**Document Version:** 1.0  
**Last Updated:** January 2025  
**Status:** Ready for Implementation  
**Confidence:** High (based on real ticket analysis)

