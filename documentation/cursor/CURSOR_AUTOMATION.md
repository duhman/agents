# Cursor Rules Automation System

## Overview

This project includes an **automated system** that keeps Cursor IDE setup, rules, and configurations synchronized with your evolving codebase. The system uses MCP servers, file watchers, git hooks, and CI/CD integration to ensure your AI assistant always has up-to-date context.

---

## 🎯 Goals

1. **Auto-sync rules** when schema, prompts, or dependencies change
2. **Real-time updates** during development with file watchers
3. **Git integration** via hooks (pre-commit, post-merge)
4. **CI/CD validation** to ensure rules stay current
5. **Zero manual intervention** for routine rule updates

---

## 🏗️ Architecture

```
Codebase Changes
    ↓
File Watchers (dev) / Git Hooks (commit) / CI/CD (push)
    ↓
Rules Updater Script (.cursor/automation/rules-updater.ts)
    ↓
Detect Changes → Update Rules → Validate → Update Memories
    ↓
Updated Cursor Configuration
```

---

## 📁 Components

### 1. MCP Servers (`.cursor/mcp.json`)

**Enhanced configuration with automation triggers:**

```json
{
  "mcpServers": {
    "exa": {
      "enabled": true,
      "useFor": ["Latest API patterns", "Cursor IDE updates"]
    },
    "context7": {
      "enabled": true,
      "useFor": ["Library documentation", "Code patterns"]
    },
    "cursor-rules": {
      "enabled": true,
      "description": "Automated rules generation",
      "useFor": ["Auto-generating rules", "Maintaining consistency"]
    }
  },
  "automation": {
    "enabled": true,
    "triggers": [
      {
        "name": "on_schema_change",
        "files": ["packages/db/src/schema.ts"],
        "action": "update_db_rules"
      },
      {
        "name": "on_prompt_change",
        "files": ["packages/prompts/src/templates.ts"],
        "action": "update_prompt_rules"
      }
    ]
  }
}
```

### 2. Rules Updater (`.cursor/automation/rules-updater.ts`)

**Core automation script that:**
- Detects changes in critical files via git diff
- Extracts metadata (tables, schemas, functions)
- Updates relevant `.mdc` rule files
- Syncs `.cursormemory` with latest context
- Validates rule correctness
- Generates automation reports

**Key Features:**
- 📊 Change detection (schema, prompts, packages, architecture)
- 📝 Auto-updates database rules with new tables
- 🔄 Syncs prompt rules with template changes
- 📦 Updates dependency information
- ✅ Validates all rules for correctness
- 📋 Generates detailed reports

### 3. File Watcher (`.cursor/automation/file-watcher.ts`)

**Development mode monitoring:**
- Watches critical files for changes
- Debounces changes (2s) to avoid spam
- Automatically triggers rule updates
- Provides real-time feedback

**Usage:**
```bash
# Start file watcher during development
tsx .cursor/automation/file-watcher.ts
```

### 4. Git Hooks

**Pre-Commit Hook** (`.husky/pre-commit`):
- Runs before each commit
- Checks if critical files changed
- Auto-updates rules and stages them
- Ensures commits include rule updates

**Post-Merge Hook** (`.husky/post-merge`):
- Runs after `git pull` or `git merge`
- Syncs rules with merged changes
- Keeps local environment current

### 5. CI/CD Integration (`.github/workflows/cursor-rules-sync.yml`)

**GitHub Actions workflow that:**
- Triggers on push to main/develop
- Runs automation on file changes
- Auto-commits rule updates
- Comments on PRs if rules out of sync
- Uploads automation reports as artifacts

---

## 🚀 Usage

### Development Mode (File Watcher)

**Start the watcher for automatic updates:**

```bash
# Terminal 1: Start development
pnpm dev

# Terminal 2: Start rule watcher
tsx .cursor/automation/file-watcher.ts
```

**What it does:**
- Monitors schema, prompts, packages
- Automatically updates rules on changes
- Provides instant feedback

### Manual Run

**Trigger automation manually:**

```bash
tsx .cursor/automation/rules-updater.ts
```

**When to use:**
- After major refactoring
- Before committing important changes
- To verify rule sync status

### Git Integration (Automatic)

**Pre-commit hook automatically:**
1. Detects critical file changes
2. Runs automation
3. Stages updated rules
4. Includes in commit

**Post-merge hook automatically:**
1. Syncs after `git pull`
2. Updates local rules
3. Keeps environment current

### CI/CD (Automatic)

**GitHub Actions automatically:**
1. Runs on push to main/develop
2. Validates rule sync
3. Auto-commits updates (on push)
4. Comments on PRs (if out of sync)

---

## 📊 Automation Triggers

