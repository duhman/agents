/**
 * Pattern Detection for Cancellation and Payment Issues
 * 
 * Defines patterns for detecting cancellation requests and payment-related issues
 * in customer emails across Norwegian, English, and Swedish languages.
 */

const CANCELLATION_VERB_PATTERNS = {
  norwegian: [
    'si opp', 'sier opp', 'sagt opp', 'oppsig', 'avslutt', 'avslutter', 'avsluttet',
    'kanseller', 'kansellere', 'kansellering', 'terminer', 'terminere', 'stopp',
    'stoppe', 'slutt', 'avbryt', 'opphør', 'oppheve'
  ],
  english: [
    'cancel', 'cancellation', 'terminate', 'termination', 'end subscription',
    'stop subscription', 'discontinue', 'close account'
  ],
  swedish: [
    'säga upp', 'säger upp', 'sagt upp', 'uppsägning', 'avsluta', 'avslutar',
    'avslutat', 'avbryta', 'stoppa', 'sluta', 'terminera'
  ]
} as const;

const CANCELLATION_NOUN_PATTERNS = {
  norwegian: ['oppsigelse', 'oppsigelsen', 'oppsigelsestid', 'oppsigelsesbrev'],
  english: ['cancellation', 'termination', 'cancelling'],
  swedish: ['uppsägning', 'uppsägningen']
} as const;

const SUBSCRIPTION_PATTERNS = {
  norwegian: ['abonnement', 'kundeforhold', 'avtale', 'kontrakt'],
  english: ['subscription', 'membership', 'service agreement'],
  swedish: ['abonnemang', 'kundförhållande', 'avtal', 'kontrakt']
} as const;

const RELOCATION_PATTERNS = {
  norwegian: ['flytter', 'flytting', 'flyttet', 'flytte', 'relokasjon', 'relokere', 'ny adresse'],
  english: ['moving', 'move out', 'relocating', 'relocation', 'leaving'],
  swedish: ['flyttar', 'flyttning', 'flyttat', 'flytta', 'relokation', 'ny adress']
} as const;

const CANCELLATION_PHRASES = {
  norwegian: [
    'si opp abonnementet', 'sier opp abonnementet', 'sier opp mitt abonnement',
    'avslutte abonnementet', 'avslutter abonnementet', 'ønsker å si opp',
    'ønsker å avslutte', 'jeg sier opp', 'ønsker oppsigelse'
  ],
  english: [
    'cancel my subscription', 'cancel the subscription', 'terminate my subscription',
    'end my subscription', 'discontinue my subscription', 'request cancellation',
    'i am cancelling my subscription'
  ],
  swedish: [
    'säga upp mitt abonnemang', 'säger upp mitt abonnemang', 'säga upp abonnemanget',
    'avsluta abonnemanget', 'avslutar abonnemanget'
  ]
} as const;

// Legacy export maintained for compatibility with existing imports.
export const CANCELLATION_PATTERNS = {
  norwegian: [
    ...CANCELLATION_VERB_PATTERNS.norwegian,
    ...CANCELLATION_NOUN_PATTERNS.norwegian,
    ...SUBSCRIPTION_PATTERNS.norwegian,
    ...RELOCATION_PATTERNS.norwegian
  ],
  english: [
    ...CANCELLATION_VERB_PATTERNS.english,
    ...CANCELLATION_NOUN_PATTERNS.english,
    ...SUBSCRIPTION_PATTERNS.english,
    ...RELOCATION_PATTERNS.english
  ],
  swedish: [
    ...CANCELLATION_VERB_PATTERNS.swedish,
    ...CANCELLATION_NOUN_PATTERNS.swedish,
    ...SUBSCRIPTION_PATTERNS.swedish,
    ...RELOCATION_PATTERNS.swedish
  ]
};

const ALL_CANCELLATION_VERBS = [
  ...CANCELLATION_VERB_PATTERNS.norwegian,
  ...CANCELLATION_VERB_PATTERNS.english,
  ...CANCELLATION_VERB_PATTERNS.swedish
];

const ALL_CANCELLATION_NOUNS = [
  ...CANCELLATION_NOUN_PATTERNS.norwegian,
  ...CANCELLATION_NOUN_PATTERNS.english,
  ...CANCELLATION_NOUN_PATTERNS.swedish
];

const ALL_SUBSCRIPTION_TERMS = [
  ...SUBSCRIPTION_PATTERNS.norwegian,
  ...SUBSCRIPTION_PATTERNS.english,
  ...SUBSCRIPTION_PATTERNS.swedish
];

