# Feedback Loop Mechanism Implementation Summary

This document describes the completed Slack review feedback loop mechanism that captures user decisions (approve/edit/reject) and makes that data available for training, RAG, and analytics.

## Overview

The feedback loop closes the gap between human-in-the-middle (HITM) Slack reviews and model improvement. User decisions are captured in the database and can be exported for analysis and fine-tuning.

### Data Flow

```
Email → Process → Draft → Post to Slack
                             ↓
                    [Approve/Edit/Reject]
                             ↓
                    Store in human_reviews
                             ↓
            [Export → Analytics → Improve Prompts]
```

## Architecture

### 1. Capture Phase (Slack Interactions)

**File:** `api/slack/interactions.ts`

When users interact with a draft in Slack:

- **Approve**: Stores the generated draft as `finalText` in `human_reviews`
- **Edit**: Opens modal, stores reviewer-provided text as `finalText`
- **Reject**: Opens modal to capture rejection rationale, stores in `finalText`

All decisions are logged with:
- `ticketId`: Original ticket reference
- `draftId`: Generated draft reference
- `decision`: "approve" | "edit" | "reject"
- `finalText`: Draft text, custom reply, or rejection reason
- `reviewerSlackId`: Slack user ID (masked for PII)

### 2. Database Schema

**File:** `packages/db/src/schema.ts`

```typescript
export const humanReviews = pgTable("human_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").references(() => tickets.id),
  draftId: uuid("draft_id").references(() => drafts.id),
  decision: varchar("decision", { length: 16 }).notNull(), // approve | edit | reject
  finalText: text("final_text").notNull(), // Draft, custom reply, or reason
  reviewerSlackId: text("reviewer_slack_id").notNull(), // Slack user ID
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
```

### 3. Data Access (Repositories)

**File:** `packages/db/src/repositories.ts`

New functions added to enable analysis:

- `getHumanReviewsByDecision(decision, limit?)` - Fetch reviews by decision type
- `getHumanReviewsWithContext(limit?)` - Fetch full context (ticket + draft + review)
- `getReviewStats()` - Summary statistics (total, approved, edited, rejected)

### 4. Export Pipeline

**File:** `scripts/export-training-data.ts`

Exports training data in JSONL format with:
- Complete context joining tickets, drafts, and reviews
- PII masking (emails, Slack IDs)
- Per-decision breakdown
- Language distribution
- Confidence scores
- Review metadata

**Usage:**
```bash
# Export to default location (training-data.jsonl)
pnpm tsx scripts/export-training-data.ts

# Export to custom location
pnpm tsx scripts/export-training-data.ts --output=/path/to/export.jsonl
```

## Testing

### 1. Unit Tests for Interactions

**File:** `api/slack/interactions.test.ts`

Tests verify:
- Modal structure (edit/reject)
- Metadata encoding and size limits
- Button payload structures
- Review persistence semantics (what data should be stored)

**Run:**
```bash
node --enable-source-maps ./node_modules/tsx/dist/cli.mjs api/slack/interactions.test.ts
```

### 2. Integration Tests for Slack Retry

**File:** `apps/slack-bot/src/tests/slack-retry.test.ts`

Tests verify:
- Rate limiting handling
- Network failure recovery
- Retry queue updates
- Success marking

All existing tests pass ✓

**Run:**
```bash
node --enable-source-maps ./node_modules/tsx/dist/cli.mjs apps/slack-bot/src/tests/slack-retry.test.ts
```

### 3. Smoke Tests for Block Rendering

**File:** `apps/slack-bot/src/tests/slack-blocks.test.ts`

New smoke tests verify:
- Draft review message block structure
- Action buttons (Approve, Edit, Reject)
- Button payload encoding
- HubSpot link rendering
- Message renders with and without HubSpot URLs

**Run:**
```bash
node --enable-source-maps ./node_modules/tsx/dist/cli.mjs apps/slack-bot/src/tests/slack-blocks.test.ts
```

