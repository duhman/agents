# Deployment Guide

## Vercel Setup

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Link Project
```bash
vercel link
```

### 3. Configure Environment Variables
Add these in Vercel Dashboard (Settings → Environment Variables):

**Required:**
- `DATABASE_URL` - Vercel Postgres connection string (with pooling)
- `OPENAI_API_KEY` - OpenAI API key
- `SLACK_BOT_TOKEN` - Slack bot token (xoxb-...)
- `SLACK_SIGNING_SECRET` - Slack signing secret
- `SLACK_REVIEW_CHANNEL` - Slack channel ID for HITM reviews
- `CRON_SECRET` - Random secret for cron auth

**Optional:**
- `HUBSPOT_ACCESS_TOKEN` - For HubSpot Conversations replies
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - For SMTP fallback

### 4. Connect Vercel Postgres
```bash
vercel postgres create agents-db
vercel env pull
```

### 5. Push Database Schema
```bash
cd packages/db
pnpm drizzle-kit push
```

### 6. Deploy
```bash
vercel --prod
```

## Post-Deployment

### Configure Slack App
1. Go to Slack App settings
2. Set Request URL to: `https://your-app.vercel.app/api/slack/events`
3. Enable Interactive Components → Request URL: `https://your-app.vercel.app/api/slack/interactions`
4. Subscribe to events: `message.channels`, `app_mention`

### Configure HubSpot Webhook (Optional)
1. Go to HubSpot → Settings → Integrations → Private Apps
2. Add webhook URL: `https://your-app.vercel.app/api/webhook`
3. Subscribe to: Conversations → New message

### Test Webhook
```bash
# New format (webhook-only approach)
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "source": "hubspot",
    "customerEmail": "test@example.com",
    "subject": "Oppsigelse",
    "body": "Hei, jeg skal flytte og vil si opp."
  }'

# Legacy format (still supported)
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test",
    "customerEmail": "test@example.com",
    "rawEmail": "Subject: Oppsigelse\n\nHei, jeg skal flytte og vil si opp."
  }'
```

## Monitoring

- Vercel Logs: `vercel logs --follow`
- Check Slack for draft reviews
- Monitor fine-tuning jobs: OpenAI Dashboard

## Fine-Tuning Schedule

Run monthly (or via GitHub Actions):
```bash
tsx ops/scripts/export-jsonl.ts
tsx ops/scripts/finetune.ts
```

