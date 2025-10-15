# Quick Start Guide

Get the agent system running locally in under 10 minutes.

## Prerequisites

- Node.js 20+
- pnpm (or npm/yarn)
- OrbStack or Docker
- OpenAI API key
- Slack bot token (optional for HITM testing)

## Step 1: Install Dependencies

```bash
pnpm install
```

## Step 2: Start Local Postgres

```bash
cd infra
docker compose up -d
# or with OrbStack:
# orb compose up -d

# Verify it's running
docker ps | grep agents-postgres
```

## Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add:
```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/agents
OPENAI_API_KEY=sk-...  # Your OpenAI API key
```

Optional (for Slack HITM testing):
```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_REVIEW_CHANNEL=C...
```

## Step 4: Push Database Schema

```bash
cd packages/db
pnpm drizzle-kit push
```

You should see:
```
✓ Pushed schema to database
```

## Step 5: Test the Agent

Run a test classification + draft:

```bash
cd apps/agent
pnpm dev
```

This will process a sample Norwegian cancellation email and output:
- Extracted fields (is_cancellation, reason, move_date, language)
- Draft reply in Norwegian
- Confidence score
- Intent gating logs indicating that only clear cancellations produce drafts (non-cases exit early)

## Step 6: (Optional) Test Slack Bot

If you have Slack credentials configured:

```bash
cd apps/slack-bot
pnpm dev
```

Then use ngrok to expose local webhook:
```bash
ngrok http 3000
```

Update your Slack app's Request URL to: `https://YOUR-NGROK.ngrok.io/slack/events`

## Step 7: Run Evaluation

Test against the golden set:

```bash
tsx ops/scripts/eval.ts
```

You should see:
```
✓ Accuracy: 100% (3/3)
```

## Next Steps

### Local Development
- Modify prompts in `packages/prompts/src/templates.ts`
- Adjust PII masking in `packages/core/src/index.ts`
- Update schema in `packages/db/src/schema.ts`

### Deploy to Vercel
See `DEPLOYMENT.md` for full deployment instructions.

### Configure Cursor
See `CURSOR_SETUP.md` to optimize your IDE for this project.

### Fine-Tuning
Once you have approved reviews in the database:
```bash
tsx ops/scripts/export-jsonl.ts
tsx ops/scripts/finetune.ts
```

## Common Issues

### Database connection error
- Verify Postgres is running: `docker ps`
- Check `DATABASE_URL` in `.env`
- Ensure port 5432 is not in use

### OpenAI API error
- Verify `OPENAI_API_KEY` is set
- Check API key has sufficient credits
- Ensure you're using a supported model

### Slack webhook timeout
- Slack requires response <3s
- Use async jobs for long-running tasks
- Check ngrok tunnel is active
- No additional operator UI is deployed—reviewers interact entirely through Slack

## Project Structure

```
/apps
  /agent       - OpenAI classify+draft worker
  /slack-bot   - HITM review interface
  /mailer      - Optional HubSpot/SMTP sender (not wired into HITM yet)
  /ingestor    - Webhook handlers
/packages
  /core        - PII masking, env validation
  /prompts     - Extraction schema, templates
  /db          - Drizzle ORM schema
  /evaluation  - Eval harness
/ops
  /scripts     - Export, eval, fine-tuning
/docs          - PRD, policies, prompts, rules
/infra         - Docker Compose for local Postgres
```

## Help

- **Requirements:** `docs/prd.md`
- **Architecture:** `documentation/project/architecture.md`
- **Deployment:** `DEPLOYMENT.md`
- **Cursor Setup:** `CURSOR_SETUP.md`
- **Policies:** `docs/policies.md`
