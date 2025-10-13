/**
 * Pattern Detection for Cancellation and Payment Issues
 * 
 * Defines patterns for detecting cancellation requests and payment-related issues
 * in customer emails across Norwegian, English, and Swedish languages.
 */

export const CANCELLATION_PATTERNS = {
  norwegian: [
    // Direct cancellation terms
    'oppsig', 'si opp', 'avslutt', 'kanseller', 'kansellering',
    'terminer', 'stopp', 'slutt', 'avbryt',
    
    // Moving/relocation terms
    'flytter', 'flytting', 'flyttet', 'flytte',
    'relokasjon', 'relokere', 'relokert',
    
    // Payment-related cancellations
    'fortsatt betalt', 'dobbel trekk', 'refunder', 'refusjon',
    'feil trekk', 'feilaktig betaling', 'kreditert',
    
    // Subscription terms
    'abonnement', 'abonnemang', 'subscription',
    'kundeforhold', 'avtale', 'kontrakt'
  ],
  
  english: [
    // Direct cancellation terms
    'cancel', 'cancellation', 'terminate', 'termination',
    'end subscription', 'stop subscription', 'discontinue',
    
    // Moving/relocation terms
    'moving', 'relocating', 'relocation', 'moved',
    'moving out', 'leaving', 'departure',
    
    // Payment-related cancellations
    'charged twice', 'double charge', 'billing issue',
    'refund', 'refund request', 'payment error',
    'incorrect charge', 'wrong billing',
    
    // Subscription terms
    'subscription', 'membership', 'service',
    'account', 'contract', 'agreement'
  ],
  
  swedish: [
    // Direct cancellation terms
    'uppsägning', 'säga upp', 'avsluta', 'avbryta',
    'stoppa', 'sluta', 'terminera',
    
    // Moving/relocation terms
    'flyttar', 'flyttning', 'flyttat', 'flytta',
    'relokation', 'relokera', 'relokerat',
    
    // Payment-related cancellations
    'fortfarande betalt', 'dubbel dragning', 'återbetalning',
    'fel dragning', 'felaktig betalning', 'krediterat',
    
    // Subscription terms
    'abonnemang', 'prenumeration', 'subscription',
    'kundförhållande', 'avtal', 'kontrakt'
  ]
};

export const PAYMENT_ISSUE_PATTERNS = {
  norwegian: [
    'betalt', 'faktura', 'trekk', 'refund', 'kreditert', 'dobbell',
    'fortsatt betalt', 'dobbel trekk', 'feil trekk', 'feilaktig',
    'betalingsfeil', 'fakturafeil', 'trekkfeil', 'kreditert',
    'tilbakebetaling', 'refusjon', 'belastning', 'debitering',
    'mangelfull betaling', 'overbetaling', 'underbetaling'
  ],
  
  english: [
    'charged', 'invoice', 'billing', 'refund', 'payment', 'twice',
    'charged twice', 'billing issue', 'payment error', 'incorrect',
    'billing error', 'invoice error', 'charge error', 'credited',
    'reimbursement', 'refund request', 'billing dispute',
    'payment dispute', 'overcharge', 'undercharge', 'double charge'
  ],
  
  swedish: [
    'betalt', 'faktura', 'dragning', 'återbetalning', 'krediterat', 'dubbel',
    'fortfarande betalt', 'dubbel dragning', 'fel dragning', 'felaktig',
    'betalningsfel', 'fakturafel', 'dragningsfel', 'krediterat',
    'återbetalning', 'refusion', 'belastning', 'debitering',
    'ofullständig betalning', 'överbetalning', 'underbetalning'
  ]
};

export const NON_CANCELLATION_PATTERNS = {
  feedback_requests: [
    'rate', 'rating', 'feedback', 'survey', 'how would you rate',
    'customer service', 'satisfaction', 'experience', 'inquiry #'
  ],
  questions: [
    'how do i', 'how can i', 'what is', 'where can', 'when will',
    'spørsmål', 'fråga', 'question'
  ],
  support_requests: [
    'help with', 'problem with', 'issue with', 'not working',
    'technical support', 'teknisk support', 'app not working',
    'cannot access', 'access the charging station'
  ]
};