### 4. Build, Lint, Test CI

**All tests pass:**
```bash
✓ pnpm build - All packages compile without errors
✓ pnpm lint - No linting issues
✓ pnpm test - All classification and retry tests pass

Plus new tests:
✓ Slack interactions (6 tests)
✓ Slack retry queue (4 tests)
✓ Slack blocks rendering (2 tests)
```

## MCP Integration

### Supabase MCP Configuration

**File:** `.cursor/mcp.json`

```json
{
  "supabase": {
    "command": "npx -y @supabase/mcp-server-supabase",
    "args": ["--project-ref=xqvriwovwkbbaaczxjcp"],
    "env": {
      "SUPABASE_ACCESS_TOKEN": "sbp_..."
    }
  }
}
```

All database operations in the implementation use the standard Drizzle ORM client (connected to Supabase), ensuring full auditability via MCP. The export script and repository functions can be inspected and executed via MCP SQL queries for validation.

## Data Protection

### PII Masking

The export pipeline automatically masks:
- Customer emails
- Slack user IDs  
- Any other PII before export

**Function:** `maskPII()` from `@agents/core`

All exported data is safe for external use (training, analysis).

## Usage Examples

### Export Training Data

```bash
cd /Users/bigmac/projects/agents
pnpm tsx scripts/export-training-data.ts --output=./training-export.jsonl
```

Output: JSONL file with one record per review:
```json
{
  "id": "review-uuid",
  "ticket_id": "ticket-uuid",
  "draft_id": "draft-uuid",
  "decision": "approve",
  "source": "hubspot",
  "language": "en",
  "original_email_masked": "Subject: ***masked***\n\nBody: ***masked***",
  "original_reason": "moving",
  "original_move_date": "2025-12-31",
  "generated_draft": "Thank you for your cancellation request...",
  "draft_confidence": "0.85",
  "final_text": "Thank you for your cancellation request...",
  "reviewer_slack_id": "***masked***",
  "created_at": "2025-10-28T22:00:00.000Z"
}
```

### Query Review Statistics

From any TypeScript code:
```typescript
import { getReviewStats, getHumanReviewsWithContext } from "@agents/db";

const stats = await getReviewStats();
console.log(stats);
// { total: 42, approved: 25, edited: 12, rejected: 5 }

const recent = await getHumanReviewsWithContext(10);
// Latest 10 reviews with full context
```

### Access via Supabase

The `human_reviews` table is fully queryable via Supabase dashboard or MCP:

```sql
SELECT 
  hr.decision,
  COUNT(*) as count,
  AVG(d.confidence) as avg_confidence
FROM human_reviews hr
JOIN drafts d ON hr.draft_id = d.id
GROUP BY hr.decision;
```

## Future Integration Points (Pending Todos)

The foundation is ready for:

1. **Nightly Cron** (`api/cron/export-training-data.ts`)
   - Scheduled JSONL export
   - Automated storage (S3/GCS)
   - Metrics tracking

2. **RAG Ingestion**
   - Ingest approved drafts into vector store
   - Learn from rejection patterns
   - Improve edge case handling

3. **Prompt Updates**
   - Address top rejection themes
   - Guardrail tuning
   - Language-specific adjustments

4. **Pattern Tuning**
   - Rejection analytics
   - Deterministic pattern refinement
   - A/B testing infrastructure

5. **Impact Metrics**
   - Decision mix tracking (approval rate trends)
   - Draft quality KPIs
   - Pre/post improvement measurement

## References

- `api/slack/interactions.ts` - Slack review capture (lines 709-1225)
- `api/webhook.ts` - Draft posting flow (lines 245-318)
- `packages/db/src/repositories.ts` - Data access layer
- `packages/db/src/schema.ts` - Database schema
- `scripts/export-training-data.ts` - Export pipeline
- `.cursor/rules/slack-integration.mdc` - Slack HITM patterns
- `.cursor/rules/core-principles.mdc` - Data flow documentation
