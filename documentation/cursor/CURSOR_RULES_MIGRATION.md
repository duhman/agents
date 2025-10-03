# Cursor Rules Migration Guide

## Overview

This project has been migrated from the legacy `.cursorrules` file to the modern `.cursor/rules` directory with `.mdc` format files.

## Migration Summary

### What Changed

✅ **Before:** Single `.cursorrules` file at project root (legacy, will be deprecated)  
✅ **After:** Organized `.cursor/rules/` directory with multiple `.mdc` files

### New Structure

```
.cursor/rules/
├── core-principles.mdc           # Always applied (Privacy, Compliance, Schema-Driven)
├── openai-patterns.mdc           # Auto-attached for agent/prompts files
├── database-patterns.mdc         # Auto-attached for db files
├── slack-hitm.mdc                # Auto-attached for slack-bot files
├── vercel-deployment.mdc         # Auto-attached for ingestor/vercel.json
├── monorepo-workspace.mdc        # Auto-attached for package.json files
└── testing-evaluation.mdc        # Auto-attached for eval/test files

apps/agent/.cursor/rules/
└── agent-workflow.mdc            # Always applied in apps/agent

packages/db/.cursor/rules/
└── schema-migrations.mdc         # Always applied in packages/db

packages/prompts/.cursor/rules/
└── prompt-engineering.mdc        # Always applied in packages/prompts
```

## Rule Types

### 1. **Always Applied Rules** (`alwaysApply: true`)

These rules are included in every AI request:

- **`core-principles.mdc`**: Privacy, compliance, schema-driven development
- Nested rules in subdirectories (e.g., `agent-workflow.mdc` in `apps/agent/`)

### 2. **Auto-Attached Rules** (`alwaysApply: false`, with `globs`)

These rules are automatically included when working with matching files:

| Rule | Applies To |
|------|-----------|
| `openai-patterns.mdc` | `apps/agent/**/*.ts`, `packages/prompts/**/*.ts`, `ops/scripts/eval.ts` |
| `database-patterns.mdc` | `packages/db/**/*.ts` |
| `slack-hitm.mdc` | `apps/slack-bot/**/*.ts` |
| `vercel-deployment.mdc` | `apps/ingestor/**/*.ts`, `vercel.json` |
| `monorepo-workspace.mdc` | `package.json`, `pnpm-workspace.yaml`, `turbo.json` |
| `testing-evaluation.mdc` | `ops/scripts/eval.ts`, `packages/evaluation/**/*.ts` |

### 3. **Nested Rules**

Rules in subdirectories automatically apply when working in those directories:

- `apps/agent/.cursor/rules/agent-workflow.mdc` → Always active in `apps/agent/`
- `packages/db/.cursor/rules/schema-migrations.mdc` → Always active in `packages/db/`
- `packages/prompts/.cursor/rules/prompt-engineering.mdc` → Always active in `packages/prompts/`

## Benefits of New Structure

### 1. **Better Organization**

- Clear separation of concerns (OpenAI patterns, DB patterns, Slack patterns, etc.)
- Each rule file is focused and under 500 lines
- Easy to find relevant guidance

### 2. **Context-Aware**

- Rules only load when relevant (via glob patterns)
- Reduces token usage
- More targeted AI responses

### 3. **Version Control Friendly**

- All rules are version-controlled in `.cursor/rules/`
- Team members get consistent guidance
- Easy to review rule changes in PRs

### 4. **Scalable**

- Add new rules without cluttering a single file
- Nested rules for directory-specific guidance
- Composable and reusable patterns

## Viewing Active Rules

In Cursor, active rules are shown in the **Agent sidebar** during chat or inline edit. You'll see:

- ✅ Always-applied rules (green)
- 📎 Auto-attached rules (blue, based on current files)
- 📁 Nested rules (yellow, from current directory)

## Creating New Rules

### From Settings

1. Open `Cursor Settings > Rules`
2. Click `New Cursor Rule`
3. Choose rule type:
   - **Always**: Always included
   - **Auto Attached**: Included for matching files
   - **Agent Requested**: AI decides when to include
   - **Manual**: Only when explicitly mentioned with `@ruleName`
4. Write rule content
5. Save to `.cursor/rules/`

### From Chat

Use the `/Generate Cursor Rules` command in chat to create rules from conversations:

