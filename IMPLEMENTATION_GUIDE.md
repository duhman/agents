# 🛠️ Implementation Guide: Enhanced Agent Improvements

**Quick Start:** How to implement the research-backed agent improvements

---

## Option 1: Quick Integration (Recommended for Immediate Impact)

### Step 1: Update Simplified Processor to Use Enhanced Templates

```bash
# File: apps/agent/src/simplified-processor.ts
```

Replace the import:

```typescript
// OLD
import { generateDraft, type ExtractionResult } from "@agents/prompts";

// NEW
import { 
  generateDraftEnhanced, 
  detectEdgeCase,
  calculateConfidenceEnhanced,
  type ExtractionResultEnhanced 
} from "@agents/prompts";
```

Update the extraction function:

```typescript
function extractEmailData(email: string): ExtractionResultEnhanced {
  const emailLower = email.toLowerCase();
  
  // ... existing logic ...
  
  // NEW: Detect edge cases
  const edgeCase = detectEdgeCase(email, {
    move_date: moveDate,
    is_cancellation: isCancellation,
    reason
  });
  
  // NEW: Detect urgency
  const urgency = moveDate ? 
    (getMonthsFromNow(moveDate) > 1 ? "future" : "immediate") : 
    "unclear";
  
  // NEW: Extract customer concerns
  const customerConcerns: string[] = [];
  if (emailLower.includes("sameie") || emailLower.includes("association")) {
    customerConcerns.push("shared_account_concern");
  }
  if (emailLower.includes("bill") || emailLower.includes("faktura")) {
    customerConcerns.push("billing_concern");
  }
  
  // NEW: Confidence factors
  const confidence_factors = {
    clear_intent: isCancellation && reason !== "unknown",
    complete_information: isCancellation && (!!moveDate || reason === "moving"),
    standard_case: edgeCase === "none"
  };
  
  return {
    is_cancellation: isCancellation,
    reason,
    move_date: moveDate,
    language,
    edge_case: edgeCase,
    urgency,
    customer_concerns: customerConcerns,
    policy_risks: policyRisks,
    confidence_factors
  };
}
```

Update draft generation:

```typescript
// OLD
const draftText = generateDraft({
  language: extraction.language,
  reason: extraction.reason,
  moveDate: extraction.move_date
});

// NEW
const draftText = generateDraftEnhanced({
  language: extraction.language,
  reason: extraction.reason,
  moveDate: extraction.move_date,
  edgeCase: extraction.edge_case,
  customerConcerns: extraction.customer_concerns
});
```

Update confidence calculation:

```typescript
// OLD
const draft = await createDraft({
  ticketId: ticket.id,
  language: extraction.language,
  draftText,
  confidence: "1.0", // Templates always have 100% policy compliance
  model: "template-v1"
});

// NEW
const confidenceScore = calculateConfidenceEnhanced(extraction);

const draft = await createDraft({
  ticketId: ticket.id,
  language: extraction.language,
  draftText,
  confidence: String(confidenceScore),
  model: "template-enhanced-v1"
});
```

### Step 2: Build and Test

```bash
# Build the prompts package with new exports
cd packages/prompts
pnpm build

# Build the agent
cd ../../apps/agent
pnpm build

# Test locally
pnpm dev
```

### Step 3: Run Test Suite

```bash
# Create a test script
node -e "
const { 
  researchBasedTestCases, 
  runTestSuite, 
  validateResponse 
} = require('./packages/prompts/dist/test-cases.js');
const { 
  generateDraftEnhanced,
  extractionPromptEnhanced 
} = require('./packages/prompts/dist/templates-enhanced.js');

console.log('Running test suite...');
console.log('Total test cases:', researchBasedTestCases.length);
"
```

---

## Option 2: Full OpenAI Agents SDK Integration

### Step 1: Update Agent Instructions

```typescript
// File: packages/agents-runtime/src/agents.ts

import { 
  systemPolicyNO_Enhanced, 
  systemPolicyEN_Enhanced,
  extractionSchemaEnhanced 
} from "@agents/prompts";

export const extractionAgentEnhanced = new Agent({
  name: "Email Extractor Enhanced",
  instructions: systemPolicyEN_Enhanced,
  outputType: extractionSchemaEnhanced,
  model: "gpt-4o-2024-08-06",
  modelSettings: {
    temperature: 0,
    timeout: 30000
  },
  tools: [maskPiiTool]
});
```

### Step 2: Create New Processing Function

