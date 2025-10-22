/**
 * Test Cases from Research
 *
 * Based on real ticket patterns from research analysis
 */

export interface TestCase {
  name: string;
  input: string;
  expected: {
    is_cancellation: boolean;
    reason?: "moving" | "other" | "unknown";
    language: "no" | "en" | "sv";
    edge_case?: string;
    move_date_present?: boolean;
    response_validation: {
      min_words: number;
      max_words: number;
      must_include: string[];
      must_not_include?: string[];
    };
  };
}

export const researchBasedTestCases: TestCase[] = [
  // ========== STANDARD NORWEGIAN CASES ==========
  {
    name: "Standard Norwegian relocation - short direct",
    input: "Hei, jeg flytter fra adressen og ønsker å si opp abonnementet mitt.",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "no",
      edge_case: "none",
      response_validation: {
        min_words: 70,
        max_words: 100,
        must_include: [
          "Elaway-appen",
          "Oppsigelsen gjelder ut inneværende måned",
          "Meny",
          "Administrer abonnement"
        ]
      }
    }
  },
  {
    name: "Slightly formal Norwegian",
    input:
      "Det har blitt endringer på parkeringsplass, jeg ønsker å avslutte mitt abonnement fra 1. mars.",
    expected: {
      is_cancellation: true,
      reason: "other",
      language: "no",
      move_date_present: true,
      response_validation: {
        min_words: 70,
        max_words: 100,
        must_include: ["Elaway-appen", "Oppsigelsen gjelder ut inneværende måned"]
      }
    }
  },
  {
    name: "Apologetic/polite Norwegian",
    input:
      "Hei, jeg kommer til å flytte i oktober og ønsker derfor å avslutte abonnementet. Takk for hjelpen.",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "no",
      edge_case: "future_move_date",
      move_date_present: true,
      response_validation: {
        min_words: 60,
        max_words: 100,
        must_include: [
          "oktober",
          "nærmer deg flyttedatoen",
          "Oppsigelsen gjelder ut inneværende måned"
        ]
      }
    }
  },

  // ========== EDGE CASE: SAMEIE CONCERN ==========
  {
    name: "Sameie (housing association) concern",
    input:
      "Jeg flytter ut av boligen og vil forsikre meg om at jeg ikke avslutter for hele sameiet.",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "no",
      edge_case: "sameie_concern",
      response_validation: {
        min_words: 60,
        max_words: 100,
        must_include: [
          "kun din egen konto",
          "ikke hele sameiets",
          "Oppsigelsen gjelder ut inneværende måned"
        ]
      }
    }
  },

  // ========== STANDARD ENGLISH CASES ==========
  {
    name: "Standard English relocation",
    input:
      "Hello, I'm moving out at the end of September and need to cancel my subscription from October.",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "en",
      edge_case: "none",
      move_date_present: true,
      response_validation: {
        min_words: 70,
        max_words: 100,
        must_include: ["Elaway app", "end of the current month", "Menu", "Manage Subscription"]
      }
    }
  },
  {
    name: "English - future move inquiry",
    input: "I will be moving in November. How do I cancel my subscription?",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "en",
      edge_case: "future_move_date",
      move_date_present: true,
      response_validation: {
        min_words: 60,
        max_words: 100,
        must_include: ["November", "closer to your move date", "end of the current month"]
      }
    }
  },

  // ========== EDGE CASE: NO APP ACCESS ==========
  {
    name: "No app access - English",
    input: "I don't have access to the app. Can you cancel my subscription manually?",
    expected: {
      is_cancellation: true,
      reason: "unknown",
      language: "en",
      edge_case: "no_app_access",
      response_validation: {
        min_words: 50,
        max_words: 90,
        must_include: ["manually", "confirm your address", "end of the current month"],
        must_not_include: ["Elaway app", "Menu"]
      }
    }
  },
  {
    name: "No app access - Norwegian",
    input: "Jeg har ikke tilgang til appen. Kan dere avslutte abonnementet manuelt?",
    expected: {
      is_cancellation: true,
      reason: "unknown",
      language: "no",
      edge_case: "no_app_access",
      response_validation: {
        min_words: 50,
        max_words: 90,
        must_include: ["manuelt", "bekreft", "Oppsigelsen gjelder ut inneværende måned"],
        must_not_include: ["Elaway-appen", "Meny"]
      }
    }
  },

  // ========== SWEDISH EXAMPLES ==========
  {
    name: "Swedish standard relocation",
    input: "Hej, jag ska flytta och vill avsluta mitt abonnemang. Hur gör jag det?",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "sv",
      edge_case: "none",
      response_validation: {
        min_words: 60,
        max_words: 100,
        must_include: ["Elaway-appen", "slutet av innevarande månad"]
      }
    }
  },

  // ========== EDGE CASE: ALREADY CANCELED ==========
  {
    name: "Already canceled - checking status",
    input: "I think I already canceled my subscription last week. Can you confirm?",
    expected: {
      is_cancellation: true,
      reason: "unknown",
      language: "en",
      edge_case: "already_canceled",
      response_validation: {
        min_words: 40,
        max_words: 80,
        must_include: ["already", "canceled"]
      }
    }
  },

  // ========== NON-CANCELLATION CASES ==========
  {
    name: "Technical support - not cancellation",
    input: "Hi, my charger is not working. Can someone help?",
    expected: {
      is_cancellation: false,
      language: "en",
      response_validation: {
        min_words: 0,
        max_words: 0,
        must_include: []
      }
    }
  },
  {
    name: "Billing inquiry - not cancellation",
    input: "Hei, jeg har spørsmål om fakturaen min. Hvorfor ble jeg belastet dobbelt?",
    expected: {
      is_cancellation: false,
      language: "no",
      response_validation: {
        min_words: 0,
        max_words: 0,
        must_include: []
      }
    }
  },

  // ========== COMPLEX CASES ==========
  {
    name: "Multiple concerns - moving + billing",
    input:
      "Hei, jeg skal flytte 15. mars og ønsker å avslutte. Jeg vil også forsikre meg om at jeg ikke blir belastet for mars måned.",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "no",
      move_date_present: true,
      response_validation: {
        min_words: 70,
        max_words: 120,
        must_include: ["Elaway-appen", "Oppsigelsen gjelder ut inneværende måned"]
      }
    }
  },
  {
    name: "Corporate account concern",
    input:
      "I'm moving out and want to cancel, but this is a corporate account. Will this affect my company's other subscriptions?",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "en",
      edge_case: "corporate_account",
      response_validation: {
        min_words: 50,
        max_words: 100,
        must_include: ["end of the current month"]
      }
    }
  }
];

