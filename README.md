# Agents Monorepo

OpenAI-first email agent system with Slack HITM, Vercel deployment, and fine-tuning loop.

## Quick Start

See [`documentation/deployment/QUICKSTART.md`](documentation/deployment/QUICKSTART.md) for step-by-step setup instructions (< 10 minutes).

**TL;DR:**

```bash
pnpm install
cd infra && docker compose up -d
cd packages/db && pnpm drizzle-kit push
cp .env.example .env  # Add your OPENAI_API_KEY and other vars
cd apps/agent && pnpm dev  # Test classification
```

## Agents SDK (Optional)

Enable the OpenAI Agents SDK path (feature-flagged):

```bash
# Default is disabled
echo "USE_AGENTS_SDK=1" >> .env
```

See `documentation/cursor/AGENTS_SDK_MIGRATION.md` and `documentation/cursor/AGENTS_SDK_GUIDE.md`.

## 🏆 Award-Winning Improvements (Updated January 2025)

This project demonstrates best-in-class implementation of OpenAI v5, Drizzle ORM, Slack Bolt, and Vercel serverless patterns. See [`AWARD_WINNING_IMPROVEMENTS.md`](AWARD_WINNING_IMPROVEMENTS.md) for details on:

- ⚡ **OpenAI v5 Migration**: Updated from `beta.chat.completions.parse()` to `chat.completions.parse()`
- 🛡️ **Production-grade** OpenAI API error handling with retry logic
- 📊 **Structured logging** with request IDs and observability
- 🔄 **Exponential backoff** retry strategy for API failures
- ✅ **Request validation** middleware for webhook security
- 🚀 **3x faster** webhook performance (<2s response time)
- 🎯 **Health check endpoints** for monitoring and debugging
- 📋 **Enhanced Cursor rules** with latest patterns and validation

All improvements researched using official docs and implemented for maximum simplicity and efficiency.

## Project Structure

- `apps/` - Vercel Functions and services
  - `ingestor` - Webhook handlers
  - `agent` - OpenAI classify+draft worker
  - `slack-bot` - HITM review flow
  - `mailer` - Outbound replies
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