```typescript
// File: apps/agent/src/enhanced-processor.ts

import { run } from "@openai/agents";
import { extractionAgentEnhanced } from "@agents/agents-runtime";
import { 
  generateDraftEnhanced,
  calculateConfidenceEnhanced,
  detectEdgeCase 
} from "@agents/prompts";

export async function processEmailEnhanced(params: ProcessEmailParams) {
  const { source, customerEmail, rawEmail } = params;
  const requestId = generateRequestId();
  
  // 1. Mask PII
  const maskedEmail = maskPII(rawEmail);
  
  // 2. Extract with OpenAI using enhanced schema
  const extractionResult = await run(
    extractionAgentEnhanced, 
    maskedEmail
  );
  
  // 3. Auto-detect edge cases if not detected by agent
  if (extractionResult.edge_case === "none") {
    extractionResult.edge_case = detectEdgeCase(rawEmail, extractionResult);
  }
  
  // 4. Create ticket
  const ticket = await createTicket({
    source,
    customerEmail: maskPII(customerEmail),
    rawEmailMasked: maskedEmail,
    reason: extractionResult.reason,
    moveDate: extractionResult.move_date ? new Date(extractionResult.move_date) : undefined
  });
  
  // 5. Generate enhanced draft
  const draftText = generateDraftEnhanced({
    language: extractionResult.language,
    reason: extractionResult.reason,
    moveDate: extractionResult.move_date,
    edgeCase: extractionResult.edge_case,
    customerConcerns: extractionResult.customer_concerns
  });
  
  // 6. Calculate confidence
  const confidence = calculateConfidenceEnhanced(extractionResult);
  
  // 7. Create draft
  const draft = await createDraft({
    ticketId: ticket.id,
    language: extractionResult.language,
    draftText,
    confidence: String(confidence),
    model: "gpt-4o-enhanced-v1"
  });
  
  return {
    success: true,
    ticket: { id: ticket.id },
    draft: { id: draft.id, draftText },
    extraction: extractionResult,
    confidence
  };
}
```

---

## Option 3: Hybrid Approach (Best of Both)

**Recommended for Production:**

1. **Use deterministic extraction** (regex) for standard cases → Fast, cheap, reliable
2. **Use OpenAI extraction** only for complex/ambiguous cases → Smart fallback
3. **Always use enhanced templates** → Research-backed quality

```typescript
export async function processEmailHybrid(params: ProcessEmailParams) {
  // Try deterministic extraction first
  const quickExtraction = extractEmailDataDeterministic(params.rawEmail);
  
  // If low confidence or complex case, use OpenAI
  if (quickExtraction.confidence_factors.standard_case === false || 
      quickExtraction.policy_risks.length > 0) {
    
    logInfo("Complex case detected, using OpenAI extraction");
    const aiExtraction = await run(extractionAgentEnhanced, maskPII(params.rawEmail));
    
    // Merge results (AI takes precedence for ambiguous fields)
    extraction = {
      ...quickExtraction,
      ...aiExtraction,
      confidence_factors: aiExtraction.confidence_factors
    };
  } else {
    extraction = quickExtraction;
  }
  
  // Always use enhanced templates
  const draftText = generateDraftEnhanced({
    language: extraction.language,
    reason: extraction.reason,
    moveDate: extraction.move_date,
    edgeCase: extraction.edge_case,
    customerConcerns: extraction.customer_concerns
  });
  
  // ... rest of workflow
}
```

---

## Testing Your Implementation

### Unit Tests

```typescript
// test/enhanced-templates.test.ts

import { 
  generateDraftEnhanced, 
  detectEdgeCase,
  calculateConfidenceEnhanced,
  researchBasedTestCases,
  validateResponse
} from "@agents/prompts";

describe("Enhanced Templates", () => {
  test("should generate policy-compliant Norwegian draft", () => {
    const draft = generateDraftEnhanced({
      language: "no",
      reason: "moving",
      moveDate: null,
      edgeCase: "none"
    });
    
    expect(draft).toContain("Oppsigelsen gjelder ut inneværende måned");
    expect(draft).toContain("Elaway-appen");
    
    const words = draft.split(/\s+/).length;
    expect(words).toBeGreaterThanOrEqual(70);
    expect(words).toBeLessThanOrEqual(110);
  });
  
  test("should handle sameie concern edge case", () => {
    const draft = generateDraftEnhanced({
      language: "no",
      reason: "moving",
      moveDate: null,
      edgeCase: "sameie_concern"
    });
    
    expect(draft).toContain("kun din egen konto");
    expect(draft).toContain("ikke hele sameiets");
  });
  
  test("should handle no app access edge case", () => {
    const draft = generateDraftEnhanced({
      language: "en",
      reason: "unknown",
      moveDate: null,
      edgeCase: "no_app_access"
    });
    
    expect(draft).toContain("manually");
    expect(draft).toContain("confirm your address");
    expect(draft).not.toContain("Elaway app");
  });
});

describe("Research-Based Test Suite", () => {
  test("should pass all test cases", async () => {
    for (const testCase of researchBasedTestCases) {
      if (!testCase.expected.is_cancellation) continue;
      
      const draft = generateDraftEnhanced({
        language: testCase.expected.language,
        reason: testCase.expected.reason || "moving",
        moveDate: null,
        edgeCase: testCase.expected.edge_case || "none"
      });
      
      const validation = validateResponse(draft, testCase.expected);
      
      if (!validation.passed) {
        console.error(`Failed: ${testCase.name}`);
        console.error(validation.errors);
      }
      
      expect(validation.passed).toBe(true);
    }
  });
});
```

### Integration Tests