const ALL_RELOCATION_TERMS = [
  ...RELOCATION_PATTERNS.norwegian,
  ...RELOCATION_PATTERNS.english,
  ...RELOCATION_PATTERNS.swedish
];

const ALL_CANCELLATION_PHRASES = [
  ...CANCELLATION_PHRASES.norwegian,
  ...CANCELLATION_PHRASES.english,
  ...CANCELLATION_PHRASES.swedish
];

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
    'spørsmål', 'fråga', 'question', 'hvordan', 'hvordan gjør jeg', 'hur gör jag'
  ],
  support_requests: [
    'help with', 'problem with', 'issue with', 'not working',
    'technical support', 'teknisk support', 'app not working',
    'cannot access', 'access the charging station', 'får ikke tilgang',
    'fungerer ikke', 'does not work', 'virker ikke'
  ],
  account_access: [
    'kan ikke logge inn', 'får ikke logget inn', 'logg inn', 'login',
    'apple-id', 'apple id', 'skjult e-post', 'hidden email', 'kontoen min',
    'brukeren min', 'cannot sign in', 'reset password'
  ],
  charging_session: [
    'lading', 'ladeøkten', 'ladeøkt', 'charging session', 'stop charging',
    'avslutte lading', 'avslutt lading', 'får ikke stoppet', 'kan ikke starte lading',
    'charger not', 'ladeboks', 'chargebox', 'charging point', 'evlink'
  ],
  installer_requests: [
    'montasje', 'montert', 'installasjon', 'installer', 'service montør',
    'backend', 'legg inn', 'chargebox id', 'serial number', 'new charger',
    'installer request'
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

function matchAny(lower: string, patterns: string[]): boolean {
  return patterns.some(pattern => lower.includes(pattern));
}

function analyzeCancellationSignals(text: string) {
  const lower = text.toLowerCase();
  return {
    lower,
    hasStrongPhrase: matchAny(lower, ALL_CANCELLATION_PHRASES),
    hasVerb: matchAny(lower, ALL_CANCELLATION_VERBS),
    hasNoun: matchAny(lower, ALL_CANCELLATION_NOUNS),
    hasSubscription: matchAny(lower, ALL_SUBSCRIPTION_TERMS),
    hasRelocation: matchAny(lower, ALL_RELOCATION_TERMS)
  };
}

function countSignals(signals: ReturnType<typeof analyzeCancellationSignals>): number {
  return [
    signals.hasVerb,
    signals.hasNoun,
    signals.hasSubscription,
    signals.hasRelocation
  ].filter(Boolean).length;
}

/**
 * Detect if an email is clearly NOT a cancellation request
 */
export function isNonCancellationEmail(email: string): boolean {
  const signals = analyzeCancellationSignals(email);
  const lower = signals.lower;

  if (matchAny(lower, NON_CANCELLATION_PATTERNS.feedback_requests)) {
    return true;
  }

  if (matchAny(lower, NON_CANCELLATION_PATTERNS.installer_requests)) {
    return true;
  }

  const supportLike =
    matchAny(lower, NON_CANCELLATION_PATTERNS.support_requests) ||
    matchAny(lower, NON_CANCELLATION_PATTERNS.charging_session);
  if (supportLike && !signals.hasStrongPhrase && !signals.hasSubscription && !signals.hasRelocation) {
    return true;
  }

  const accountAccess = matchAny(lower, NON_CANCELLATION_PATTERNS.account_access);
  if (accountAccess && !signals.hasStrongPhrase && !signals.hasVerb) {
    return true;
  }

  const hasQuestionPattern = matchAny(lower, NON_CANCELLATION_PATTERNS.questions);
  if (hasQuestionPattern && countSignals(signals) === 0 && !signals.hasStrongPhrase) {
    return true;
  }

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

  const signals = analyzeCancellationSignals(email);

  if (signals.hasStrongPhrase) {
    return true;
  }

  const comboDetected =
    (signals.hasVerb && signals.hasSubscription) ||
    (signals.hasVerb && signals.hasRelocation) ||
    (signals.hasNoun && signals.hasSubscription) ||
    (signals.hasRelocation && signals.hasSubscription) ||
    (signals.hasVerb && signals.hasNoun);

  if (comboDetected) {
    return true;
  }

  return countSignals(signals) >= 3;
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
  if (subjectIsNonCancellation && !bodyHasCancellation) {
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
