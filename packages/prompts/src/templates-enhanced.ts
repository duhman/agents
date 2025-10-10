/**
 * Enhanced Prompt Templates - Based on High-Volume Ticket Research
 * 
 * Research insights:
 * - 25-30% of cancellations are relocation-related
 * - Highly predictable patterns (4-5 sentences, 70-100 words)
 * - 85% Norwegian, 10% English, 5% Swedish
 * - Clear edge cases require specific handling
 * 
 * @see @documentation/project/research/elaway_relocation_cancellation_research.md
 */

import { z } from "zod";

// ============================================================================
// ENHANCED EXTRACTION SCHEMA
// ============================================================================

export const extractionSchemaEnhanced = z.object({
  // Core fields
  is_cancellation: z.boolean().describe("True if customer is requesting subscription cancellation"),
  reason: z.enum(["moving", "payment_issue", "other", "unknown"]).describe("Reason for cancellation"),
  move_date: z.string().date().optional().nullable().describe("Move date in ISO format if mentioned"),
  language: z.enum(["no", "en", "sv"]).describe("Detected language (Norwegian, English, Swedish)"),
  
  // Enhanced fields from research
  edge_case: z.enum([
    "none",
    "no_app_access",
    "corporate_account",
    "future_move_date",
    "already_canceled",
    "sameie_concern",
    "payment_dispute"
  ]).describe("Identified edge case requiring special handling"),
  
  // Payment issue support
  has_payment_issue: z.boolean().describe("True if email mentions payment problems, billing issues, refunds, or charges"),
  payment_concerns: z.array(z.string()).default([]).describe("Specific payment issues mentioned"),
  
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

// ============================================================================
// ENHANCED SYSTEM PROMPTS WITH FEW-SHOT EXAMPLES
// ============================================================================

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

// ============================================================================
// ENHANCED DRAFT GENERATION
// ============================================================================

export interface DraftParamsEnhanced {
  language: "no" | "en" | "sv";
  reason: string;
  moveDate?: string | null;
  customerName?: string;
  edgeCase?: string;
  customerConcerns?: string[];
  hasPaymentIssue?: boolean;
  paymentConcerns?: string[];
  ragContext?: string[];
}

/**
 * Helper: Calculate months from now
 */
function getMonthsFromNow(dateStr: string): number {
  const moveDate = new Date(dateStr);
  const now = new Date();
  const months = (moveDate.getFullYear() - now.getFullYear()) * 12 + 
                 (moveDate.getMonth() - now.getMonth());
  return months;
}

/**
 * Helper: Format date for display
 */
function formatDate(dateStr: string, lang: "no" | "en"): string {
  const date = new Date(dateStr);
  if (lang === "no") {
    return date.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/**
 * Enhanced draft generation with research-backed templates
 * 
 * Target: 4-5 sentences, 70-100 words
 * Structure: Greeting → Acknowledgment → Instructions → Policy → Closing
 */
export function generateDraftEnhanced(params: DraftParamsEnhanced): string {
  const { language, reason, moveDate, customerName, edgeCase, customerConcerns, hasPaymentIssue, paymentConcerns, ragContext } = params;
  
  // Generate base template
  let draft = generateBaseTemplate(params);
  
  // If RAG context available, enhance with context
  if (ragContext && ragContext.length > 0) {
    draft = enhanceDraftWithRagContext(draft, ragContext, params);
  }
  
  return draft;
}

function generateBaseTemplate(params: DraftParamsEnhanced): string {
  const { language, reason, moveDate, customerName, edgeCase, customerConcerns, hasPaymentIssue, paymentConcerns } = params;

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

  // ========== NORWEGIAN TEMPLATES ==========
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

    // Handle payment issues
    if (hasPaymentIssue) {
      body += `\n\nTakk for beskjed! Vi forstår at du har spørsmål angående fakturering eller betaling.`;
    } else {
      // Standard relocation case
      body += `\n\nTakk for beskjed! Vi forstår at du skal flytte og ønsker å avslutte abonnementet ditt.`;
    }

    // Handle move date timing
    if (moveDate) {
      const moveMonthsFromNow = getMonthsFromNow(moveDate);
      
      if (moveMonthsFromNow > 1) {
        // Future move date - advise to cancel closer to date
        body += `\n\nDu kan avslutte abonnementet i Elaway-appen når du nærmer deg flyttedatoen (${formatDate(moveDate, "no")}), slik at du kan bruke laderen frem til du flytter:\nMeny → Administrer abonnement → Avslutt abonnement nå.`;
      } else {
        // Move soon or already moved
        body += `\n\nDu kan enkelt avslutte abonnementet i Elaway-appen:\nMeny → Administrer abonnement → Avslutt abonnement nå.`;
        if (moveMonthsFromNow >= 0) {
          body += `\n\nDu nevnte flyttedato ${formatDate(moveDate, "no")}. Vær oppmerksom på at oppsigelsen gjelder fra månedens slutt.`;
        }
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

  // ========== ENGLISH TEMPLATES ==========
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

    // Handle payment issues
    if (hasPaymentIssue) {
      body += `\n\nThank you for reaching out! We understand you have questions about billing or payment.`;
    } else {
      // Standard relocation case
      body += `\n\nThank you for reaching out! We understand that you are moving and would like to cancel your subscription.`;
    }

    // Handle move date timing
    if (moveDate) {
      const moveMonthsFromNow = getMonthsFromNow(moveDate);
      
      if (moveMonthsFromNow > 1) {
        body += `\n\nYou can cancel your subscription in the Elaway app closer to your move date (${formatDate(moveDate, "en")}), so you can continue using the charger until then:\nMenu → Manage Subscription → Cancel Subscription.`;
      } else {
        body += `\n\nYou can easily do this yourself in the Elaway app:\nMenu → Manage Subscription → Cancel Subscription.`;
        if (moveMonthsFromNow >= 0) {
          body += `\n\nYou mentioned a move date of ${formatDate(moveDate, "en")}. Please note that the cancellation takes effect at the end of the current month.`;
        }
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

  // ========== SWEDISH TEMPLATES (Basic) ==========
  let body = "Hej,";
  body += `\n\nTack för att du hörde av dig! Vi förstår att du ska flytta och vill avsluta ditt abonnemang.`;
  body += `\n\nDu kan enkelt avsluta abonnemanget i Elaway-appen:\nMeny → Hantera abonnemang → Avsluta abonnemang.`;
  body += `\n\nUppsägningen gäller till slutet av innevarande månad.`;
  
  if (edgeCase !== "no_app_access") {
    body += ` Om du har problem med appen är vi glada att hjälpa dig manuellt.`;
  }
  
  return body + "\n\nMed vänliga hälsningar,\nElaway Support";
}

// ============================================================================
// ENHANCED CONFIDENCE SCORING
// ============================================================================

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

// ============================================================================
// EDGE CASE DETECTION
// ============================================================================

export function detectEdgeCase(email: string, extraction: Partial<ExtractionResultEnhanced>): string {
  const emailLower = email.toLowerCase();

  // No app access
  if (emailLower.match(/(?:no|not|don't|cannot|can't|har ikke).*(?:app|access|login|tilgang)/i) ||
      emailLower.includes("ikke tilgang") ||
      emailLower.includes("får ikke") ||
      emailLower.includes("manual")) {
    return "no_app_access";
  }

  // Corporate/housing association concern
  if (emailLower.match(/(?:sameie|housing association|corporate|bedrift|alle|everyone|whole building|hele sameiet)/i)) {
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
  if (emailLower.match(/(?:allerede|already|previously).*(?:cancel|avsluttet|oppsagt|terminated)/i)) {
    return "already_canceled";
  }

  return "none";
}

// ============================================================================
// EXTRACTION PROMPT (Enhanced)
// ============================================================================

export const extractionPromptEnhanced = (email: string) => `Analyze this customer email and extract structured information:

REQUIRED FIELDS:
- is_cancellation: true if requesting subscription cancellation
- reason: "moving" (relocating), "other" (different reason), "unknown" (unclear)
- move_date: ISO date (YYYY-MM-DD) if mentioned, null otherwise
- language: "no" (Norwegian), "en" (English), "sv" (Swedish)
- edge_case: Identify special cases:
  * "no_app_access" - Customer mentions inability to access app
  * "sameie_concern" - Worried about canceling for entire building/association
  * "future_move_date" - Moving more than 2 months in future
  * "already_canceled" - Believes cancellation already processed
  * "none" - Standard case
- urgency: "immediate", "future", or "unclear"
- customer_concerns: Array of specific concerns/questions raised
- policy_risks: Array of ambiguities (dates, unclear intent, etc.)
- confidence_factors:
  * clear_intent: Is the cancellation request unambiguous?
  * complete_information: Is all necessary info provided?
  * standard_case: Is this a straightforward case?

EMAIL:
${email}

Analyze carefully and extract all fields accurately.`;

// ============================================================================
// RAG CONTEXT ENHANCEMENT
// ============================================================================

function enhanceDraftWithRagContext(
  baseDraft: string,
  context: string[],
  params: DraftParamsEnhanced
): string {
  // For payment issues, add specific guidance from real examples
  if (params.hasPaymentIssue && context.length > 0) {
    const paymentGuidance = extractPaymentGuidance(context[0]);
    if (paymentGuidance) {
      baseDraft += `\n\n${paymentGuidance}`;
    }
  }
  
  // For edge cases, adapt tone from similar cases
  if (params.edgeCase !== "none" && context.length > 0) {
    // Use context to inform phrasing (not copy verbatim)
    baseDraft = adaptToneFromContext(baseDraft, context[0], params.language);
  }
  
  return baseDraft;
}

function extractPaymentGuidance(context: string): string | null {
  // Extract payment-related guidance from RAG context
  const lower = context.toLowerCase();
  
  if (lower.includes('refund') || lower.includes('refusjon') || lower.includes('återbetalning')) {
    return "Vi vil sjekke betalingshistorikken din og ordne eventuelle refusjoner.";
  }
  
  if (lower.includes('double') || lower.includes('dobbel') || lower.includes('dubbel')) {
    return "Vi ser at det kan være et dobbelt trekk. Vi vil undersøke dette umiddelbart.";
  }
  
  return null;
}

function adaptToneFromContext(baseDraft: string, context: string, language: string): string {
  // Adapt the tone based on successful examples from similar cases
  const lower = context.toLowerCase();
  
  // If the context shows a particularly empathetic response, enhance the draft
  if (lower.includes('beklager') || lower.includes('sorry') || lower.includes('ursäkta')) {
    if (language === "no") {
      return baseDraft.replace("Takk for beskjed", "Takk for beskjed, og beklager eventuelle ulemper");
    } else if (language === "en") {
      return baseDraft.replace("Thank you for reaching out", "Thank you for reaching out, and we apologize for any inconvenience");
    } else if (language === "sv") {
      return baseDraft.replace("Tack för att du hörde av dig", "Tack för att du hörde av dig, och vi ber om ursäkt för eventuella olägenheter");
    }
  }
  
  return baseDraft;
}


