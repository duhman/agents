# Cursor Automation Scripts

This directory contains automation scripts that keep Cursor rules and configurations synchronized with the codebase.

## Scripts

### `rules-updater.ts`
Main automation engine that detects changes and updates rules.

**Usage:**
```bash
tsx .cursor/automation/rules-updater.ts
```

**What it does:**
- Detects schema, prompt, package, architecture changes
- Updates relevant rule files automatically
- Syncs `.cursormemory` with latest context
- Validates all rules
- Generates automation reports

### `file-watcher.ts`
Development mode file watcher for real-time updates.

**Usage:**
```bash
tsx .cursor/automation/file-watcher.ts
# or
pnpm cursor:watch
```

**What it does:**
- Monitors critical files during development
- Automatically triggers rule updates on changes
- Debounces changes to avoid spam
- Provides real-time feedback

## Output Files

### `last-run.json`
Contains details of the most recent automation run:
- Timestamp
- Files updated
- Changes made
- Success/failure status

**Example:**
```json
{
  "timestamp": "2025-01-03T14:53:00.000Z",
  "updates": [
    {
      "file": ".cursor/rules/database-patterns.mdc",
      "action": "updated_database_rules",
      "timestamp": "2025-01-03T14:53:00.000Z",
      "changes": ["Added 3 tables to rules"]
    }
  ]
}
```

## Integration Points

### 1. Git Hooks
- **Pre-commit**: `.husky/pre-commit` - Runs before commits
- **Post-merge**: `.husky/post-merge` - Runs after git pull/merge

### 2. CI/CD
- **GitHub Actions**: `.github/workflows/cursor-rules-sync.yml`
- Runs on push to main/develop
- Validates rule sync
- Auto-commits updates or comments on PRs

### 3. MCP Servers
- **Configuration**: `.cursor/mcp.json`
- Defines automation triggers
- Configures Cursor Rules MCP server

## Development

### Running Tests

```bash
# Test schema change detection
git diff HEAD~1 HEAD -- packages/db/src/schema.ts

# Test prompt change detection
git diff HEAD~1 HEAD -- packages/prompts/src/templates.ts
```

### Debugging

```bash
# Verbose output
DEBUG=* tsx .cursor/automation/rules-updater.ts

# Dry run (no file writes)
DRY_RUN=1 tsx .cursor/automation/rules-updater.ts
```

### Adding New Triggers

Edit `.cursor/mcp.json` automation section:

```json
{
  "automation": {
    "triggers": [
      {
        "name": "on_new_feature",
        "files": ["path/to/feature.ts"],
        "action": "update_feature_rules"
      }
    ]
  }
}
```

Then implement the action in `rules-updater.ts`.

## Troubleshooting

### Rules not updating

1. Check git diff shows changes:
   ```bash
   git diff HEAD~1 HEAD -- <file>
   ```

2. Run automation manually:
   ```bash
   tsx .cursor/automation/rules-updater.ts
   ```

3. Check last-run.json for errors

### File watcher not detecting changes

1. Ensure chokidar is installed:
   ```bash
   pnpm add -D chokidar
   ```

2. Check file is in WATCH_PATTERNS

3. Restart watcher

### Git hooks not running

1. Ensure husky is installed:
   ```bash
   pnpm prepare
   ```

2. Make hooks executable:
   ```bash
   chmod +x .husky/pre-commit
   chmod +x .husky/post-merge
   ```

3. Check git hooks path:
   ```bash
   git config core.hooksPath
   ```

## Best Practices

1. **Run watcher during development** for instant updates
2. **Review automated changes** before committing
3. **Keep automation scripts updated** with new patterns
4. **Monitor CI/CD runs** for automation status
5. **Update documentation** when adding new triggers

---

**See also:** `documentation/cursor/CURSOR_AUTOMATION.md` for complete guide