// ========== SUCCESS CRITERIA ==========

export interface ValidationResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    word_count: number;
    has_policy_statement: boolean;
    has_app_instructions: boolean;
    response_length_ok: boolean;
  };
}

/**
 * Validate a generated response against expected criteria
 */
export function validateResponse(
  response: string,
  expected: TestCase["expected"]
): ValidationResult {
  const words = response.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;
  const errors: string[] = [];
  const warnings: string[] = [];

  // Skip validation for non-cancellation cases
  if (!expected.is_cancellation) {
    return {
      passed: true,
      errors: [],
      warnings: [],
      metrics: {
        word_count: 0,
        has_policy_statement: false,
        has_app_instructions: false,
        response_length_ok: true
      }
    };
  }

  const { response_validation } = expected;

  // Check word count
  if (wordCount < response_validation.min_words) {
    errors.push(
      `Response too short: ${wordCount} words (minimum: ${response_validation.min_words})`
    );
  }
  if (wordCount > response_validation.max_words) {
    warnings.push(
      `Response too long: ${wordCount} words (maximum: ${response_validation.max_words})`
    );
  }

  // Check required phrases
  for (const phrase of response_validation.must_include) {
    if (!response.includes(phrase)) {
      errors.push(`Missing required phrase: "${phrase}"`);
    }
  }

  // Check forbidden phrases
  if (response_validation.must_not_include) {
    for (const phrase of response_validation.must_not_include) {
      if (response.includes(phrase)) {
        errors.push(`Contains forbidden phrase: "${phrase}"`);
      }
    }
  }

  // Check policy statement
  const hasPolicyStatement =
    response.includes("Oppsigelsen gjelder ut inneværende måned") ||
    response.includes("end of the current month") ||
    response.includes("slutet av innevarande månad");

  if (!hasPolicyStatement) {
    errors.push("Missing mandatory policy statement (end-of-month cancellation)");
  }

  // Check app instructions (unless no_app_access edge case)
  const hasAppInstructions = response.includes("Elaway-appen") || response.includes("Elaway app");

  if (!hasAppInstructions && expected.edge_case !== "no_app_access") {
    warnings.push("Missing app self-service instructions");
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    metrics: {
      word_count: wordCount,
      has_policy_statement: hasPolicyStatement,
      has_app_instructions: hasAppInstructions,
      response_length_ok:
        wordCount >= response_validation.min_words && wordCount <= response_validation.max_words
    }
  };
}

/**
 * Run all test cases and return summary
 */
export interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  success_rate: number;
  results: Array<{
    test_name: string;
    passed: boolean;
    validation: ValidationResult;
  }>;
}

export async function runTestSuite(
  generateDraftFn: (params: any) => string,
  extractFn: (email: string) => any
): Promise<TestSummary> {
  const results: TestSummary["results"] = [];

  for (const testCase of researchBasedTestCases) {
    // Extract data from email
    const extraction = await extractFn(testCase.input);

    // Skip draft generation for non-cancellation cases
    if (!testCase.expected.is_cancellation) {
      results.push({
        test_name: testCase.name,
        passed: true,
        validation: {
          passed: true,
          errors: [],
          warnings: [],
          metrics: {
            word_count: 0,
            has_policy_statement: false,
            has_app_instructions: false,
            response_length_ok: true
          }
        }
      });
      continue;
    }

    // Generate draft
    const draft = generateDraftFn({
      language: extraction.language,
      reason: extraction.reason,
      moveDate: extraction.move_date,
      edgeCase: extraction.edge_case,
      customerConcerns: extraction.customer_concerns,
      hasPaymentIssue: extraction.has_payment_issue,
      paymentConcerns: extraction.payment_concerns
    });

    // Validate response
    const validation = validateResponse(draft, testCase.expected);

    results.push({
      test_name: testCase.name,
      passed: validation.passed,
      validation
    });
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.length - passed;

  return {
    total: results.length,
    passed,
    failed,
    success_rate: (passed / results.length) * 100,
    results
  };
}
