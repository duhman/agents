# Test Success Criteria - Simplified HITM System

## Objective
Verify that the simplified human-in-the-middle email processing system works correctly end-to-end with deterministic, template-based processing.

## Core Functionality Tests

### 1. Email Extraction (Deterministic)
**Test:** Norwegian cancellation email with moving reason and date

**Input:**
```
Hei,

Jeg skal flytte til Oslo den 15. mars og ønsker å si opp abonnementet mitt.

Mvh,
Per Hansen
per.hansen@example.com
```

**Expected Output:**
- `is_cancellation`: true
- `reason`: "moving"
- `language`: "no"
- `move_date`: extracted (any valid date format)
- `policy_risks`: empty array or relevant warnings

**Success Criteria:**
✓ Cancellation correctly detected
✓ Moving reason identified
✓ Norwegian language detected
✓ Date extracted from text

---

### 2. Draft Generation (Template-Based)
**Test:** Norwegian cancellation draft

**Expected Output:**
- Draft text in Norwegian
- Includes end-of-month policy statement
- Includes self-service app instructions
- Professional and polite tone
- Move date referenced if provided

**Success Criteria:**
✓ Norwegian template used correctly
✓ Policy requirements met (end-of-month, self-service)
✓ Move date incorporated if extracted
✓ No AI required - pure template

---

### 3. Database Persistence
**Test:** Ticket and draft creation

**Expected Output:**
- Ticket created with:
  - source: "test" or "hubspot"
  - customerEmail: masked
  - rawEmailMasked: PII removed
  - reason: "moving"
  - moveDate: parsed date
- Draft created with:
  - ticketId: references ticket
  - language: "no"
  - draftText: complete template
  - confidence: "1.0" (templates = 100% compliance)
  - model: "template-v1"

**Success Criteria:**
✓ Ticket saved to database
✓ Draft linked to ticket
✓ All fields populated correctly
✓ PII properly masked

---

### 4. PII Masking
**Test:** Email with personal information

**Input:**
```
Per Hansen
per.hansen@example.com
+47 12345678
Gateveien 123
```

**Expected Output:**
```
[NAME]
[email]
[phone]
[address]
```

**Success Criteria:**
✓ Email addresses masked
✓ Phone numbers masked
✓ Names masked (if pattern detected)
✓ Addresses masked

---

### 5. Non-Cancellation Emails
**Test:** General inquiry email

**Input:**
```
Hei,

Jeg har et spørsmål om faktura.

Mvh,
Ole
```

**Expected Output:**
- `is_cancellation`: false
- `reason`: "unknown"
- No ticket created
- No draft created
- `success`: true (processed successfully, just no action taken)

**Success Criteria:**
✓ Non-cancellation correctly identified
✓ No unnecessary processing
✓ Returns success without errors

---

### 6. English Language Support
**Test:** English cancellation email

**Input:**
```
Hello,

I am moving to a new city on March 15 and need to cancel my subscription.

Best regards,
John
```

**Expected Output:**
- `language`: "en"
- Draft in English
- Same policy requirements met

**Success Criteria:**
✓ English language detected
✓ English template used
✓ Same quality as Norwegian

---

### 7. Edge Cases

#### 7a. Missing Move Date
**Input:** Cancellation without date
**Expected:** Still processes, no date in draft

#### 7b. Ambiguous Intent
**Input:** "Maybe I want to cancel"
**Expected:** Detected as cancellation (keyword match), flagged in policy_risks

#### 7c. Multiple Dates
**Input:** Multiple dates mentioned
**Expected:** First date extracted

---

### 8. Integration Test (Webhook → Slack)
**Test:** Full webhook flow

**Steps:**
1. POST to /api/webhook with cancellation email
2. Verify processEmail called
3. Verify ticket + draft created
4. Verify Slack notification triggered (if SLACK_REVIEW_CHANNEL configured)

**Expected HTTP Response:**
```json
{
  "success": true,
  "ticket_id": "<uuid>",
  "draft_id": "<uuid>",
  "request_id": "<uuid>",
  "processing_time_ms": <number>
}
```

**Success Criteria:**
✓ HTTP 200 returned
✓ Valid UUIDs returned
✓ Processing time < 5000ms
✓ Slack notification queued (fire-and-forget)

---

### 9. Performance Requirements
- Processing time: < 2 seconds (no AI = fast)
- Memory usage: Minimal (no multi-agent overhead)
- Database queries: 2 INSERTs only (ticket + draft)
- No external API calls except database

**Success Criteria:**
✓ Faster than multi-agent version
✓ No OpenAI API calls for basic flow
✓ Consistent performance

---

### 10. Error Handling
**Test:** Various error scenarios

#### 10a. Missing Email Content
**Input:** Empty rawEmail
**Expected:** HTTP 400 validation error

#### 10b. Database Unavailable
**Expected:** Graceful error, HTTP 500, error message

#### 10c. Invalid Date Format
**Expected:** Still processes, date extracted as text or null

**Success Criteria:**
✓ No crashes
✓ Appropriate error codes
✓ Clear error messages
✓ Errors logged properly

---

## Comparison with Previous System

### What We Removed:
- ❌ Multi-agent orchestration (5 agents → 0 agents)
- ❌ OpenAI API calls for basic flow
- ❌ Vector store search (optional, not implemented)
- ❌ Complex confidence calculation
- ❌ Unused postToSlackTool (webhook handles Slack)

### What We Kept:
- ✅ PII masking (GDPR compliance)
- ✅ Database persistence (tickets, drafts)
- ✅ Template-based drafts (policy compliant)
- ✅ Slack HITM notification
- ✅ Error handling and logging

### What We Improved:
- ✅ Faster processing (no AI overhead)
- ✅ Deterministic behavior (predictable)
- ✅ Simpler codebase (~70% less code)
- ✅ Easier to maintain
- ✅ Lower costs (no OpenAI for basic flow)

---

## Test Execution Plan

1. **Unit Tests:** Test extraction function with various inputs
2. **Integration Test:** Test full processEmail flow
3. **Database Test:** Verify records created correctly
4. **Webhook Test:** Test HTTP endpoint
5. **Performance Test:** Measure processing time
6. **Edge Case Tests:** Test error scenarios

## Success Definition

The simplified system is successful if:
1. ✅ All core functionality tests pass
2. ✅ Processing faster than previous system
3. ✅ No regressions (existing functionality maintained)
4. ✅ Code is simpler and easier to understand
5. ✅ Slack HITM workflow still works
6. ✅ Database schema unchanged (backward compatible)
