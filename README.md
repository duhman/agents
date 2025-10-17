# Agents Monorepo

Production email automation for HubSpot cancellations with a Slack human-in-the-middle (HITM) checkpoint.

The pipeline is intentionally narrow:

```
HubSpot webhook → Hybrid email processor (deterministic + OpenAI fallback) →
Postgres (tickets + drafts) → Slack review bot → Human follow up
```

## Quick Start

```bash
pnpm install
cd infra && docker compose up -d          # Local Postgres
cp .env.example .env                      # Fill in DATABASE_URL and OPENAI_API_KEY
pnpm --filter @agents/db push             # Apply schema
pnpm --filter @agents/agent build         # Compile hybrid processor
pnpm --filter @agents/agent dev           # Run local processing demo
```

Optional for full HITM loop:

1. Add `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `SLACK_REVIEW_CHANNEL` to `.env`.
2. Run `pnpm --filter @agents/slack-bot build`.
3. Deploy `api/webhook.ts` and `api/slack/interactions.ts` (Vercel-ready).

## Core Services

- **api/webhook.ts** – HubSpot-facing endpoint. Validates payloads, calls the hybrid processor, and queues Slack review posts.
- **apps/agent** – Hybrid processor that masks PII, performs deterministic extraction, falls back to OpenAI when intent is unclear, and stores drafts/tickets.
- **apps/slack-bot** – Formats drafts for reviewers, posts to Slack, and manages a retry queue plus interaction callbacks.
- **packages/core** – Shared logging, env parsing, retry helpers, and webhook validation.
- **packages/prompts** – Deterministic patterns, edge-case detection, and template-based drafting.
- **packages/db** – Drizzle ORM schema and repositories for tickets, drafts, reviews, and Slack retries.

## Project Structure

```
api/               Vercel functions (webhook, health, Slack interactions, cron for retry queue)
apps/agent/        Hybrid processor entrypoint + supporting modules
apps/slack-bot/    Slack HITM workflow and retry processing
packages/core/     Shared utilities (env validation, logging, retry helpers)
packages/prompts/  Extraction rules, templates, policy validation
packages/db/       Postgres schema & repositories using Drizzle ORM
infra/             Docker Compose for local Postgres
public/index.html  Minimal API landing page
```

## Commands

- `pnpm build` – Build all packages via Turborepo.
- `pnpm --filter @agents/agent dev` – Watch mode for the hybrid processor.
- `pnpm --filter @agents/slack-bot build` – Compile the Slack bot.
- `pnpm test` – Run agent classification tests.
- `pnpm lint` – Lint all workspaces.
- `pnpm format` – Prettier for TypeScript/JavaScript/JSON/Markdown.

## Reference Docs

- `HUBSPOT_WEBHOOK_SETUP.md` – HubSpot workflow configuration.
- `SLACK_BOT_SETUP_GUIDE.md` – Slack app credentials and review channel wiring.
- `SLACK_INTEGRATION_ENHANCEMENTS.md` – Detailed Slack reliability improvements.
- `SIMPLIFICATION_SUMMARY.md` – Rationale for the hybrid deterministic + OpenAI approach.

## Deployment Notes

- `api/webhook.ts` and `api/slack/interactions.ts` are standard Vercel Node runtimes.
- `api/cron/process-slack-retry.ts` processes queued Slack posts (protect with `CRON_SECRET`).
- Ensure `DATABASE_URL`, `OPENAI_API_KEY`, `SLACK_*`, and optional `HUBSPOT_*` env vars are set in production.

## Status

The experimental agent builder, fine-tuning scripts, and other non-core tooling have been removed so the repository focuses solely on the HubSpot → OpenAI → Slack HITM workflow.
