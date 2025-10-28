# Quick Start: Slack Feedback Loop

Fast reference for using the new feedback loop mechanism.

## Export Training Data

### Command Line

```bash
# Export to default location (training-data.jsonl in current directory)
pnpm tsx scripts/export-training-data.ts

# Export to custom location
pnpm tsx scripts/export-training-data.ts --output=/path/to/training-data.jsonl
```

### Output Format

JSONL file where each line is a JSON record:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "ticket_id": "660e8400-e29b-41d4-a716-446655440001",
  "draft_id": "770e8400-e29b-41d4-a716-446655440002",
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

## Query Reviews Programmatically

### Get Review Statistics

```typescript
import { getReviewStats } from "@agents/db";

async function printStats() {
  const stats = await getReviewStats();
  console.log(stats);
  // Output: { total: 42, approved: 25, edited: 12, rejected: 5 }
}
```

### Get Reviews by Decision Type

```typescript
import { getHumanReviewsByDecision } from "@agents/db";

async function getApprovals() {
  const reviews = await getHumanReviewsByDecision("approve", 10);
  console.log(`Last 10 approvals:`, reviews);
}
```

### Get Reviews with Full Context

```typescript
import { getHumanReviewsWithContext } from "@agents/db";

async function getRecentReviews() {
  const reviews = await getHumanReviewsWithContext(5);
  
  reviews.forEach(review => {
    console.log({
      decision: review.decision,
      ticketId: review.ticketId,
      originalReason: review.draft?.ticket?.reason,
      draftConfidence: review.draft?.confidence,
      finalText: review.finalText
    });
  });
}
```

## Understanding the Data

### Decision Types

- **approve**: User approved the generated draft
  - `finalText` contains: The generated draft text
  - Use for: High-confidence training examples

- **edit**: User modified the draft before sending
  - `finalText` contains: The reviewer's custom text
  - Use for: Understanding user preferences, tone adjustments

- **reject**: User rejected the draft
  - `finalText` contains: Reviewer's reason for rejection
  - Use for: Error analysis, pattern refinement

### PII Protection

All sensitive data is automatically masked:

```
Before:  customer@example.com → After:  [email]
Before:  U12345ABCDE67       → After:  [slack_id]
Before:  +47 912 34 567      → After:  [phone]
Before:  Residential addr    → After:  [address]
```

All exports are safe for external use (training, sharing, etc).

## Running Tests

### Test All Components

```bash
# Full CI pipeline (recommended)
pnpm build && pnpm lint && pnpm test
```

### Test Slack Interactions Only

```bash
node --enable-source-maps ./node_modules/tsx/dist/cli.mjs api/slack/interactions.test.ts
```

### Test Block Rendering Only

```bash
node --enable-source-maps ./node_modules/tsx/dist/cli.mjs apps/slack-bot/src/tests/slack-blocks.test.ts
```

## Integration with Slack

### How Decisions Are Captured

1. **User Reviews Draft in Slack**
   - Message contains: Original email, generated draft, 3 buttons (Approve/Edit/Reject)

2. **User Clicks Approve**
   - Handler calls: `createHumanReview({ decision: "approve", finalText: draft })`
   - Message updates: Green checkmark with "Approved" status

3. **User Clicks Edit**
   - Modal opens: Text input with current draft pre-filled
   - User submits custom text
   - Handler calls: `createHumanReview({ decision: "edit", finalText: customText })`
   - Message updates: Pencil icon with "Edited" status

4. **User Clicks Reject**
   - Modal opens: Text input asking "Why should this be rejected?"
   - User enters reason (max 2000 chars)
   - Handler calls: `createHumanReview({ decision: "reject", finalText: reason })`
   - Message updates: Red X with reason displayed

### All decisions include:

- `ticketId` - Original ticket reference
- `draftId` - Generated draft reference
- `reviewerSlackId` - Who made the decision (masked)
- `createdAt` - When decision was made

## Next Steps

### Immediate (Ready to Use)

- Export data for analysis: `pnpm tsx scripts/export-training-data.ts`
- Query stats: `getReviewStats()` from code
- Monitor decision mix in dashboards

### Short Term (1-2 weeks)

- Set up nightly cron job for automated exports
- Integrate approved drafts into vector store
- Analyze top rejection reasons

### Medium Term (Month+)

- Fine-tune model on approved examples (500+ required)
- Update prompts based on rejection patterns
- Track quality improvements (approval rate, confidence)

## Troubleshooting

### Export Shows No Data

Check database connection:
```bash
echo "SELECT COUNT(*) FROM human_reviews;" | psql $DATABASE_URL
```

### Tests Failing

Ensure environment variables are set:
```bash
# Check required env vars
echo "DATABASE_URL=$DATABASE_URL"
echo "SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN"
```

### PII Still Visible

This should not happen as `maskPII()` is automatic, but if unsure:
```typescript
import { maskPII } from "@agents/core";
console.log(maskPII("customer@example.com")); // Output: ***masked***
```

## Support

- **Architecture Questions**: See `FEEDBACK_LOOP_IMPLEMENTATION.md`
- **Code Examples**: See this file (above)
- **Database Schema**: See `packages/db/src/schema.ts`
- **Test Examples**: See `api/slack/interactions.test.ts`
