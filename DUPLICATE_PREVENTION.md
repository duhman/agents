# Duplicate Assistant Prevention

## Overview

The setup script includes built-in duplicate prevention to ensure you never accidentally create multiple extraction or response assistants in your OpenAI account.

## Problem Solved

Without duplicate prevention:
- Running setup script multiple times = multiple assistants created
- Each duplicate wastes API quota and increases costs
- Difficult to track which assistant is actually being used
- Confusing to manage multiple versions

With duplicate prevention:
- ✅ First run creates assistants
- ✅ Subsequent runs UPDATE existing assistants
- ✅ Never creates duplicates if IDs are saved
- ✅ Simple, predictable behavior

## How It Works

### Strategy 1: Environment Variables (Recommended)

**First Run:**
```bash
pnpm tsx scripts/setup-assistants.ts

# Output:
# OPENAI_EXTRACTION_ASSISTANT_ID=asst_abc123...
# OPENAI_RESPONSE_ASSISTANT_ID=asst_xyz789...
```

**Save IDs to `.env`:**
```bash
OPENAI_EXTRACTION_ASSISTANT_ID=asst_abc123...
OPENAI_RESPONSE_ASSISTANT_ID=asst_xyz789...
```

**Subsequent Runs:**
```bash
pnpm tsx scripts/setup-assistants.ts

# Script detects IDs in environment
# Updates existing assistants instead of creating new ones
```

### Strategy 2: Name-Based Detection

If you don't have IDs saved, the script checks by assistant name:

1. Queries all existing assistants
2. Searches for name: "Elaway Cancellation Extraction Assistant"
3. If found, displays the ID and prevents creation
4. Prompts you to set environment variable

**Example:**
```
⚠ Found existing assistant with same name: asst_abc123...

To update this assistant, set the environment variable:
export OPENAI_EXTRACTION_ASSISTANT_ID=asst_abc123...
Then re-run this script.
```

## Implementation Details

### Code Pattern

```typescript
// Check if assistant with same name already exists
const existingAssistants = await openai.beta.assistants.list();
const duplicate = existingAssistants.data.find(a => a.name === config.name);

if (duplicate) {
  // Assistant exists - either update via ID or ask user to set ID
  if (existingId) {
    // Update mode: User provided ID explicitly
    await openai.beta.assistants.update(existingId, config);
  } else {
    // Prevent mode: Name found but no ID set
    throw new Error(`Assistant already exists with ID: ${duplicate.id}`);
  }
} else {
  // New assistant - safe to create
  await openai.beta.assistants.create(config);
}
```

### Three Scenarios

| Scenario | Has ID in Env | Found by Name | Action |
|----------|---------------|---------------|--------|
| First run | No | No | ✅ Create new assistant |
| Update mode | Yes | Yes | ✅ Update existing assistant |
| Accidental duplicate | No | Yes | ❌ Throw error, ask for ID |

## Workflow Examples

### Example 1: First-Time Setup

```bash
# Run setup script
$ pnpm tsx scripts/setup-assistants.ts

============================================================
OpenAI Assistants Setup
============================================================

Creating assistant: Elaway Cancellation Extraction Assistant
✓ Assistant created: asst_Qtu1xSD7Y7LFdSZhEgBxolbl

Creating assistant: Elaway Customer Response Assistant
✓ Assistant created: asst_s1l8A0iGEnBdvDxLHkrZbQjh

Add these environment variables to your .env file:

OPENAI_EXTRACTION_ASSISTANT_ID=asst_Qtu1xSD7Y7LFdSZhEgBxolbl
OPENAI_RESPONSE_ASSISTANT_ID=asst_s1l8A0iGEnBdvDxLHkrZbQjh
```

**Action:** Save the IDs to `.env`

### Example 2: Update with IDs in Environment