export const EDGE_CASE_PATTERNS = {
  no_app_access: {
    norwegian: ['ikke app', 'ingen app', 'klarer ikke app', 'app fungerer ikke', 'app problem'],
    english: ['not app', 'no app', 'app not working', 'app problem', 'app issue'],
    swedish: ['inte app', 'ingen app', 'app fungerar inte', 'app problem']
  },
  
  corporate_account: {
    norwegian: ['bedrift', 'firma', 'selskap', 'corporate', 'business', 'bedriftskunde'],
    english: ['company', 'corporate', 'business', 'enterprise', 'organization'],
    swedish: ['företag', 'bolag', 'corporate', 'business', 'organisation']
  },
  
  future_move_date: {
    norwegian: ['oktober', 'november', 'desember', '2025', '2026', 'neste år', 'fremtidig'],
    english: ['october', 'november', 'december', '2025', '2026', 'next year', 'future'],
    swedish: ['oktober', 'november', 'december', '2025', '2026', 'nästa år', 'framtida']
  },
  
  already_canceled: {
    norwegian: ['allerede', 'kansellert', 'avsluttet', 'oppsagt', 'allerede sagt opp'],
    english: ['already', 'cancelled', 'terminated', 'ended', 'already cancelled'],
    swedish: ['redan', 'avslutat', 'uppsagt', 'redan sagt upp']
  },
  
  sameie_concern: {
    norwegian: ['sameie', 'borettslag', 'styret', 'board', 'sameiebestyrelse', 'borettslagsstyre'],
    english: ['housing association', 'condo board', 'co-op board', 'building management'],
    swedish: ['bostadsrättsförening', 'styrelse', 'föreningsstyrelse', 'fastighetsförvaltning']
  },
  
  payment_dispute: {
    norwegian: ['feil', 'mistake', 'feilaktig', 'incorrect', 'feil trekk', 'feil faktura'],
    english: ['wrong', 'mistake', 'incorrect', 'error', 'wrong charge', 'wrong invoice'],
    swedish: ['fel', 'misstag', 'felaktig', 'incorrect', 'fel dragning', 'fel faktura']
  }
};

/**
 * Detect if an email is clearly NOT a cancellation request
 */
export function isNonCancellationEmail(email: string): boolean {
  const lower = email.toLowerCase();
  
  // Check for feedback/survey patterns
  const hasFeedbackPattern = NON_CANCELLATION_PATTERNS.feedback_requests.some(
    pattern => lower.includes(pattern)
  );
  
  if (hasFeedbackPattern) return true;
  
  // Check for support request patterns
  const hasSupportPattern = NON_CANCELLATION_PATTERNS.support_requests.some(
    pattern => lower.includes(pattern)
  );
  
  if (hasSupportPattern) return true;
  
  // Check for question patterns (without cancellation keywords)
  const hasQuestionPattern = NON_CANCELLATION_PATTERNS.questions.some(
    pattern => lower.includes(pattern)
  );
  
  const hasCancellationKeyword = Object.values(CANCELLATION_PATTERNS).some(patterns =>
    patterns.some(pattern => lower.includes(pattern))
  );
  
  if (hasQuestionPattern && !hasCancellationKeyword) return true;
  
  return false;
}

/**
 * Detect if an email contains cancellation intent
 */
export function detectCancellationIntent(email: string): boolean {
  // CRITICAL: Check for non-cancellation patterns first
  if (isNonCancellationEmail(email)) {
    return false;
  }
  
  const lower = email.toLowerCase();
  
  return Object.values(CANCELLATION_PATTERNS).some(patterns => 
    patterns.some(pattern => lower.includes(pattern))
  );
}

/**
 * Detect if an email contains payment issues
 */
export function detectPaymentIssue(email: string): boolean {
  const lower = email.toLowerCase();
  
  return Object.values(PAYMENT_ISSUE_PATTERNS).some(patterns => 
    patterns.some(pattern => lower.includes(pattern))
  );
}

/**
 * Detect specific edge cases in the email
 */
export function detectEdgeCase(email: string): string {
  const lower = email.toLowerCase();
  
  for (const [edgeCase, languagePatterns] of Object.entries(EDGE_CASE_PATTERNS)) {
    for (const patterns of Object.values(languagePatterns)) {
      if (patterns.some(pattern => lower.includes(pattern))) {
        return edgeCase;
      }
    }
  }
  
  return 'none';
}

/**
 * Detect the primary language of the email
 */
export function detectLanguage(email: string): 'no' | 'en' | 'sv' {
  const lower = email.toLowerCase();
  
  // Count Norwegian-specific words
  const norwegianWords = ['oppsigelse', 'abonnement', 'flytter', 'sameie', 'borettslag'];
  const norwegianCount = norwegianWords.filter(word => lower.includes(word)).length;
  
  // Count Swedish-specific words
  const swedishWords = ['uppsägning', 'abonnemang', 'flyttar', 'bostadsrättsförening'];
  const swedishCount = swedishWords.filter(word => lower.includes(word)).length;
  
  // Count English-specific words
  const englishWords = ['subscription', 'cancellation', 'moving', 'housing association'];
  const englishCount = englishWords.filter(word => lower.includes(word)).length;
  
  // Return language with highest count, default to Norwegian
  if (swedishCount > norwegianCount && swedishCount > englishCount) {
    return 'sv';
  } else if (englishCount > norwegianCount && englishCount > swedishCount) {
    return 'en';
  } else {
    return 'no'; // Default to Norwegian
  }
}

