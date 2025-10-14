# Cursor Rules Directory

This directory contains project-specific rules for Cursor AI in modern `.mdc` format.

## Structure

### Root Rules (`.cursor/rules/`)

| Rule File                   | Type          | Description                                          | Applies To                                                  |
| --------------------------- | ------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| `core-principles.mdc`       | Always        | Core principles (Privacy, Compliance, Schema-Driven) | All files                                                   |
| `openai-patterns.mdc`       | Auto-Attached | OpenAI v5 API best practices with retry logic        | `apps/agent/**/*.ts`, `packages/prompts/**/*.ts`            |
| `database-patterns.mdc`     | Auto-Attached | Drizzle ORM patterns with date handling              | `packages/db/**/*.ts`                                       |
| `observability-logging.mdc` | Auto-Attached | Structured logging and observability patterns        | `apps/**/*.ts`, `packages/core/**/*.ts`                     |
| `slack-hitm.mdc`            | Auto-Attached | Slack HITM workflow with enhanced reliability        | `apps/slack-bot/**/*.ts`, `api/slack/**/*.ts`               |
| `webhook-patterns.mdc`      | Auto-Attached | Webhook handling with multi-format support           | `api/webhook.ts`, `api/**/*.ts`                             |
| `vercel-deployment.mdc`     | Auto-Attached | Vercel deployment patterns                           | `apps/ingestor/**/*.ts`, `vercel.json`                      |
| `monorepo-workspace.mdc`    | Auto-Attached | Monorepo structure                                   | `package.json`, `pnpm-workspace.yaml`, `turbo.json`         |
| `testing-evaluation.mdc`    | Auto-Attached | Testing and evaluation                               | `ops/scripts/eval.ts`, `packages/evaluation/**/*.ts`        |
| `vector-store.mdc`          | Auto-Attached | OpenAI Vector Store RAG usage for agents             | `packages/agents-runtime/src/**/*.ts`, `apps/agent/**/*.ts` |

### Nested Rules

| Directory                         | Rule File                | Description                                  |
| --------------------------------- | ------------------------ | -------------------------------------------- |
| `apps/agent/.cursor/rules/`       | `agent-workflow.mdc`     | Agent-specific workflow for email processing |
| `packages/db/.cursor/rules/`      | `schema-migrations.mdc`  | Database schema and migration guidelines     |
| `packages/prompts/.cursor/rules/` | `prompt-engineering.mdc` | Prompt engineering patterns                  |

## How Rules Work

### Always Applied Rules

Rules with `alwaysApply: true` are included in every AI request.

### Auto-Attached Rules

Rules with glob patterns are automatically included when working with matching files.

### Nested Rules

Rules in subdirectories (`apps/agent/.cursor/rules/`, etc.) automatically apply when working in those directories.

## Creating New Rules

### From Cursor Settings

1. Open `Cursor Settings > Rules`
2. Click `New Cursor Rule`
3. Choose rule type (Always, Auto-Attached, Agent Requested, Manual)
4. Write rule content in MDC format
5. Save to `.cursor/rules/`

### From Chat

Use `/Generate Cursor Rules` command to create rules from conversations.

## MDC Format

```mdc
---
description: Clear, one-line description
globs: path/to/files/**/*.ts, other/path/**/*.js
alwaysApply: false
---

# Rule Title

## Section

Content with examples, DO/DON'T patterns, and references to other files.

@filename - Reference files
```

## Best Practices

1. **Keep rules focused** - Each rule covers one specific area
2. **Use glob patterns** - Scope rules to relevant files
3. **Provide examples** - Include DO and DON'T code examples
4. **Reference files** - Link to relevant files using `@filename`
5. **Update regularly** - Keep rules current with team decisions

## Viewing Active Rules

Active rules are shown in the **Agent sidebar** during Chat or Inline Edit:

- ✅ Always-applied rules (green)
- 📎 Auto-attached rules (blue)
- 📁 Nested rules (yellow)

## Migration

This project migrated from legacy `.cursorrules` to modern `.cursor/rules/`.

See `CURSOR_RULES_MIGRATION.md` for full migration details.

## References

- `@packages/agents-runtime/src/tools.ts` - Vector store tool
- `@packages/agents-runtime/src/agents.ts` - Agent uses vector store
- `@documentation/deployment/ENVIRONMENT_VARIABLES.md` - `OPENAI_VECTOR_STORE_ID` env var
- [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [MDC Format](https://github.com/nuxt-contrib/mdc)
- Migration guide: `CURSOR_RULES_MIGRATION.md`
