/**
 * RAG Context Retrieval for Enhanced Draft Generation
 *
 * Provides contextual information from vector store for edge cases and payment issues
 * to improve draft quality using real customer support conversations.
 */

import "dotenv/config";
import { logInfo, logError, logWarn, type LogContext } from "@agents/core";
import OpenAI from "openai";
import type { ExtractionResultEnhanced } from "@agents/prompts";

// Direct wrapper for vector store search to bypass SDK invoke wrapper
async function searchVectorStoreDirect(
  query: string,
  maxResults: number
): Promise<{
  success: boolean;
  results: string[];
  vector_store_id?: string;
  message?: string;
}> {
  try {
    const vectorStoreId = process.env.OPENAI_VECTOR_STORE_ID;

    if (!vectorStoreId) {
      logError(
        "Vector store ID not configured",
        { requestId: "tool-execution" },
        new Error("Missing OPENAI_VECTOR_STORE_ID")
      );
      return {
        success: false,
        results: [],
        message: "OPENAI_VECTOR_STORE_ID is not set"
      };
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Use Assistants API with file_search tool attached to the vector store
    const assistant = await openai.beta.assistants.create({
      model: "gpt-4o-2024-08-06",
      instructions: `Return up to ${maxResults} short bullet snippets from the most relevant HubSpot tickets for this query. Each snippet should be concise and directly useful for drafting a reply.`,
      tools: [{ type: "file_search" }],
      tool_resources: {
        file_search: {
          vector_store_ids: [vectorStoreId]
        }
      }
    });

    // Create a thread and run the assistant
    const thread = await openai.beta.threads.create({
      messages: [{
        role: "user",
        content: query
      }]
    });

    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });

    // Get the messages from the thread
    const messages = await openai.beta.threads.messages.list(thread.id);
    const response = messages.data[0];

    // Extract text output from the assistant response
    let outputText: string = "";
    if (response?.content && response.content[0]?.type === "text") {
      outputText = response.content[0].text.value;
    }

    const results = outputText
      .split(/\n+/)
      .filter((line: string) => line.trim().length > 0)
      .slice(0, maxResults);

    logInfo(
      "Vector store search completed",
      { requestId: "tool-execution" },
      { query, resultsCount: results.length, vectorStoreId }
    );

    return {
      success: true,
      results,
      vector_store_id: vectorStoreId
    };
  } catch (error: any) {
    logError("Vector store search failed", { requestId: "tool-execution" }, error);
    throw new Error(`Vector store search failed: ${error.message}`);
  }
}

/**
 * Get vector store context for enhanced draft generation
 * Only queries vector store for edge cases, payment issues, or unclear scenarios
 */