```bash
# IDs already saved in .env
$ export OPENAI_EXTRACTION_ASSISTANT_ID=asst_Qtu1xSD7Y7LFdSZhEgBxolbl
$ export OPENAI_RESPONSE_ASSISTANT_ID=asst_s1l8A0iGEnBdvDxLHkrZbQjh

$ pnpm tsx scripts/setup-assistants.ts

Found existing assistant IDs in environment:
  - Extraction: asst_Qtu1xSD7Y7LFdSZhEgBxolbl
  - Response: asst_s1l8A0iGEnBdvDxLHkrZbQjh
These will be updated with new configurations.

Updating existing assistant: asst_Qtu1xSD7Y7LFdSZhEgBxolbl
✓ Assistant updated: asst_Qtu1xSD7Y7LFdSZhEgBxolbl

Updating existing assistant: asst_s1l8A0iGEnBdvDxLHkrZbQjh
✓ Assistant updated: asst_s1l8A0iGEnBdvDxLHkrZbQjh
```

**Result:** Existing assistants updated, no duplicates created

### Example 3: Accidental Run Without IDs

```bash
# Forgot to set environment variables
$ pnpm tsx scripts/setup-assistants.ts

Checking for existing assistant: Elaway Cancellation Extraction Assistant
⚠ Found existing assistant with same name: asst_Qtu1xSD7Y7LFdSZhEgBxolbl

To update this assistant, set the environment variable:
export OPENAI_EXTRACTION_ASSISTANT_ID=asst_Qtu1xSD7Y7LFdSZhEgBxolbl
Then re-run this script.

✗ Setup failed: Assistant "Elaway Cancellation Extraction Assistant" already exists
```

**Action:** Set environment variable and try again

## Best Practices

### ✅ DO

1. **Save IDs immediately after first run**
   ```bash
   # Copy these to .env
   OPENAI_EXTRACTION_ASSISTANT_ID=asst_...
   OPENAI_RESPONSE_ASSISTANT_ID=asst_...
   ```

2. **Commit IDs to version control** (in .env.example for security)
   ```bash
   # .env.example
   OPENAI_EXTRACTION_ASSISTANT_ID=asst_example123
   OPENAI_RESPONSE_ASSISTANT_ID=asst_example456
   ```

3. **Use setup script for all configuration updates**
   - Modifying assistant instructions? Use setup script
   - Changing temperature? Use setup script
   - Updating vector store? Use setup script

### ❌ DON'T

1. **Don't run setup without environment variables**
   - Can't prevent duplicates if IDs aren't provided

2. **Don't manually create assistants in OpenAI Dashboard**
   - Name-based detection won't find them
   - Better to use setup script for consistency

3. **Don't lose track of assistant IDs**
   - Save to `.env`, `.env.production`, deployment config
   - Use version control (with secrets management)

4. **Don't create assistants with different names**
   - Keep names consistent: "Elaway Cancellation Extraction Assistant"
   - Makes duplicate detection reliable

## Verification Checklist

After setup:
- [ ] IDs saved in `.env`
- [ ] IDs set in `.env.example` (or similar docs)
- [ ] Verified IDs exist in OpenAI Dashboard
- [ ] Run setup script again to test duplicate prevention
- [ ] Confirm existing assistants were updated, not recreated

## Troubleshooting

### Q: How do I find my existing assistant IDs?

Run the setup script without environment variables. It will detect existing assistants by name and show you the ID.

```bash
$ pnpm tsx scripts/setup-assistants.ts

⚠ Found existing assistant with same name: asst_abc123...
```

### Q: I accidentally created duplicates. What do I do?

1. Identify which ID is correct
2. Delete duplicates in OpenAI Dashboard
3. Set correct ID in environment: `export OPENAI_EXTRACTION_ASSISTANT_ID=asst_correct`
4. Run setup script to update

### Q: Can I delete assistants via the script?

Not yet. For now:
- Delete via OpenAI Dashboard
- Re-run setup script to create new ones
- This is intentional to prevent accidental deletion

### Q: What if I want to use a different vector store?

1. Modify `scripts/setup-assistants.ts`
2. Set environment variables with existing IDs
3. Run setup script - it will update assistants with new vector store

## References

- Setup Script: `scripts/setup-assistants.ts`
- Documentation: `MODEL_REQUIREMENTS.md`
- Cursor Rules: `.cursor/rules/ai-processing.mdc`
- OpenAI Assistants: https://platform.openai.com/docs/assistants
