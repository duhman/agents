# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Monorepo and Tooling

- **Package manager**: pnpm (>= 8)
- **Task runner**: Turborepo 
- **Node version**: >= 20
- **Workspace layout**: `apps/` and `packages/`
- **Cursor rules**: `.cursor/rules/` (nested rules override parents; uses MDC format)
- **See AGENTS.md for contributor quick start**

## Essential Commands

### Installation and Setup
```bash
pnpm install
cd infra && docker compose up -d  # Local Postgres
cd packages/db && pnpm drizzle-kit push  # Schema setup
cp .env.example .env  # Add your credentials
```

### Build
```bash
# Root build (all packages in dependency order)
pnpm build

# Per-package build
pnpm --filter @agents/agent build
```

### Lint
```bash
# Lint all packages
pnpm lint

# Auto-fix linting issues
pnpm lint -- --fix
```

### Test
```bash
# Run all tests (currently just agent tests)
pnpm test

# Single test (direct)
node --enable-source-maps ./node_modules/tsx/dist/cli.mjs apps/agent/src/tests/classification.test.ts

# Single test (scoped to package)
pnpm --filter @agents/agent exec -- \
  node --enable-source-maps ./node_modules/tsx/dist/cli.mjs apps/agent/src/tests/classification.test.ts
```

### Format
```bash
pnpm format
pnpm format:check
```

## Key Development Workflows

### Per-package Tasks
```bash
# Examples with common packages
pnpm --filter @agents/agent build
pnpm --filter @agents/agent dev
pnpm --filter @agents/db push
pnpm --filter @agents/db studio
```

### Parallel Development
```bash
# Run dev servers for all apps in parallel
pnpm dev
```

### Additional Commands
```bash
pnpm eval                 # Run evaluation against golden set
pnpm export-jsonl         # Export training data
pnpm finetune            # Launch fine-tuning job
pnpm cursor:sync         # Update Cursor rules
```

### Import Conventions
- Prefer workspace aliases (`@agents/core`, `@agents/db`)
- Use `type` imports for TypeScript types
- Explicit return types; camelCase functions, PascalCase types; ALL_CAPS constants

## High-level Architecture: Hybrid Deterministic/AI Email Processing

### Overview
The system processes customer emails using a **hybrid deterministic-first, AI-fallback** strategy:

```
Email → PII Masking → Deterministic Extract → {Standard Case: Templates | Complex Case: OpenAI} → Database → Slack HITM
```

### Core Flow Components

**Ingestion**: HubSpot webhook → Vercel serverless functions (`api/webhook.ts`)

**Processing Pipeline**:
- `apps/agent/src/hybrid-processor.ts` - Main hybrid processing logic
- `apps/agent/src/simplified-processor.ts` - Pure deterministic fallback
- `packages/core/src/index.ts` - PII masking, retry logic, logging
- `packages/prompts/src/templates-enhanced.ts` - OpenAI schemas and templates

**Deterministic Rules**: 
- Pattern matching with regex for cancellation signals
- Strong phrase detection and aligned signal analysis
- False-positive guards (login issues, charging control, installers)
- Language detection (Norwegian, English, Swedish)

**AI Fallback**: 
- OpenAI GPT-4o-2024-08-06 with structured outputs
- Complex case routing (unclear intent, edge cases, policy risks)
- Enhanced extraction schemas with comprehensive edge case support

**Decision Engine**: 
- Template-based draft generation (policy-compliant)
- Edge case detection (corporate accounts, app access, future dates)
- Confidence scoring and validation

**Persistence**: 
- PostgreSQL with Drizzle ORM
- Schema: `packages/db/src/schema.ts`
- Tables: tickets → drafts → human_reviews

**Human-in-the-Middle**: 
- Slack bot workflow (`apps/slack-bot/`)
- Modal-based review (approve/edit/reject)
- Background retry with exponential backoff

**Observability**: 
- Structured logging with request IDs
- Metrics collection (`apps/agent/src/metrics.ts`)
- Processing method tracking (deterministic vs OpenAI)
- Health checks for Slack connectivity

### Notable Architecture Benefits
- **<500ms processing** for standard cases (deterministic)
- **<3s processing** for complex cases (OpenAI fallback) 
- **100% reliable** deterministic extraction for 80-90% of cases
- **Minimal AI costs** (only for complex cases)
- **GDPR compliant** PII masking

## Project Structure (non-exhaustive)

### Apps
- `apps/agent/` - Email classification and draft generation worker
- `apps/slack-bot/` - HITM (Human-in-the-Middle) review interface
- `apps/mailer/` - Outbound email sending (future integration)
- `apps/ingestor/` - Dependency container for serverless functions
- `apps/agent-builder/` - Agent configuration interface
- `apps/agent-builder-api/` - API for agent builder