export async function getVectorStoreContext(
  extraction: ExtractionResultEnhanced,
  logContext: LogContext
): Promise<string[]> {
  // Only query for edge cases, payment issues, or unclear scenarios
  const shouldQuery =
    extraction.edge_case !== "none" ||
    (extraction as any).has_payment_issue ||
    !extraction.confidence_factors.clear_intent ||
    extraction.customer_concerns.length > 0;

  if (!shouldQuery) {
    logInfo("Standard case detected - skipping vector store query", logContext);
    return []; // Standard case - use templates
  }

  // Build targeted query based on extraction results
  let query = buildTargetedQuery(extraction);

  logInfo("Querying vector store for context", logContext, {
    query: query.substring(0, 100) + "...",
    edgeCase: extraction.edge_case,
    hasPaymentIssue: extraction.has_payment_issue,
    customerConcerns: extraction.customer_concerns.length
  });

  const startTime = Date.now();

  try {
    // Use direct wrapper to bypass SDK invoke wrapper
    const results = await searchVectorStoreDirect(query, 3);

    const duration = Date.now() - startTime;

    if (results.success && results.results.length > 0) {
      logInfo("Vector store query successful", logContext, {
        resultsCount: results.results.length,
        duration,
        vectorStoreId: results.vector_store_id
      });

      return results.results;
    } else {
      logWarn("Vector store query returned no results", logContext, {
        duration,
        query: query.substring(0, 100) + "..."
      });
      return [];
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError("Vector store query failed", { ...logContext, duration }, error);
    return []; // Fail gracefully - continue with templates
  }
}

/**
 * Build a targeted query based on extraction results
 */
function buildTargetedQuery(extraction: ExtractionResultEnhanced): string {
  let query = `Cancellation request: ${extraction.reason}`;

  // Add payment issue context
  if ((extraction as any).has_payment_issue) {
    query += " with payment or billing concern";

    if ((extraction as any).payment_concerns && (extraction as any).payment_concerns.length > 0) {
      query += `. Payment issues: ${(extraction as any).payment_concerns.join(", ")}`;
    }
  }

  // Add edge case context
  if (extraction.edge_case !== "none") {
    query += ` ${extraction.edge_case.replace("_", " ")}`;
  }

  // Add customer concerns
  if (extraction.customer_concerns.length > 0) {
    query += `. Customer concerns: ${extraction.customer_concerns.join(", ")}`;
  }

  // Add language context
  if (extraction.language !== "no") {
    query += ` in ${extraction.language === "en" ? "English" : "Swedish"}`;
  }

  // Add urgency context
  if (extraction.urgency === "immediate") {
    query += " urgent";
  }

  return query;
}

/**
 * Extract relevant guidance from RAG context for payment issues
 */
export function extractPaymentGuidanceFromContext(
  context: string[],
  language: string
): string | null {
  if (context.length === 0) return null;

  const firstContext = context[0].toLowerCase();

  // Look for refund patterns
  if (
    firstContext.includes("refund") ||
    firstContext.includes("refusjon") ||
    firstContext.includes("återbetalning")
  ) {
    if (language === "no") {
      return "Vi vil sjekke betalingshistorikken din og ordne eventuelle refusjoner.";
    } else if (language === "en") {
      return "We will check your payment history and arrange any necessary refunds.";
    } else if (language === "sv") {
      return "Vi kommer att kontrollera din betalningshistorik och ordna eventuella återbetalningar.";
    }
  }

  // Look for double charge patterns
  if (
    firstContext.includes("double") ||
    firstContext.includes("dobbel") ||
    firstContext.includes("dubbel")
  ) {
    if (language === "no") {
      return "Vi ser at det kan være et dobbelt trekk. Vi vil undersøke dette umiddelbart.";
    } else if (language === "en") {
      return "We see there may be a double charge. We will investigate this immediately.";
    } else if (language === "sv") {
      return "Vi ser att det kan vara en dubbel dragning. Vi kommer att undersöka detta omedelbart.";
    }
  }

  // Look for billing error patterns
  if (
    firstContext.includes("feil") ||
    firstContext.includes("error") ||
    firstContext.includes("fel")
  ) {
    if (language === "no") {
      return "Vi vil sjekke faktureringssystemet for eventuelle feil og rette opp i dette.";
    } else if (language === "en") {
      return "We will check the billing system for any errors and correct this.";
    } else if (language === "sv") {
      return "Vi kommer att kontrollera faktureringssystemet för eventuella fel och korrigera detta.";
    }
  }

  return null;
}

/**
 * Extract tone guidance from RAG context for edge cases
 */
export function extractToneGuidanceFromContext(
  context: string[],
  language: string
): { empathetic: boolean; apologetic: boolean; urgent: boolean } {
  if (context.length === 0) {
    return { empathetic: false, apologetic: false, urgent: false };
  }

  const firstContext = context[0].toLowerCase();

  const empathetic =
    firstContext.includes("forstår") ||
    firstContext.includes("understand") ||
    firstContext.includes("förstår") ||
    firstContext.includes("empati") ||
    firstContext.includes("empathy");

  const apologetic =
    firstContext.includes("beklager") ||
    firstContext.includes("sorry") ||
    firstContext.includes("ursäkta") ||
    firstContext.includes("apologize") ||
    firstContext.includes("ber om ursäkt");

  const urgent =
    firstContext.includes("umiddelbart") ||
    firstContext.includes("immediately") ||
    firstContext.includes("omedelbart") ||
    firstContext.includes("asap") ||
    firstContext.includes("hastverk");

  return { empathetic, apologetic, urgent };
}

/**
 * Enhance draft with RAG context insights
 */
export function enhanceDraftWithRagInsights(
  baseDraft: string,
  context: string[],
  extraction: ExtractionResultEnhanced
): string {
  if (context.length === 0) {
    return baseDraft;
  }

  let enhancedDraft = baseDraft;

  // Add payment guidance if applicable
  if ((extraction as any).has_payment_issue) {
    const paymentGuidance = extractPaymentGuidanceFromContext(context, extraction.language);
    if (paymentGuidance) {
      enhancedDraft += `\n\n${paymentGuidance}`;
    }
  }

  // Adapt tone based on context
  const toneGuidance = extractToneGuidanceFromContext(context, extraction.language);

  if (
    toneGuidance.apologetic &&
    !enhancedDraft.toLowerCase().includes("beklager") &&
    !enhancedDraft.toLowerCase().includes("sorry")
  ) {
    if (extraction.language === "no") {
      enhancedDraft = enhancedDraft.replace(
        "Takk for din henvendelse",
        "Takk for din henvendelse, og beklager eventuelle ulemper"
      );
    } else if (extraction.language === "en") {
      enhancedDraft = enhancedDraft.replace(
        "Thank you for contacting us",
        "Thank you for contacting us, and we apologize for any inconvenience"
      );
    } else if (extraction.language === "sv") {
      enhancedDraft = enhancedDraft.replace(
        "Tack för att du kontaktar oss",
        "Tack för att du kontaktar oss, och vi ber om ursäkt för eventuella olägenheter"
      );
    }
  }

  if (
    toneGuidance.empathetic &&
    !enhancedDraft.toLowerCase().includes("forstår") &&
    !enhancedDraft.toLowerCase().includes("understand")
  ) {
    if (extraction.language === "no") {
      enhancedDraft = enhancedDraft.replace("Vi forstår", "Vi forstår og sympatiserer med");
    } else if (extraction.language === "en") {
      enhancedDraft = enhancedDraft.replace("We understand", "We understand and sympathize with");
    } else if (extraction.language === "sv") {
      enhancedDraft = enhancedDraft.replace("Vi förstår", "Vi förstår och sympatiserar med");
    }
  }

  return enhancedDraft;
}

/**
 * Get context summary for logging and metrics
 */
export function getContextSummary(context: string[]): {
  hasContext: boolean;
  contextCount: number;
  avgContextLength: number;
  containsPaymentGuidance: boolean;
  containsToneGuidance: boolean;
} {
  if (context.length === 0) {
    return {
      hasContext: false,
      contextCount: 0,
      avgContextLength: 0,
      containsPaymentGuidance: false,
      containsToneGuidance: false
    };
  }

  const avgContextLength = context.reduce((sum, ctx) => sum + ctx.length, 0) / context.length;
  const combinedContext = context.join(" ").toLowerCase();

  const containsPaymentGuidance =
    combinedContext.includes("refund") ||
    combinedContext.includes("refusjon") ||
    combinedContext.includes("återbetalning") ||
    combinedContext.includes("double") ||
    combinedContext.includes("dobbel") ||
    combinedContext.includes("dubbel");

  const containsToneGuidance =
    combinedContext.includes("beklager") ||
    combinedContext.includes("sorry") ||
    combinedContext.includes("ursäkta") ||
    combinedContext.includes("forstår") ||
    combinedContext.includes("understand") ||
    combinedContext.includes("förstår");

  return {
    hasContext: true,
    contextCount: context.length,
    avgContextLength,
    containsPaymentGuidance,
    containsToneGuidance
  };
}
