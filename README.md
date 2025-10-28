# Agents Monorepo

Production email automation for HubSpot cancellations with a Slack human-in-the-middle (HITM) checkpoint.

The pipeline is intentionally narrow:

```
HubSpot webhook → OpenAI Assistants API (extraction + response generation with vector store) →
Postgres (tickets + drafts) → Slack review bot → Human follow up
```

## Quick Start

```bash
pnpm install
cd infra && docker compose up -d          # Local Postgres
cp .env.example .env                      # Fill in DATABASE_URL, OPENAI_API_KEY, OPENAI_VECTOR_STORE_ID
pnpm --filter @agents/db push             # Apply schema
pnpm --filter @agents/agent build         # Compile Assistants API processor
pnpm --filter @agents/agent dev           # Run local processing demo
```

Optional for full HITM loop:

1. Add `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, and `SLACK_REVIEW_CHANNEL` to `.env`.
2. Run `pnpm --filter @agents/slack-bot build`.
3. Deploy `api/webhook.ts` and `api/slack/interactions.ts` (Vercel-ready).

## Setup Workflow

```bash
# One-time setup (or when updating config)
pnpm tsx scripts/setup-assistants.ts

# Script outputs:
# ✓ Extraction Assistant created: asst_abc123...
# ✓ Response Assistant created: asst_xyz789...
# 
# Add to .env:
# OPENAI_EXTRACTION_ASSISTANT_ID=asst_abc123...
# OPENAI_RESPONSE_ASSISTANT_ID=asst_xyz789...

# Update Vercel environment variables
vercel env add OPENAI_EXTRACTION_ASSISTANT_ID
vercel env add OPENAI_RESPONSE_ASSISTANT_ID

# Deploy
vercel --prod
```

## Initial Setup: Create Persistent Assistants

The system uses **persistent reusable assistants** created once and reused across all requests. This ensures consistency, enables performance tracking, and avoids cold-start overhead.

### Step 1: Create Assistants

Run the setup script to create both assistants programmatically:

```bash
# Ensure you have OPENAI_API_KEY and OPENAI_VECTOR_STORE_ID in .env
pnpm tsx scripts/setup-assistants.ts
```

The script will output:

```
============================================================
Setup Complete!
============================================================

Add these environment variables to your .env file:

OPENAI_EXTRACTION_ASSISTANT_ID=asst_abc123...
OPENAI_RESPONSE_ASSISTANT_ID=asst_xyz789...
```

### Step 2: Save Assistant IDs

Add the output IDs to your `.env` file:

```bash
OPENAI_EXTRACTION_ASSISTANT_ID=asst_abc123...
OPENAI_RESPONSE_ASSISTANT_ID=asst_xyz789...
```

### Step 3: Verify Configuration

Tests will validate that the assistant IDs are present:

```bash
pnpm test
```

### Updating Assistants

To update assistant instructions or settings in the future, re-run the setup script with existing assistant IDs in `.env`. The script will update them instead of creating new ones.

## Core Services

- **api/webhook.ts** – HubSpot-facing endpoint. Validates payloads, calls the Assistants API processor, and queues Slack review posts.
- **apps/agent** – Assistants API processor that masks PII, extracts cancellation data via extraction assistant, generates dynamic responses via response assistant with automatic vector store retrieval, and stores drafts/tickets.
- **apps/slack-bot** – Formats drafts for reviewers, posts to Slack, and manages a retry queue plus interaction callbacks.
- **packages/core** – Shared logging, env parsing, retry helpers, and webhook validation.
- **packages/prompts** – Extraction rules, templates, policy validation, and schemas.
- **packages/db** – Drizzle ORM schema and repositories for tickets, drafts, reviews, and Slack retries.

## Architecture: OpenAI Assistants API

The system uses two persistent assistants created once and reused across all requests:

### Extraction Assistant

- Analyzes customer emails to extract structured cancellation data
- Automatically searches the vector store for similar customer cases
- Returns structured JSON with: is_cancellation, reason, move_date, language, edge_case, confidence_factors
- Model: `gpt-4.1` (Assistants API compatible, higher intelligence)
- Temperature: 0 (deterministic, consistent extraction)

### Response Assistant

- Generates dynamic, personalized customer responses
- Automatically searches the vector store for similar resolved cases and policies
- Generates responses in the customer's language with full policy compliance
- Uses streaming for real-time response generation
- Model: `gpt-4.1` (Assistants API compatible, higher intelligence)
- Temperature: 0.3 (controlled creativity, personalization)

### Vector Store Integration

- Both assistants automatically use OpenAI's `file_search` tool
- No manual vector store queries needed
- Semantic search across customer support documents and policies
- Enables context-aware responses based on real examples

## Project Structure

```
api/               Vercel functions (webhook, health, Slack interactions, cron for retry queue)
apps/agent/        Assistants API processor with assistant configs and streaming
apps/slack-bot/    Slack HITM workflow and retry processing
apps/docs/         Fumadocs-based documentation site (Next.js + MDX)
packages/core/     Shared utilities (env validation, logging, retry helpers)
packages/prompts/  Extraction schemas, templates, policy validation
packages/db/       Postgres schema & repositories using Drizzle ORM
infra/             Docker Compose for local Postgres
public/index.html  Minimal API landing page
scripts/           Setup and utility scripts
```

## Environment Variables

Required:

```bash
OPENAI_API_KEY=sk-...
OPENAI_VECTOR_STORE_ID=vs_...
DATABASE_URL=postgresql://...
OPENAI_EXTRACTION_ASSISTANT_ID=asst_...
OPENAI_RESPONSE_ASSISTANT_ID=asst_...
```

Optional:

```bash
# Slack integration
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_REVIEW_CHANNEL=C...