### Packages  
- `packages/core/` - Utilities, PII masking, env validation, logging
- `packages/prompts/` - OpenAI schemas, extraction templates, draft generation
- `packages/db/` - Drizzle ORM schema, repositories, migrations
- `packages/evaluation/` - Evaluation harness and accuracy metrics
- `packages/agents-runtime/` - AI SDK workflow runtime (experimental)

## Testing Patterns and Evaluation

### Test Organization
- Test files: `*.test.ts` pattern, primarily in `apps/agent/src/tests/`
- Framework: Node.js with tsx for TypeScript execution
- Source maps enabled for proper stack traces

### Running Tests
```bash
# Example single test file
node --enable-source-maps ./node_modules/tsx/dist/cli.mjs apps/agent/src/tests/classification.test.ts

# Scoped to package
pnpm --filter @agents/agent exec -- \
  node --enable-source-maps ./node_modules/tsx/dist/cli.mjs apps/agent/src/tests/classification.test.ts
```

### Evaluation and Benchmarks
```bash
# Run evaluation against golden dataset
pnpm eval

# Export training data for fine-tuning
pnpm export-jsonl

# Launch OpenAI fine-tuning job
pnpm finetune
```

**Evaluation Setup**: 
- Golden set testing in `packages/evaluation/`
- Accuracy metrics: intent detection, field extraction, policy compliance
- Threshold: 90%+ accuracy required

## Database Setup and Management

### Stack
- **Database**: PostgreSQL 
- **ORM**: Drizzle ORM
- **Schema**: `packages/db/src/schema.ts`
- **Migrations**: Managed via `drizzle-kit`

### Common Commands
```bash
# Push schema changes to database (development)
pnpm db:push

# Open Drizzle Studio (database GUI)
pnpm db:studio

# Generate migrations (when needed)
cd packages/db && pnpm drizzle-kit generate

# Push schema to database
cd packages/db && pnpm drizzle-kit push
```

### Environment Variables
Required for database operations:
- `DATABASE_URL` - PostgreSQL connection string
- `OPENAI_API_KEY` - For AI processing
- `SLACK_BOT_TOKEN` - For HITM workflow (optional)
- `SLACK_SIGNING_SECRET` - For webhook verification (optional)

## Deployment Considerations

### Platform Configuration
- **Primary**: Vercel (serverless functions in `api/`)
- **Database**: External PostgreSQL (production)
- **Local Development**: Docker Compose (`infra/docker-compose.yml`)

### Local Development Setup
```bash
# Start local Postgres
cd infra && docker compose up -d

# Verify database is running
docker ps | grep agents-postgres
```

### Build and Deploy Commands
```bash
# Build for production
pnpm build

# Vercel deployment (if configured)
vercel deploy
```

### Required Environment (Production)
- `DATABASE_URL` - Production PostgreSQL
- `OPENAI_API_KEY` - OpenAI API access  
- `SLACK_BOT_TOKEN` - Slack integration
- `SLACK_SIGNING_SECRET` - Webhook security
- `SLACK_REVIEW_CHANNEL` - Channel for HITM reviews

## Assistant Rules Integration

### Cursor IDE Rules
- **Location**: `.cursor/rules/` with MDC format
- **Hierarchy**: Nested rules override parent rules
- **Key Rules**:
  - `core-principles.mdc` - Privacy, policy, hybrid strategy (always applied)
  - `core-architecture.mdc` - OpenAI best practices, hybrid processing
  - `email-classification.mdc` - Deterministic patterns, language heuristics
  - `database-patterns.mdc` - Drizzle ORM patterns
  - `observability-logging.mdc` - Structured logging, request IDs
  - `slack-hitm.mdc` - Slack workflow patterns
  - `monorepo-workspace.mdc` - pnpm/turbo workspace standards

### Development Principles
- **Privacy First**: Always mask PII before LLM calls using `maskPII()` from `@agents/core`
- **Schema-Driven**: Use Zod schemas with `.optional().nullable()` for optional fields
- **Hybrid Processing**: Deterministic first, OpenAI fallback for complex cases
- **Policy Compliance**: Norwegian default, end-of-month cancellation policy
- **Code Quality**: TypeScript strict mode, structured logging with request IDs

### Quick Start Reference
- Install dependencies and start local services as shown in Essential Commands
- The system uses hybrid deterministic/AI processing optimized for <500ms response time
- Human reviewers use Slack modals; no separate operator UI deployed
- All customer data is PII-masked before AI processing for GDPR compliance

<citations>
<document>
    <document_type>RULE</document_type>
    <document_id>/Users/bigmac/projects/agents/AGENTS.md</document_id>
</document>
</citations>