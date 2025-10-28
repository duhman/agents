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

## Initial Setup: Create Persistent Assistants

The system uses **persistent reusable assistants** created once and reused across all requests. This ensures consistency, enables performance tracking, and avoids cold-start overhead.

### Step 1: Create Assistants

Run the setup script to create both assistants programmatically:

```bash
# Ensure you have OPENAI_API_KEY and OPENAI_VECTOR_STORE_ID in .env
tsx scripts/setup-assistants.ts
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
- Model: `gpt-5-mini`
- Temperature: 0 (deterministic, consistent extraction)

### Response Assistant

- Generates dynamic, personalized customer responses
- Automatically searches the vector store for similar resolved cases and policies
- Generates responses in the customer's language with full policy compliance
- Uses streaming for real-time response generation
- Model: `gpt-5-mini`
- Temperature: 0.3 (controlled creativity, natural language)

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

- `tsx scripts/setup-assistants.ts` – Create or update persistent assistants.

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
- `SLACK_INTEGRATION_ENHANCEMENTS.md` – Detailed Slack reliability improvements.
- `SIMPLIFICATION_SUMMARY.md` – Previous architecture evolution documentation.
- `ZOD_UPGRADE_NOTES.md` – Zod v4 upgrade constraints and current v3 requirements.

## Deployment Notes

- `api/webhook.ts` and `api/slack/interactions.ts` are standard Vercel Node runtimes.
- `api/cron/process-slack-retry.ts` processes queued Slack posts (protect with `CRON_SECRET`).
- Ensure all required environment variables are set in production (see Environment Variables section).
- Run the setup script once to create assistants, then store their IDs as environment variables in Vercel/production.
- Assistants are persistent and reused across all requests – no creation overhead at runtime.

## Dependencies

- **Zod v3**: Currently using Zod v3.22.0 across all packages. Zod v4 upgrade blocked by OpenAI SDK compatibility (see `openai/openai-node#1576`).
- **OpenAI SDK**: v6.2.0 with Assistants API for structured outputs and file_search tool integration
- **Database**: Drizzle ORM with Postgres
- **Runtime**: Node.js 20+ with TypeScript strict mode

## Key Features

- **Persistent Assistants**: Same assistants reused across all requests for consistency and performance tracking
- **Dynamic Responses**: AI generates personalized responses for each customer, not using fixed templates
- **Vector Store Integration**: Automatic semantic search across customer documentation and policies
- **Multilingual Support**: Norwegian (default), English, Swedish support with language-aware responses
- **Edge Case Handling**: Specialized handling for payment issues, app access problems, corporate accounts, etc.
- **PII Masking**: All sensitive data masked before any AI processing
- **Streaming Responses**: Real-time response generation for faster user feedback
- **Hybrid Validation**: Clear intent detection before automated response generation
- **Metrics Collection**: Comprehensive tracking of processing methods, performance, and quality

## Status

The system has been migrated to use **persistent reusable assistants** created once and reused across all requests. This enables:

- Consistent processing across all requests (same assistant for all emails)
- Performance tracking over time via OpenAI Dashboard
- Zero cold-start overhead – no assistant creation during request processing
- Easy updates – modify instructions by re-running the setup script
- More accurate contextual analysis of customer requests
- Personalized, context-aware responses instead of templates
- Automatic vector store retrieval for policy and example guidance
- Streaming support for real-time response generation
- Maintained human-in-the-middle review for quality assurance
