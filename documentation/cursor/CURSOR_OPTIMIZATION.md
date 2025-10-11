# Cursor IDE Hyper-Optimization Guide

This document outlines the specific optimizations applied to maximize development productivity with Cursor AI.

## ✅ Applied Optimizations

### 1. Modern `.cursor/rules/` Directory (`.mdc` Format)
**Location**: `.cursor/rules/` with nested subdirectories

**Structure**:
- **Root rules** (7 files): Core principles, OpenAI patterns, database, Slack, Vercel, monorepo, testing
- **Nested rules** (3 files): Agent workflow, schema migrations, prompt engineering

**Key Features**:
- Context-aware rules with glob patterns (auto-attach to relevant files)
- Always-applied rules for core principles
- Nested rules for directory-specific guidance
- Modern `.mdc` format with metadata (description, globs, alwaysApply)
- Organized by concern (OpenAI, DB, Slack, etc.)

**Impact**: Cursor has focused, context-aware guidance that loads only when relevant, reducing token usage and improving response quality.

**Migration**: Legacy `.cursorrules` has been migrated to organized `.mdc` files. See `CURSOR_RULES_MIGRATION.md` for details.

### 2. Cursor Settings Configuration
**Location**: `.cursor/settings.json`

**Features**:
- Default context includes `prd.md`, `docs/policies.md`, `.cursorrules`
- File tree and git changes included automatically
- Claude Sonnet 4 for optimal reasoning
- Workspace symbols for better navigation
- 8K token max for comprehensive context

**Impact**: Every chat starts with project context; no manual file attachment needed.

### 3. VSCode/Cursor Extensions
**Location**: `.vscode/extensions.json`

**Recommended Extensions**:
- ESLint (TypeScript validation)
- Prettier (code formatting)
- TypeScript Next (latest TS features)
- Prisma (syntax highlighting for Drizzle)
- Jest (test runner integration)

**Impact**: Consistent tooling across the team; auto-format on save.

### 4. Workspace Settings
**Location**: `.vscode/settings.json`

**Key Settings**:
- Format on save with Prettier
- ESLint auto-fix on save
- TypeScript workspace version
- Excluded files/folders from search (node_modules, dist, .turbo)

**Impact**: Zero-config formatting; faster search/navigation.

### 5. Monorepo Tooling
**Files**: `pnpm-workspace.yaml`, `turbo.json`, root `package.json`

**Features**:
- Turborepo for parallel builds and caching
- Workspace scripts (`pnpm agent:dev`, `pnpm db:push`)
- Build dependency graph (`^build` for topological order)
- Persistent dev tasks with caching disabled

**Impact**: Fast parallel builds; simple CLI for common tasks.

### 6. Code Quality Tools
**Files**: `.prettierrc`, `.eslintrc.json`

**Configuration**:
- Prettier: 100 char width, no semicolons, double quotes
- ESLint: TypeScript recommended + custom rules
- Warn on `any`, allow console logs
- Ignore unused vars starting with `_`

**Impact**: Consistent style; enforced type safety; helpful warnings.

## 🎯 Cursor Usage Patterns

### Ask Mode (Optimal for Architecture)
```
@prd.md @policies.md How should I structure the extraction schema for multiple cancellation reasons?
```
**When**: Designing APIs, schemas, or complex logic
**Context**: Automatically includes pinned docs + file tree

### Composer (Multi-File Edits)
```
Add a `priority` field to tickets table, update repos, and agent logic
```
**When**: Changes spanning 3+ files
**Pattern**: "Run with plan" → review → apply
**Tip**: Keep batches ≤5 files for easier review

### Inline Edit (Ctrl/Cmd + K)
**When**: Single-function refactors or quick fixes
**Pattern**: Select code → `Cmd+K` → describe change
**Tip**: Great for renaming, adding error handling, docs

### Chat with Codebase Search
```
@agent Where do we calculate confidence scores?
```
**When**: Navigating unfamiliar code
**Tip**: Use `@package` or `@app` to scope search

## 📊 Performance Optimizations

