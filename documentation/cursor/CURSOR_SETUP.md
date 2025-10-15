# Cursor AI IDE Setup Guide

This document walks you through configuring Cursor to work optimally with this project.

## 1. Project Rules (Modern `.mdc` Format)

The project uses **Cursor's modern rules system** with organized `.mdc` files in `.cursor/rules/`.

### Rules are automatically loaded after cloning:

✅ **Root-level rules** (`.cursor/rules/`):

- `core-principles.mdc` - Always applied (Privacy, Compliance, Schema-Driven)
- `openai-patterns.mdc` - Auto-attached for agent/prompts files
- `database-patterns.mdc` - Auto-attached for DB files
- `slack-hitm.mdc` - Auto-attached for Slack bot files
- `vercel-deployment.mdc` - Auto-attached for api/vercel.json
- `monorepo-workspace.mdc` - Auto-attached for package.json files
- `testing-evaluation.mdc` - Auto-attached for eval/test files

✅ **Nested rules** (automatically apply in subdirectories):

- `apps/agent/.cursor/rules/agent-workflow.mdc` - Agent-specific workflow
- `packages/db/.cursor/rules/schema-migrations.mdc` - Database schema guidelines
- `packages/prompts/.cursor/rules/prompt-engineering.mdc` - Prompt patterns

**No manual import needed!** Just restart Cursor after cloning.

**Verify rules are active:** Open Cursor Settings → Rules to see all project rules.

## 2. Pin Key Documentation Files

Pin these files in Cursor chat context for easy reference:

1. Click the **`@`** symbol in chat
2. Add these files:
   - `@prd.md` - Product requirements
   - `@docs/policies.md` - Tone and policy guidelines
   - `@docs/prompts.md` - Prompt templates overview
   - `@architecture.md` - System architecture
   - `@README.md` - Quick start guide

**Usage:** When working on agent logic, drafting, or HITM flows, start prompts with:

```
@prd.md @policies.md How should we handle...
```

## 3. Add External Documentation to Docs Panel

Add these external docs for quick reference while coding:

1. Open Cursor Settings → **Docs**
2. Click **"Add Documentation"**
3. Add URLs for:
   - **OpenAI API** - https://platform.openai.com/docs
   - **OpenAI Fine-Tuning** - https://platform.openai.com/docs/guides/fine-tuning
   - **Slack Bolt for JavaScript** - https://api.slack.com/bolt-js
   - **Drizzle ORM** - https://orm.drizzle.team/docs
   - **Zod** - https://zod.dev
   - **Vercel Functions** - https://vercel.com/docs/functions
   - **HubSpot Conversations API** (if using) - https://developers.hubspot.com/docs/api/conversations

## 4. Configure Model Context Protocol (MCP)

MCP servers extend Cursor with external tools and services.

### GitHub MCP (recommended)

If your organization has GitHub MCP available:

1. Cursor Settings → **MCP**
2. Click **"Add new MCP Server"**
3. Enter GitHub MCP server details
4. Test with: "Open a PR for this branch"

### Deployment MCP (optional)

If you're using a deployment provider with MCP support (e.g., Vercel, Railway):

1. Add the provider's MCP server configuration
2. Test with: "Deploy to staging"

### Fallback

If MCP isn't available, use standard CLI tools:

```bash
gh pr create
vercel deploy
```

## 5. Enable Privacy Settings

Protect your codebase and secrets:

1. Cursor Settings → **Privacy**
2. Enable **"Full Privacy Mode"** (prevents Cursor from storing code)
3. Set **"Never send file contents"** for sensitive directories:
   - Add `.env*` patterns
   - Add `config/` if it contains secrets
4. **Never paste API keys or tokens in chat**
   - Reference them as env variables: `OPENAI_API_KEY`, `SLACK_BOT_TOKEN`
5. If on Business/Enterprise plan, verify **zero-day retention** for LLM providers

## 6. Workflow Best Practices

### Use Ask Mode for Core Flows

When implementing agent classification, drafting, or HITM logic:

```
Ask: @prd.md How should we structure the OpenAI extraction call?
```

### Use Composer for Multi-File Changes

For changes spanning multiple files (e.g., adding a new field to schema + repos + agent):

1. Open Composer (`Cmd/Ctrl + I`)
2. Select **"Run with plan"**
3. Review the plan before applying
4. Keep batches small (≤5 files) for easier review

### Use Inline Edit for Local Refactors

For single-file changes:

1. Select code
2. Press `Cmd/Ctrl + K`
3. Type your edit instruction

### Run Tests After AI Edits

After Composer or agent-generated edits:

```bash
pnpm test
# or for specific package:
cd packages/db && pnpm drizzle-kit push
```

## 7. Name Your Chats

Organize chats by feature for easy reference:

- "Agent: OpenAI extraction schema"
- "Slack HITM: Approve flow"
- "DB: Add fine-tuning tracking"
- "Deployment: Vercel cron setup"

## 8. Development Commands

Quick reference for Cursor terminal:

```bash
# Start Postgres (OrbStack/Docker)
cd infra && docker compose up -d

# Push DB schema
cd packages/db && pnpm drizzle-kit push

# Test agent locally
cd apps/agent && pnpm dev

# Test Slack bot locally (requires ngrok for webhooks)
cd apps/slack-bot && pnpm dev

# Run evaluation
tsx ops/scripts/eval.ts

# Export training data
tsx ops/scripts/export-jsonl.ts

# Fine-tune model
tsx ops/scripts/finetune.ts
```

## 9. Troubleshooting

### Cursor not applying rules

- Verify the rule file is imported in Settings → Rules
- Check `alwaysApply: true` is set
- Restart Cursor

### Context not found for @filename

- Ensure file is in workspace
- Try absolute path: `@/Users/.../file.md`
- Pin frequently used files

### MCP server not responding

- Check server logs in Settings → MCP → Server Details
- Verify authentication tokens
- Restart Cursor

## Next Steps

1. Review `docs/prd.md` to understand project goals
2. Start local dev: `docker compose up -d` + `pnpm install`
3. Push schema: `cd packages/db && pnpm drizzle-kit push`
4. Test agent: `cd apps/agent && tsx src/index.ts`
5. Deploy: Follow `DEPLOYMENT.md`

## Questions?

- Check `README.md` for quick start
- Review `documentation/project/architecture.md` for architecture
- Reference `docs/policies.md` for tone/policy
- Ask Cursor with pinned context: `@prd.md What is...`

## Migration from `.cursorrules`

This project has **migrated from the legacy `.cursorrules` file** to modern `.cursor/rules/` with `.mdc` format.

See `CURSOR_RULES_MIGRATION.md` for full migration details.