```typescript
// test/integration/enhanced-processor.test.ts

import { processEmailEnhanced } from "../../apps/agent/src/enhanced-processor";

describe("Enhanced Processor Integration", () => {
  test("should process standard Norwegian relocation", async () => {
    const result = await processEmailEnhanced({
      source: "test",
      customerEmail: "test@example.com",
      rawEmail: "Hei, jeg flytter fra adressen og ønsker å si opp abonnementet mitt."
    });
    
    expect(result.success).toBe(true);
    expect(result.extraction?.is_cancellation).toBe(true);
    expect(result.extraction?.reason).toBe("moving");
    expect(result.extraction?.language).toBe("no");
    expect(result.confidence).toBeGreaterThan(0.8);
    
    // Validate draft
    expect(result.draft?.draftText).toContain("Oppsigelsen gjelder ut inneværende måned");
  });
  
  test("should handle edge case: sameie concern", async () => {
    const result = await processEmailEnhanced({
      source: "test",
      customerEmail: "test@example.com",
      rawEmail: "Jeg flytter ut og vil forsikre meg om at jeg ikke avslutter for hele sameiet."
    });
    
    expect(result.extraction?.edge_case).toBe("sameie_concern");
    expect(result.draft?.draftText).toContain("kun din egen konto");
  });
});
```

---

## Deployment Checklist

- [ ] **Code Review**
  - [ ] All new functions have proper TypeScript types
  - [ ] PII masking is applied before any LLM calls
  - [ ] Error handling is comprehensive
  - [ ] Logging is structured with request IDs

- [ ] **Testing**
  - [ ] All unit tests pass
  - [ ] All research-based test cases pass (≥95% success rate)
  - [ ] Integration tests pass
  - [ ] Manual testing with real email samples

- [ ] **Configuration**
  - [ ] Environment variables set (`OPENAI_API_KEY`, `OPENAI_VECTOR_STORE_ID`)
  - [ ] Model selection confirmed (`gpt-4o-2024-08-06`)
  - [ ] Timeout settings appropriate (`30000ms`)

- [ ] **Monitoring**
  - [ ] Confidence score tracking enabled
  - [ ] Policy compliance validation logging
  - [ ] Response length metrics captured
  - [ ] Edge case detection metrics tracked

- [ ] **Documentation**
  - [ ] Update README with new features
  - [ ] Document edge case handling
  - [ ] Update API docs if applicable
  - [ ] Add migration notes for existing users

- [ ] **Gradual Rollout**
  - [ ] Deploy to staging environment first
  - [ ] Run A/B test: old vs. enhanced (1 week)
  - [ ] Monitor approval rates in Slack HITM
  - [ ] Collect feedback from support team
  - [ ] Deploy to production if metrics improve

---

## Expected Improvements

After implementing the enhanced templates and extraction:

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Policy Compliance | ~85% | ~95%+ | ✅ |
| Draft Approval Rate | ~70% | ~85%+ | ✅ |
| Response Length Consistency | Variable | 70-100 words | ✅ |
| Edge Case Handling | Manual | Automated | ✅ |
| Confidence Score Accuracy | ~75% | ~85%+ | ✅ |

---

## Troubleshooting

### Issue: Templates generate responses >100 words

**Solution:** The templates are designed for 70-100 words. If exceeding:
1. Check if multiple edge cases are triggering
2. Verify move_date formatting isn't adding extra text
3. Review customer_concerns array (should be minimal)

### Issue: Policy statement missing in some responses

**Solution:** This should never happen with enhanced templates. Check:
1. Correct language parameter passed
2. Edge case logic not overriding template
3. Template function returning complete string

### Issue: Edge case not detected

**Solution:** Enhance `detectEdgeCase()` function with more patterns:
```typescript
// Add more detection patterns
if (emailLower.match(/new_pattern_here/i)) {
  return "new_edge_case";
}
```

---

## Performance Considerations

**Deterministic Extraction (Regex):**
- ⚡ ~1-2ms processing time
- 💰 $0.00 cost per email
- ✅ 100% consistent

**OpenAI Extraction:**
- ⏱️ ~500-1500ms processing time
- 💰 ~$0.0001-0.0003 per email
- 🎯 Higher accuracy for complex cases

**Recommendation:** Use hybrid approach for best balance.

---

## Next Steps After Implementation

1. **Collect HITM Feedback (2 weeks)**
   - Track approval vs. edit vs. reject rates
   - Identify patterns in human edits
   - Gather qualitative feedback from support team

2. **Fine-Tuning Dataset (1-2 months)**
   - Export approved email → response pairs
   - Target: ≥270 examples (see AGENT_IMPROVEMENT_RECOMMENDATIONS.md)
   - Prepare JSONL format for OpenAI fine-tuning

3. **Model Fine-Tuning (Month 3)**
   - Train on `gpt-4o-mini-2024-07-18`
   - A/B test: enhanced templates vs. fine-tuned model
   - Deploy if ≥10% improvement

4. **Automation Expansion (Month 4+)**
   - Enable auto-approval for high-confidence cases (≥95%)
   - Expand to other cancellation types (billing, technical)
   - Consider multilingual expansion (Swedish full support)

---

**Questions?** See `AGENT_IMPROVEMENT_RECOMMENDATIONS.md` for detailed rationale and research data.

