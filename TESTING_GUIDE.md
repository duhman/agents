# Testing Guide: Cancellation Agent

## Quick Test (Local)

### 1. Start Services

```bash
# Start PostgreSQL
cd infra && docker compose up -d

# Push schema
cd ../packages/db && pnpm drizzle-kit push:pg
```

### 2. Test Email Processing

```bash
cd /Users/bigmac/projects/agents

# Create test script
cat > test-quick.ts << 'EOF'
import "dotenv/config";
import { processEmail } from "./apps/agent/dist/index.js";

const testEmail = `
Hei,
Jeg skal flytte til Oslo 15. mars og vil si opp abonnementet mitt.
Mvh,
Ole
`;

processEmail({
  source: "test",
  customerEmail: "ole@example.com",
  rawEmail: testEmail
})
  .then((result) => {
    console.log("\n✅ Success!");
    console.log(`Ticket: ${result.ticket?.id}`);
    console.log(`Draft: ${result.draft?.id}`);
    console.log(`Confidence: ${result.confidence}`);
    console.log(`\nDraft Text:\n${result.draft?.draftText}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });
EOF

# Run test
npx tsx test-quick.ts

# Clean up
rm test-quick.ts
```

**Expected Output**:

- ✅ Ticket created with UUID
- ✅ Draft created with policy-compliant text
- ✅ Confidence score: 1.0
- ✅ Draft includes: end-of-month policy + app instructions

## Full Integration Test (Webhook + Slack)

### 1. Configure Environment

```bash
# Add Slack credentials
vercel env add SLACK_REVIEW_CHANNEL development
# Paste your Slack channel ID (e.g., C01234567)

vercel env add SLACK_BOT_TOKEN development
# Paste your xoxb- token

vercel env add SLACK_SIGNING_SECRET development
# Paste your signing secret
```

### 2. Deploy to Vercel

```bash
vercel --prod
```

### 3. Test Webhook

```bash
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "source": "hubspot",
    "customerEmail": "test@example.com",
    "rawEmail": "Hei, jeg skal flytte og vil si opp abonnementet mitt. Mvh, Ole"
  }'
```

**Expected Response**:

```json
{
  "success": true,
  "ticket_id": "uuid-here",
  "draft_id": "uuid-here",
  "confidence": 1.0,
  "route": "Cancellation Handler",
  "request_id": "uuid-here",
  "processing_time_ms": 2800
}
```

### 4. Verify Slack HITM

Check your Slack channel for a message with:

- 🤖 Draft Review Required header
- Original email (masked)
- Generated draft
- Confidence score
- Extraction details
- Action buttons: Approve / Edit / Reject

### 5. Test Human Review Actions

1. **Approve**: Click "Approve" → Draft should be marked for sending
2. **Edit**: Click "Edit" → Modal opens → Modify text → Submit
3. **Reject**: Click "Reject" → Draft is rejected, no email sent

## Database Verification

```bash
# Check tickets
psql $DATABASE_URL -c "SELECT id, source, reason, language, created_at FROM tickets ORDER BY created_at DESC LIMIT 5;"

# Check drafts
psql $DATABASE_URL -c "SELECT id, ticket_id, language, confidence, model, created_at FROM drafts ORDER BY created_at DESC LIMIT 5;"

# Check human reviews
psql $DATABASE_URL -c "SELECT id, decision, reviewer_slack_id, created_at FROM human_reviews ORDER BY created_at DESC LIMIT 5;"
```

## Validation Checklist

### Email Processing

- [x] PII is masked before OpenAI calls
- [x] Extraction identifies cancellation correctly
- [x] Deterministic fallback creates ticket if agent doesn't
- [x] Deterministic fallback creates draft if agent doesn't
- [x] Draft uses template (not LLM-generated)
- [x] Confidence score calculated consistently
- [x] Processing completes under 30 seconds

### Draft Quality

- [x] Language matches customer (NO/EN)
- [x] End-of-month policy stated
- [x] App self-service instructions included
- [x] Polite, branded tone
- [x] Addresses specific reason (moving)
- [x] Handles move dates appropriately

### Slack HITM

- [x] Message posted to configured channel
- [x] Original email shown (masked)
- [x] Draft text shown
- [x] Confidence percentage shown
- [x] Extraction details shown
- [x] Action buttons work
- [x] Approve action stores review
- [x] Edit action opens modal
- [x] Edit action stores modified text
- [x] Reject action stores decision

### Database

- [x] Tickets table has UUID primary key
- [x] Drafts table references tickets
- [x] Human reviews table references both
- [x] Timestamps are set correctly
- [x] Foreign keys work
- [x] Move dates stored as YYYY-MM-DD

## Troubleshooting

### Issue: "ECONNREFUSED" error

**Solution**: Start PostgreSQL: `cd infra && docker compose up -d`

### Issue: "Agent run completed but no final output"

**Solution**: Check OPENAI_API_KEY is valid and has credits

### Issue: "SLACK_REVIEW_CHANNEL not configured"

**Solution**: Set environment variable: `vercel env add SLACK_REVIEW_CHANNEL production`

### Issue: Draft text is null

**Solution**: This should never happen now due to deterministic fallback. If it does:

1. Check logs for "Agent identified cancellation but didn't create ticket/draft"
2. Verify `generateDraft()` function in `@agents/prompts`
3. Check database connection

### Issue: Processing timeout (>30s)

**Solution**:

1. Check OpenAI API latency
2. Verify AbortSignal timeout is set
3. Consider reducing model calls

## Performance Benchmarks

**Expected Processing Times**:

- Email processing: 2-4 seconds
- Database operations: <200ms
- Slack posting: 100-300ms (async, doesn't block)
- Total webhook response: <5 seconds

**Confidence Scores**:

- Perfect extraction (all fields): 1.0
- Cancellation + reason + no risks: 0.9
- Cancellation + no move date: 0.9
- Cancellation + unknown reason: 0.8
- Base (just cancellation): 0.8

## Monitoring Queries

```sql
-- Success rate (last 24 hours)
SELECT
  COUNT(*) FILTER (WHERE drafts.id IS NOT NULL) * 100.0 / COUNT(*) as success_rate_pct
FROM tickets
LEFT JOIN drafts ON drafts.ticket_id = tickets.id
WHERE tickets.created_at > NOW() - INTERVAL '24 hours';

-- Average confidence
SELECT AVG(CAST(confidence AS DECIMAL)) as avg_confidence
FROM drafts
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Human review decisions
SELECT decision, COUNT(*) as count
FROM human_reviews
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY decision;

-- Fallback usage (template-fallback model)
SELECT COUNT(*) as fallback_count
FROM drafts
WHERE model = 'template-fallback'
AND created_at > NOW() - INTERVAL '24 hours';
```

## Next Steps

1. **Production Deployment**: Deploy to Vercel with all environment variables
2. **Slack Configuration**: Configure webhook URL and interactive components
3. **Monitoring**: Set up alerts for processing failures
4. **Fine-Tuning**: After collecting 500+ approved examples, run fine-tuning
5. **A/B Testing**: Compare agent-generated vs template drafts

## Reference

- Implementation Summary: `IMPLEMENTATION_SUMMARY.md`
- PRD: `documentation/project/prd.md`
- Policies: `documentation/project/policies.md`
- Deployment: `documentation/deployment/DEPLOYMENT.md`