### Database
- **Dev**: `drizzle-kit push` for instant schema sync
- **Prod**: `drizzle-kit generate` → `migrate` for versioned migrations
- **Config**: `verbose: true`, `strict: true` for safety

### OpenAI API
- **Structured outputs**: `client.beta.chat.completions.parse()`
- **Schema format**: `zodResponseFormat(MySchema, 'name')`
- **Optional fields**: `z.string().optional().nullable()`
- **Model**: `gpt-4o-2024-08-06` (latest structured output support)

### Vercel Functions
- **Constraint**: <5s execution (Slack webhooks timeout at 3s)
- **Pattern**: Ack immediately, enqueue async job
- **Postgres**: Use pooled connections (Neon/Vercel Postgres)

## 🔍 Debugging with Cursor

### 1. Semantic Search
```
How does the Slack approval flow work?
```
Finds implementation across multiple files

### 2. Symbol Navigation
`Cmd+Click` on any function/type → jumps to definition (even across packages)

### 3. Git Integration
Cursor shows git changes inline; ask: "What changed in this PR?"

### 4. Terminal Integration
Run scripts directly: `pnpm agent:dev`
Cursor can suggest commands based on package.json

## 📝 Documentation References

Cursor now has access to (via Docs panel):
- OpenAI API (structured outputs, fine-tuning)
- Slack Bolt JS
- Drizzle ORM
- Zod
- Vercel Functions
- HubSpot Conversations API

**Usage**: Just ask "How do I..." and Cursor will reference official docs.

## 🚀 Quick Commands

```bash
# Development
pnpm agent:dev          # Test agent locally
pnpm db:studio          # Open Drizzle Studio

# Quality
pnpm lint               # Lint all packages
pnpm format             # Format all files
pnpm format:check       # Check formatting (CI)

# Database
pnpm db:push            # Push schema (dev)
pnpm --filter @agents/db generate  # Generate migrations (prod)

# Evaluation & Training
pnpm eval               # Run golden set evaluation
pnpm export-jsonl       # Export training data
pnpm finetune           # Launch OpenAI fine-tuning job
```

## 🎓 Learning Resources

- **Cursor Quickstart**: `CURSOR_SETUP.md`
- **Project Goals**: `docs/prd.md`
- **Architecture**: `plan.md`
- **Deployment**: `DEPLOYMENT.md`
- **Local Dev**: `QUICKSTART.md`

## 🔧 Troubleshooting

### Cursor not applying rules
1. Check `.cursorrules` exists at project root
2. Restart Cursor
3. Verify settings in `.cursor/settings.json`

### Slow codebase search
1. Add large files to `.cursorignore`
2. Exclude `node_modules`, `dist` (already configured)
3. Reduce `maxTokens` if needed

### TypeScript errors in Cursor
1. Ensure workspace TS version is used
2. Run `pnpm install` to sync workspaces
3. Restart TS server: `Cmd+Shift+P` → "Restart TS Server"

## 📈 Metrics to Track

- **Response time**: Agent classification <2s
- **Accuracy**: Golden set >90% (see `ops/scripts/eval.ts`)
- **Build time**: Turborepo parallel builds <30s
- **Format violations**: Zero (enforced pre-commit)

## 🎯 Next Steps

1. **Restart Cursor** to load all new configurations
2. **Verify MCP servers** are connected (Settings → MCP)
3. **Test custom modes** (open chat, select mode from dropdown)
4. **Try a query** to test memory auto-loading
5. **Enable Full Privacy** mode if working with sensitive data

## 🆕 Latest Features (January 2025)

See `CURSOR_LATEST_FEATURES.md` for details on:
- ✅ **Cursor Memories** (`.cursormemory`) - Auto-loaded project knowledge
- ✅ **Agent Hooks** (`.cursor/hooks.json`) - Pre/post request automation
- ✅ **MCP Servers** (`.cursor/mcp.json`) - Exa + Context7 integration
- ✅ **Custom Modes** (`.cursor/modes.json`) - Task-specific AI modes

---

**Questions?** Reference `CURSOR_LATEST_FEATURES.md` for newest features or `CURSOR_SETUP.md` for detailed IDE configuration