/**
 * Extract customer concerns from the email
 */
export function extractCustomerConcerns(email: string): string[] {
  const concerns: string[] = [];
  const lower = email.toLowerCase();
  
  // Payment concerns
  if (detectPaymentIssue(email)) {
    concerns.push('payment_issue');
  }
  
  // App access concerns
  if (EDGE_CASE_PATTERNS.no_app_access.norwegian.some(p => lower.includes(p)) ||
      EDGE_CASE_PATTERNS.no_app_access.english.some(p => lower.includes(p)) ||
      EDGE_CASE_PATTERNS.no_app_access.swedish.some(p => lower.includes(p))) {
    concerns.push('app_access');
  }
  
  // Sameie concerns
  if (EDGE_CASE_PATTERNS.sameie_concern.norwegian.some(p => lower.includes(p)) ||
      EDGE_CASE_PATTERNS.sameie_concern.english.some(p => lower.includes(p)) ||
      EDGE_CASE_PATTERNS.sameie_concern.swedish.some(p => lower.includes(p))) {
    concerns.push('sameie_concern');
  }
  
  // Future move date concerns
  if (EDGE_CASE_PATTERNS.future_move_date.norwegian.some(p => lower.includes(p)) ||
      EDGE_CASE_PATTERNS.future_move_date.english.some(p => lower.includes(p)) ||
      EDGE_CASE_PATTERNS.future_move_date.swedish.some(p => lower.includes(p))) {
    concerns.push('future_move_date');
  }
  
  return concerns;
}

/**
 * Analyze email structure to separate subject and body
 */
export function analyzeEmailStructure(rawEmail: string): {
  subject: string;
  body: string;
  hasSubject: boolean;
} {
  const lines = rawEmail.split(/\r?\n/);
  let subject = "";
  let bodyStartIdx = 0;
  let hasSubject = false;
  
  // Look for "Subject: " line
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] || "";
    if (/^subject\s*:/i.test(line)) {
      subject = line.replace(/^subject\s*:\s*/i, "").trim();
      hasSubject = true;
      // Body starts after subject (skip empty lines)
      bodyStartIdx = i + 1;
      while (bodyStartIdx < lines.length && !lines[bodyStartIdx]?.trim()) {
        bodyStartIdx++;
      }
      break;
    }
  }
  
  const body = lines.slice(bodyStartIdx).join("\n").trim();
  
  return {
    subject: subject || lines[0]?.trim() || "",
    body: body || rawEmail,
    hasSubject
  };
}

/**
 * Enhanced cancellation detection with subject/body analysis
 */
export function detectCancellationIntentEnhanced(rawEmail: string): boolean {
  // CRITICAL: Check for non-cancellation patterns first
  if (isNonCancellationEmail(rawEmail)) {
    return false;
  }
  
  const { subject, body } = analyzeEmailStructure(rawEmail);
  
  // Analyze subject and body separately
  const subjectHasCancellation = detectCancellationIntent(subject);
  const bodyHasCancellation = detectCancellationIntent(body);
  
  // If subject clearly indicates non-cancellation (feedback, inquiry), reject
  const subjectIsNonCancellation = isNonCancellationEmail(subject);
  if (subjectIsNonCancellation) {
    return false;
  }
  
  // Require cancellation intent in either subject OR body
  return subjectHasCancellation || bodyHasCancellation;
}

/**
 * Calculate confidence factors for extraction
 */
export function calculateConfidenceFactors(email: string): {
  clear_intent: boolean;
  complete_information: boolean;
  standard_case: boolean;
} {
  const lower = email.toLowerCase();
  
  // Clear intent: email contains clear cancellation language (use enhanced detection)
  const clear_intent = detectCancellationIntentEnhanced(email);
  
  // Complete information: email contains move date or specific reason
  const hasMoveDate = /\d{1,2}[.\/\-]\d{1,2}[.\/\-]\d{2,4}|\d{4}[.\/\-]\d{1,2}[.\/\-]\d{1,2}|(januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember|january|february|march|april|may|june|july|august|september|october|november|december)/i.test(email);
  const hasSpecificReason = lower.includes('flytter') || lower.includes('moving') || lower.includes('flyttar');
  const complete_information = hasMoveDate || hasSpecificReason;
  
  // Standard case: no edge cases detected AND it's actually a cancellation
  const standard_case = detectEdgeCase(email) === 'none' && !detectPaymentIssue(email) && clear_intent;
  
  return {
    clear_intent,
    complete_information,
    standard_case
  };
}