```
/Generate Cursor Rules

Create a rule for handling database migrations in our project.
```

## Legacy Files

### `.cursorrules` (Deprecated)

The old `.cursorrules` file at project root is **deprecated** but still supported. It has been migrated to `.cursor/rules/`.

❌ **Do not edit `.cursorrules`**  
✅ **Edit files in `.cursor/rules/` instead**

### `docs/rules/cancellation-agent.md` (Obsolete)

The old rule file at `docs/rules/cancellation-agent.md` is no longer used. Its content has been migrated to:

- `.cursor/rules/core-principles.mdc` (core principles)
- `.cursor/rules/openai-patterns.mdc` (prompting best practices)
- `apps/agent/.cursor/rules/agent-workflow.mdc` (agent-specific workflow)

## Best Practices

### 1. Keep Rules Focused

Each rule should cover one specific area:

- ✅ Good: `openai-patterns.mdc` covers OpenAI API patterns
- ❌ Bad: `all-rules.mdc` covers everything

### 2. Use Glob Patterns

Scope rules to relevant files:

```mdc
---
description: OpenAI API best practices
globs: apps/agent/**/*.ts, packages/prompts/**/*.ts
alwaysApply: false
---
```

### 3. Provide Examples

Include both DO and DON'T examples:

```mdc
✅ **DO:**
\`\`\`typescript
const completion = await openai.beta.chat.completions.parse({...});
\`\`\`

❌ **DON'T:**
\`\`\`typescript
const completion = await openai.chat.completions.create({...});
\`\`\`
```

### 4. Reference Files

Link to relevant files using `@` syntax:

```mdc
## References

- @packages/prompts/src/templates.ts - Extraction schema
- @apps/agent/src/index.ts - Agent implementation
```

### 5. Update After Decisions

When your team makes architectural decisions, update rules:

```bash
# After deciding to use a new pattern
# Edit the relevant rule file
# Commit with clear message
git add .cursor/rules/
git commit -m "docs: update OpenAI patterns to use new response format"
```

## Testing Rules

After creating or updating rules:

1. **Restart Cursor** to load new rules
2. **Open a file** that should match the glob pattern
3. **Check Agent sidebar** to see if rule is active
4. **Ask a question** to verify AI uses the guidance

Example test:

```
# Open apps/agent/src/index.ts
# Ask: "How should I handle OpenAI structured outputs?"
# Verify AI mentions zodResponseFormat() and .optional().nullable()
```

## Migration Checklist

- [x] Create `.cursor/rules/` directory
- [x] Migrate `.cursorrules` content to organized `.mdc` files
- [x] Create nested rules for `apps/agent`, `packages/db`, `packages/prompts`
- [x] Update `.cursor/settings.json` (remove `.cursorrules` from default context)
- [x] Document migration in `CURSOR_RULES_MIGRATION.md`
- [x] Update `README.md` to mention new rules structure
- [ ] **Next:** Restart Cursor to load new rules
- [ ] **Next:** Verify rules are active (check Agent sidebar)
- [ ] **Next:** Delete `.cursorrules` after confirming migration works
- [ ] **Next:** Delete `docs/rules/cancellation-agent.md` (obsolete)

## FAQ

### Should I delete `.cursorrules`?

Yes, **after verifying** the migration works:

1. Restart Cursor
2. Test that rules load correctly
3. Delete `.cursorrules`
4. Commit the change

### Can I have both `.cursorrules` and `.cursor/rules/`?

Yes, but `.cursor/rules/` takes precedence. It's recommended to use only one system.

### How do I know which rules are active?

Check the **Agent sidebar** in Cursor Chat or Inline Edit. Active rules are listed with their type (Always, Auto-Attached, etc.).

### Can I manually invoke a rule?

Yes, create a rule with type **Manual** and reference it using `@ruleName` in chat:

```
@database-patterns How do I add a new table?
```

### Do rules work with Cursor Tab?

No. Rules only apply to **Agent (Chat)** and **Inline Edit**. They do not affect Cursor Tab autocomplete.

## References

- [Cursor Rules Documentation](https://cursor.com/docs/context/rules)
- [MDC Format Guide](https://github.com/nuxt-contrib/mdc)
- Project rules location: `.cursor/rules/`

---

**Migration Date:** January 2025  
**Status:** ✅ Complete  
**Next Step:** Restart Cursor and verify rules load correctly

