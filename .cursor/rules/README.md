# Cursor Rules Directory

This directory contains project-specific rules for Cursor AI in modern `.mdc` format.

## Structure (Consolidated January 2025)

### Root Rules (`.cursor/rules/`)

| Rule File                | Type          | Lines | Description                                                    | Applies To                                      |
| ------------------------ | ------------- | ----- | -------------------------------------------------------------- | ----------------------------------------------- |
| `core-principles.mdc`    | Always        | ~125  | Privacy, policy, hybrid strategy, schema-driven development    | All files                                       |
| `ai-processing.mdc`      | Auto-Attached | ~520  | Hybrid deterministic/AI processing, OpenAI patterns, classification | `apps/agent/**/*.ts`, `packages/prompts/**/*.ts` |
| `database.mdc`           | Auto-Attached | ~135  | Drizzle ORM patterns, retry queues, migrations                 | `packages/db/**/*.ts`                           |
| `slack-integration.mdc`  | Auto-Attached | ~290  | Slack HITM workflow, modals, security, error handling          | `apps/slack-bot/**/*.ts`, `api/slack/**/*.ts`   |
| `vercel-serverless.mdc`  | Auto-Attached | ~440  | Serverless patterns, webhooks, logging, database pooling       | `api/**/*.ts`, `vercel.json`                    |
| `monorepo.mdc`           | Auto-Attached | ~155  | pnpm/Turbo workspace standards and build pipelines             | `package.json`, `pnpm-workspace.yaml`, `turbo.json` |

**Total**: 6 files, ~1,665 lines (down from 9 files, ~1,900 lines)

### Consolidation Benefits (January 2025)

✅ **Eliminated Redundancy**:
- `waitUntil` pattern now in one place (was in 3 files)
- Error handling consolidated (was in 4 files)
- Request ID tracking unified (was in 2 files)

✅ **Better Organization**:
- Related patterns grouped together
- AI processing and classification combined
- Serverless patterns (webhooks, logging, deployment) unified

✅ **Improved Performance**:
- Fewer files to load and process
- More context per rule (better AI understanding)
- All files under 500 lines (best practice)

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

## Rule Consolidation Strategy

### Previous Structure (9 files)

1. core-principles.mdc (68 lines)
2. core-architecture.mdc (474 lines)
3. email-classification.mdc (46 lines)
4. database-patterns.mdc (119 lines)
5. observability-logging.mdc (315 lines)
6. slack-hitm.mdc (228 lines)
7. webhook-patterns.mdc (174 lines)
8. vercel-deployment.mdc (322 lines)
9. monorepo-workspace.mdc (120 lines)

### New Structure (6 files)

1. **core-principles.mdc** (~125 lines) - Enhanced with concrete examples
2. **ai-processing.mdc** (~520 lines) - Merged `core-architecture.mdc` + `email-classification.mdc`
3. **database.mdc** (~135 lines) - Renamed and enhanced `database-patterns.mdc`
4. **slack-integration.mdc** (~290 lines) - Renamed `slack-hitm.mdc` with security patterns
5. **vercel-serverless.mdc** (~440 lines) - Merged `webhook-patterns.mdc` + `vercel-deployment.mdc` + logging from `observability-logging.mdc`
6. **monorepo.mdc** (~155 lines) - Renamed and enhanced `monorepo-workspace.mdc`

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
2. **Keep rules under 500 lines** - For optimal AI processing
3. **Eliminate redundancy** - Single source of truth for patterns
4. **Use glob patterns** - Scope rules to relevant files
5. **Provide examples** - Include DO and DON'T code examples
6. **Reference files** - Link to relevant files using `@filename`
7. **Update regularly** - Keep rules current with team decisions

## Viewing Active Rules

Active rules are shown in the **Agent sidebar** during Chat or Inline Edit:

- ✅ Always-applied rules (green)
- 📎 Auto-attached rules (blue)
- 📁 Nested rules (yellow)

## Migration History

- **January 2025**: Consolidated 9 rules → 6 rules, eliminated redundancy
- **November 2024**: Migrated from legacy `.cursorrules` to modern `.cursor/rules/`

See `CURSOR_RULES_MIGRATION.md` for full migration details.

## References

- `@packages/agents-runtime/src/tools.ts` - Vector store tool
- `@packages/agents-runtime/src/agents.ts` - Agent uses vector store
- `@documentation/deployment/ENVIRONMENT_VARIABLES.md` - `OPENAI_VECTOR_STORE_ID` env var
- [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [MDC Format](https://github.com/nuxt-contrib/mdc)
- Migration guide: `documentation/cursor/CURSOR_RULES_MIGRATION.md`
