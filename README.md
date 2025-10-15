# Agents Monorepo

**Simplified, deterministic email processing system with Slack HITM for customer support automation.**

## Quick Start

See [`documentation/deployment/QUICKSTART.md`](documentation/deployment/QUICKSTART.md) for step-by-step setup instructions (< 10 minutes).

**TL;DR:**

```bash
pnpm install
cd infra && docker compose up -d
cd packages/db && pnpm drizzle-kit push
cp .env.example .env  # Add your credentials
pnpm run build
pnpm exec tsx test-simplified.ts  # Test the system
```

## Architecture (Simplified - October 2025)

This system uses a **deterministic, template-based approach** for maximum reliability and speed:

```
Email → Extract (regex) → Generate Draft (templates) → Database → Slack HITM → Human follow-up
```

**Key Features:**
- ⚡ **<500ms processing** (no AI inference required)
- 🎯 **100% reliable** deterministic extraction and drafting
- 💰 **Zero AI costs** for core workflow
- 🛡️ **GDPR compliant** PII masking
- 🤝 **Human-in-the-middle** Slack approval workflow
- ✅ **Policy-guaranteed** template-based responses
- 🛑 **Strict cancellation gating** that requires multi-signal intent before any draft is produced

See [`SIMPLIFICATION_SUMMARY.md`](SIMPLIFICATION_SUMMARY.md) for complete details on the simplified architecture.

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

**Migration Note:** Previous multi-agent AI system has been replaced with deterministic processing for improved reliability. See migration details in `SIMPLIFICATION_SUMMARY.md`.

## Project Structure

- `api/` - Vercel Serverless Functions
  - `webhook.ts` - Inbound email webhook handler
  - `health.ts` - Health check endpoint
  - `cron/export-training-data.ts` - Monthly training data export
- `public/` - Static files
  - `index.html` - API documentation and landing page
- `apps/` - Application services
  - `agent` - OpenAI classify+draft worker
  - `slack-bot` - HITM review flow
  - `mailer` - Outbound replies
  - `ingestor` - Dependency container for serverless functions
- `packages/` - Shared libraries
  - `core` - Utils, PII masking, Zod schemas
  - `prompts` - Prompt templates and extraction schemas
  - `db` - Drizzle ORM schema and repos
  - `evaluation` - Eval harness and metrics
- `docs/` - Project documentation
- `infra/` - Docker Compose for local dev
- `ops/` - Scripts for export, eval, fine-tuning

## Documentation

All project documentation is organized in the [`documentation/`](documentation/) directory:

- **Getting Started**: [`documentation/deployment/QUICKSTART.md`](documentation/deployment/QUICKSTART.md)
- **Project Requirements**: [`documentation/project/prd.md`](documentation/project/prd.md)
- **Technical Plan**: [`documentation/project/plan.md`](documentation/project/plan.md)
- **Cursor Setup**: [`documentation/cursor/CURSOR_SETUP.md`](documentation/cursor/CURSOR_SETUP.md)
- **Deployment Guide**: [`documentation/deployment/DEPLOYMENT.md`](documentation/deployment/DEPLOYMENT.md)

See [`documentation/README.md`](documentation/README.md) for complete documentation index.

## Cursor IDE Setup

**Quick Start**:

1. The project uses latest Cursor features (Rules, Memories, Hooks, MCP, Custom Modes)
2. **Restart Cursor** after cloning to load all configurations
3. Install recommended extensions (prompted automatically)
4. See [`documentation/cursor/CURSOR_RULES_MIGRATION.md`](documentation/cursor/CURSOR_RULES_MIGRATION.md) for new rules structure
5. See [`documentation/cursor/CURSOR_LATEST_FEATURES.md`](documentation/cursor/CURSOR_LATEST_FEATURES.md) for newest features (Jan 2025)
6. See [`documentation/cursor/CURSOR_OPTIMIZATION.md`](documentation/cursor/CURSOR_OPTIMIZATION.md) for all optimizations

**Latest Features**:

- 📋 **Cursor Rules**: Organized `.cursor/rules/` with `.mdc` files (context-aware)
- 🤖 **Rules Automation**: Auto-sync rules with codebase changes (MCP + file watchers)
- 🧠 **Cursor Memories**: Auto-loaded project knowledge
- 🔗 **Agent Hooks**: Pre/post request automation (PII checks, reminders)
- 🌐 **MCP Servers**: Exa (web search) + Context7 (library docs) + Cursor Rules (automation)
- 🎯 **Custom Modes**: Agent Dev, DB Schema, Slack HITM, Eval & FT
- ⚡ **Auto-context**: `@prd.md`, `@policies.md`, `.cursormemory`
- 🎨 **Format on save**, ESLint auto-fix
- 🚀 **Turborepo** for parallel builds