# HubSpot integration
HUBSPOT_API_KEY=pat-...
HUBSPOT_WEBHOOK_SECRET=...
```

## Commands

- `pnpm build` – Build all packages via Turborepo.
- `pnpm --filter @agents/agent dev` – Watch mode for the Assistants API processor.
- `pnpm --filter @agents/slack-bot build` – Compile the Slack bot.
- `pnpm --filter @agents/docs dev` – Start documentation site locally.
- `pnpm test` – Run agent tests (Assistants API processor).
- `pnpm lint` – Lint all workspaces.
- `pnpm format` – Prettier for TypeScript/JavaScript/JSON/Markdown.

### Assistant Management

- `pnpm tsx scripts/setup-assistants.ts` – Create or update persistent assistants.

## Documentation

The project includes comprehensive documentation built with [Fumadocs](https://fumadocs.dev) and Next.js:

### Accessing Documentation

**Local Development:**

```bash
pnpm --filter @agents/docs dev
```

Then visit `http://localhost:3000` to browse the interactive documentation.

**Build for Production:**

```bash
pnpm --filter @agents/docs build
pnpm --filter @agents/docs start
```

### Documentation Structure

- **Overview** – High-level architecture and key repositories
- **Data Model** – Database schema, relationships, and data flow
- **Assistants API Processing** – Extraction and response generation with vector stores
- **Operations** – Deployment, monitoring, and maintenance procedures
- **Packages** – Shared library documentation and APIs
- **Policies** – Business rules, compliance, and response guidelines

The documentation is located in `apps/docs/content/docs/` and automatically builds from MDX files.

### Cursor AI Integration

The project includes enhanced Cursor AI IDE rules for Assistants API and documentation management:

**Features:**

- **Assistants API patterns**: Best practices for thread management, streaming, and RAG
- **Smart documentation updates**: Cursor AI follows Fumadocs patterns and best practices
- **Structure management**: Maintains consistent frontmatter and navigation
- **Content sync**: Keeps documentation in sync with codebase changes
- **MDX formatting**: Ensures proper structure and syntax highlighting

The integration is configured via `.cursor/rules/ai-processing.mdc` and `.cursor/rules/fumadocs-integration.mdc`.

## Reference Docs

- `HUBSPOT_WEBHOOK_SETUP.md` – HubSpot workflow configuration.
- `SLACK_BOT_SETUP_GUIDE.md` – Slack app credentials and review channel wiring.
- `SLACK_INTEGRATION_ENHANCEMENTS.md`