| Trigger | Files Monitored | Action |
|---------|----------------|--------|
| **Schema Changes** | `packages/db/src/schema.ts` | Update database rules with new tables/columns |
| **Prompt Changes** | `packages/prompts/src/templates.ts` | Update prompt engineering rules with new schemas |
| **Package Changes** | `package.json`, `packages/*/package.json` | Update dependency info in memories |
| **Architecture Changes** | `documentation/project/plan.md` | Update architecture context |
| **Hook Changes** | `.cursor/hooks.json` | Validate and document hooks |
| **Mode Changes** | `.cursor/modes.json` | Validate and document custom modes |

---

## 🔄 What Gets Updated

### 1. Rule Files (`.cursor/rules/*.mdc`)

**Database Rules:**
- Current table list
- Column patterns
- Repository functions

**Prompt Rules:**
- Available schemas
- Template functions
- Validation patterns

**Dependency Rules:**
- Library versions
- Breaking changes
- Migration notes

### 2. Memories (`.cursormemory`)

**Updated sections:**
- File locations
- Dependencies (with versions)
- Tech stack changes
- Last automation timestamp

### 3. Automation Reports

**Generated files:**
- `.cursor/automation/last-run.json` - Last automation details
- Includes: timestamp, updates, changes

---

## 🛠️ Setup

### 1. Install Dependencies

```bash
# Install required packages
pnpm add -D chokidar lodash tsx husky lint-staged

# Install git hooks
pnpm prepare
```

### 2. Configure Husky

```bash
# Initialize husky
npx husky install

# Make hooks executable
chmod +x .husky/pre-commit
chmod +x .husky/post-merge
```

### 3. Configure MCP

**Set environment variables:**

```bash
# .env
EXA_API_KEY=your_exa_api_key_here
```

### 4. Enable File Watcher (Optional)

**Add to package.json:**

```json
{
  "scripts": {
    "watch:rules": "tsx .cursor/automation/file-watcher.ts"
  }
}
```

**Run during development:**

```bash
pnpm watch:rules
```

---

## ✅ Validation

### Automated Checks

The system validates:
- ✅ All `.mdc` files have frontmatter
- ✅ All rules have descriptions
- ✅ Glob patterns are valid
- ✅ Referenced files exist
- ✅ Memory sections are complete

### Manual Validation

**Check automation status:**

```bash
# View last run report
cat .cursor/automation/last-run.json

# Check git diff for rule changes
git diff .cursor/rules/
git diff .cursormemory
```

---

## 📈 Benefits

### 1. **Always Up-to-Date**
Rules automatically reflect latest codebase state

### 2. **Zero Manual Work**
No need to manually update rules after changes

### 3. **Consistent Context**
AI assistant always has accurate information

### 4. **Fast Iteration**
File watcher provides instant rule updates

### 5. **Team Synchronization**
Git hooks ensure all team members have current rules

### 6. **CI/CD Integration**
Automated validation in deployment pipeline

---

## 🔍 Monitoring

### View Automation Logs

```bash
# Check recent automation runs
tail -f .cursor/automation/last-run.json

# View git commits with rule updates
git log --grep="auto-update Cursor rules"
```

### Debugging

```bash
# Run with verbose output
DEBUG=* tsx .cursor/automation/rules-updater.ts

# Test specific trigger
tsx .cursor/automation/rules-updater.ts --test schema
```

---

## 🎯 Best Practices

### 1. **Run Watcher During Development**
Keep rules in sync as you code

### 2. **Review Automated Changes**
Check rule diffs before committing

### 3. **Update Triggers as Needed**
Add new patterns to `.cursor/mcp.json` automation section

### 4. **Monitor CI/CD**
Review GitHub Actions runs for automation status

### 5. **Keep Dependencies Updated**
Regularly update automation dependencies

---

## 🔮 Future Enhancements

Potential additions:
- [ ] ML-powered rule generation based on code patterns
- [ ] Automatic detection of best practices violations
- [ ] Integration with Linear/Notion for documentation sync
- [ ] Slack notifications for rule updates
- [ ] Weekly automation summary reports
- [ ] A/B testing for rule effectiveness
- [ ] Auto-generation of custom modes based on workflow

---

## 🔗 References

- [MCP Cursor Rules Server](https://mcpmarket.com/server/cursor-rules)
- [Cursor Automation Best Practices](https://developertoolkit.ai/en/cursor-ide/advanced-techniques/automation-workflows/)
- [File Watchers with Chokidar](https://github.com/paulmillr/chokidar)
- [Husky Git Hooks](https://typicode.github.io/husky/)
- [GitHub Actions Workflows](https://docs.github.com/en/actions/using-workflows)

---

**Last Updated:** January 2025  
**Maintained by:** Development Team  
**Status:** ✅ Active and Running

