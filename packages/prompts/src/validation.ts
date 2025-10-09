/**
 * Policy Validation Module
 * 
 * Validates that generated drafts comply with Elaway's policies:
 * - End-of-month cancellation policy
 * - Self-service app instructions
 * - Polite, professional tone
 * - Appropriate response length
 */

export interface PolicyValidation {
  compliant: boolean;
  checks: {
    has_end_of_month_policy: boolean;
    has_self_service_instructions: boolean;
    has_polite_tone: boolean;
    appropriate_length: boolean;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Validate that a draft response complies with company policies
 */
export function validatePolicyCompliance(
  draftText: string,
  language: "no" | "en" | "sv",
  edgeCase?: string
): PolicyValidation {
  const checks = {
    has_end_of_month_policy:
      language === "no"
        ? draftText.includes("utgangen av måneden") || draftText.includes("inneværende måned")
        : language === "sv"
        ? (draftText.includes("slutet av") && draftText.includes("månad"))
        : draftText.includes("end of the month") || draftText.includes("current month"),
    
    has_self_service_instructions: 
      draftText.toLowerCase().includes("app"),
    
    has_polite_tone:
      language === "no"
        ? draftText.includes("takk") || draftText.includes("vennlig")
        : language === "sv"
        ? draftText.includes("tack") || draftText.includes("hälsningar")
        : draftText.includes("thank you") || draftText.includes("regards"),
    
    appropriate_length: 
      draftText.split(/\s+/).filter(w => w.length > 0).length >= 30 && 
      draftText.split(/\s+/).filter(w => w.length > 0).length <= 150
  };

  const errors: string[] = [];
  const warnings: string[] = [];

  // Policy statement not required for "already_canceled" edge case
  if (!checks.has_end_of_month_policy && edgeCase !== "already_canceled") {
    errors.push("Missing required end-of-month policy statement");
  }
  
  // App instructions not required for "no_app_access" edge case
  if (!checks.has_self_service_instructions && edgeCase !== "no_app_access" && edgeCase !== "already_canceled") {
    warnings.push("Missing self-service app instructions");
  }
  
  if (!checks.has_polite_tone) {
    warnings.push("Response may lack polite tone");
  }
  
  if (!checks.appropriate_length) {
    const wordCount = draftText.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 30) {
      warnings.push(`Response too short: ${wordCount} words (minimum: 30)`);
    } else if (wordCount > 150) {
      warnings.push(`Response too long: ${wordCount} words (maximum: 150)`);
    }
  }

  return {
    compliant: errors.length === 0,
    checks,
    errors,
    warnings
  };
}

/**
 * Check if a draft contains PII that should have been masked
 */
export function containsPII(text: string): boolean {
  // Check for email patterns
  if (text.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i)) {
    return true;
  }
  
  // Check for phone patterns
  if (text.match(/\+?\d[\d\s().-]{7,}\d/)) {
    return true;
  }
  
  // Check for address patterns (very basic)
  if (text.match(/\b\d{1,4}\s+\w+\s+(Street|St|Road|Rd|Ave|Avenue|Gate|Gata)\b/i)) {
    return true;
  }
  
  return false;
}

/**
 * Validate response quality metrics
 */
export interface QualityMetrics {
  word_count: number;
  sentence_count: number;
  avg_sentence_length: number;
  has_greeting: boolean;
  has_closing: boolean;
  readability_ok: boolean;
}

export function calculateQualityMetrics(draftText: string, language: "no" | "en" | "sv"): QualityMetrics {
  const words = draftText.split(/\s+/).filter(w => w.length > 0);
  const sentences = draftText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const greetings = language === "no" ? ["hei", "hallo", "god dag"] : 
                   language === "sv" ? ["hej", "hallo"] :
                   ["hi", "hello", "dear"];
  
  const closings = language === "no" ? ["hilsen", "mvh", "vennlig hilsen"] :
                  language === "sv" ? ["hälsningar", "mvh"] :
                  ["regards", "sincerely", "best"];
  
  const hasGreeting = greetings.some(g => draftText.toLowerCase().includes(g));
  const hasClosing = closings.some(c => draftText.toLowerCase().includes(c));
  
  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
  
  // Readability: sentences should be 10-25 words on average for good readability
  const readabilityOk = avgSentenceLength >= 10 && avgSentenceLength <= 25;
  
  return {
    word_count: words.length,
    sentence_count: sentences.length,
    avg_sentence_length: avgSentenceLength,
    has_greeting: hasGreeting,
    has_closing: hasClosing,
    readability_ok: readabilityOk
  };
}

