# Agents Monorepo

**Hybrid deterministic/AI email processing system with Slack HITM for customer support automation.**

## Quick Start

See [`documentation/deployment/QUICKSTART.md`](documentation/deployment/QUICKSTART.md) for step-by-step setup instructions (< 10 minutes).

**TL;DR:**

```bash
pnpm install
cd infra && docker compose up -d
cd packages/db && pnpm drizzle-kit push
cp .env.example .env  # Add your credentials
pnpm run build
pnpm exec tsx apps/agent/src/index.ts  # Test the system
```

## Architecture (Hybrid - January 2025)

This system uses a **hybrid deterministic/AI approach** for optimal reliability and accuracy:

```
Email → Deterministic Extract → {Standard Case: Templates | Complex Case: OpenAI} → Database → Slack HITM → Human follow-up
```

**Key Features:**
- ⚡ **<500ms processing** for standard cases (deterministic)
- 🧠 **<3s processing** for complex cases (OpenAI fallback)
- 🎯 **100% reliable** deterministic extraction for 80-90% of cases
- 💰 **Minimal AI costs** (only for complex cases)
- 🛡️ **GDPR compliant** PII masking
- 🤝 **Human-in-the-middle** Slack approval workflow
- ✅ **Policy-guaranteed** template-based responses
- 🛑 **Strict cancellation gating** that requires multi-signal intent before any draft is produced

See [`SIMPLIFICATION_SUMMARY.md`](SIMPLIFICATION_SUMMARY.md) for complete details on the hybrid architecture.

## 🎯 System Overview (Updated January 2025)

This project demonstrates production-ready implementation of:

- ⚡ **Hybrid Processing**: Deterministic + OpenAI fallback for complex cases
- 🔒 **PII Masking**: GDPR-compliant email/phone/address masking
- 📊 **Enhanced Logging**: Request IDs, Slack health checks, and retry monitoring
- ✅ **Standardized Webhooks**: Consistent subject/body input format
- 🚀 **Fast Performance**: <500ms deterministic, <3s with OpenAI fallback
- 🎯 **Health Checks**: Comprehensive monitoring with Slack connectivity tests
- 🤝 **Reliable Slack HITM**: Enhanced retry logic and background task handling (Slack is the only reviewer surface; the experimental operator UI has been removed)
- 📋 **Database Persistence**: Tickets, drafts, and human reviews tracked
- 🌐 **Multi-Language Support**: Norwegian, English, and Swedish templates
- 🔄 **Retry Queues**: Automatic retry for failed Slack posts with exponential backoff
- 🧠 **Intent Safeguards**: Strong-phrase and verb+subscription matching plus expanded exclusion lists prevent non-cancellation emails (login issues, charging errors, installer updates) from generating drafts

**Architecture Note:** The system evolved from pure simplification to a hybrid approach that combines the reliability of deterministic processing with the accuracy of AI for complex cases. See details in `SIMPLIFICATION_SUMMARY.md`.

## Project Structure

- `api/` - Vercel Serverless Functions
  - `webhook.ts` - Inbound email webhook handler
  - `health.ts` - Health check endpoint
  - `cron/export-training-data.ts` - Monthly training data export
  - `cron/process-slack-retry.ts` - Slack retry queue processor
  - `slack/interactions.ts` - Slack HITM button handlers
- `public/` - Static files
  - `index.html` - API documentation and landing page
- `apps/` - Application services
  - `agent` - Hybrid email processor (deterministic + OpenAI fallback)
  - `slack-bot` - HITM review flow with retry queue
- `packages/` - Shared libraries
  - `core` - Utils, PII masking, Zod schemas
  - `prompts` - Prompt templates and extraction schemas
  - `db` - Drizzle ORM schema and repos
- `documentation/` - Project documentation
- `infra/` - Docker Compose for local dev
- `ops/scripts/` - Training loop scripts (export, eval, fine-tuning)

## Documentation

All project documentation is organized in the [`documentation/`](documentation/) directory:

- **Getting Started**: [`documentation/deployment/QUICKSTART.md`](documentation/deployment/QUICKSTART.md)
- **Project Requirements**: [`documentation/project/prd.md`](documentation/project/prd.md)
- **Technical Architecture**: [`documentation/project/architecture.md`](documentation/project/architecture.md)
- **Cursor Setup**: [`documentation/cursor/CURSOR_SETUP.md`](documentation/cursor/CURSOR_SETUP.md)
- **Deployment Guide**: [`documentation/deployment/DEPLOYMENT.md`](documentation/deployment/DEPLOYMENT.md)

See [`documentation/README.md`](documentation/README.md) for complete documentation index.

## Cursor IDE Setup

**Quick Start**:

1. The project uses latest Cursor features (Rules, Memories, Hooks, MCP, Custom Modes)
2. **Restart Cursor** after cloning to load all configurations
3. Install recommended extensions (prompted automatically)
4. See [`documentation/cursor/CURSOR_SETUP.md`](documentation/cursor/CURSOR_SETUP.md) for initial setup
5. See [`documentation/cursor/CURSOR_FEATURES.md`](documentation/cursor/CURSOR_FEATURES.md) for all features and optimizations
6. See [`documentation/cursor/CURSOR_RULES_MIGRATION.md`](documentation/cursor/CURSOR_RULES_MIGRATION.md) for rules structure

**Latest Features**:

- 📋 **Cursor Rules**: Organized `.cursor/rules/` with `.mdc` files (context-aware)
- 🧠 **Cursor Memories**: Auto-loaded project knowledge
- 🔗 **Agent Hooks**: Pre/post request automation (PII checks, reminders)
- 🌐 **MCP Servers**: Exa (web search) + Context7 (library docs)
- 🎯 **Custom Modes**: Agent Dev, DB Schema, Slack HITM, Eval & FT
- ⚡ **Auto-context**: `@prd.md`, `@policies.md`, `.cursormemory`
- 🎨 **Format on save**, ESLint auto-fix
- 🚀 **Turborepo** for parallel builds
