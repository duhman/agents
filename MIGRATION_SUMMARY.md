# Migration to Persistent Reusable Assistants - Complete

## Overview

Successfully migrated from creating OpenAI assistants on every cold start to creating them once and reusing the same assistant IDs across all requests. This ensures consistency, enables performance tracking, and eliminates cold-start overhead.

## Changes Made

### 1. Created Setup Script (`scripts/setup-assistants.ts`)

Programmatically creates both persistent assistants with full control over model and tools:

- **Model**: `gpt-4.1` (required for Assistants API compatibility with file_search tool)
- **Tools**: `file_search` for automatic vector store retrieval
- **Idempotent**: Updates existing assistants if IDs provided in environment

Key features:
- One-time setup or updates when modifying instructions
- Full control over temperature, model, and tools (not limited by Dashboard UI)
- Automatic vector store attachment
- Clear output of assistant IDs for environment variables

**Usage:**
```bash
pnpm tsx scripts/setup-assistants.ts
```

### 2. Updated Environment Schema (`packages/core/src/index.ts`)

Made assistant IDs **required** instead of optional:

```typescript
OPENAI_EXTRACTION_ASSISTANT_ID: z.string().min(1),
OPENAI_RESPONSE_ASSISTANT_ID: z.string().min(1),
```

### 3. Refactored Assistants Processor (`apps/agent/src/assistants-processor.ts`)

**Removed:**
- Dynamic assistant creation logic (`getOrCreateAssistant()` function)
- Module-level caching variables
- ~50 lines of creation code

**Added:**
- Direct environment variable validation
- Clear error messages when IDs are missing
- Instruction to run setup script

**Result:**
- Cleaner, simpler runtime code
- No API calls wasted on creation
- Persistent assistant ID enables OpenAI Dashboard tracking

### 4. Updated Assistant Config (`apps/agent/src/assistant-config.ts`)

Added comprehensive JSDoc clarifying:
- Functions are for setup script **only**
- Runtime uses environment variables directly
- Model updated to `gpt-5-mini`

### 5. Enhanced Tests (`apps/agent/src/tests/assistants-processor.test.ts`)

Added configuration test that validates:
- Assistant IDs are present in environment
- IDs match expected format (`asst_*`)

### 6. Updated Documentation

**README.md changes:**
- New "Initial Setup" section with step-by-step instructions
- Environment variables marked as required
- Setup workflow documented
- Benefits of persistent assistants highlighted

**.cursor/rules/ai-processing.mdc changes:**
- Complete rewrite for persistent assistant approach
- Setup script as primary component
- Clear distinction between setup-time and runtime code
- Troubleshooting section for missing IDs
- Performance benefits documented

## Workflow

### First-Time Setup

1. **Create assistants:**
   ```bash
   pnpm --filter @agents/agent exec tsx scripts/setup-assistants.ts
   ```

2. **Save IDs to `.env`:**
   ```bash
   OPENAI_EXTRACTION_ASSISTANT_ID=asst_abc123...
   OPENAI_RESPONSE_ASSISTANT_ID=asst_xyz789...
   ```

3. **Verify configuration:**
   ```bash
   pnpm test
   ```

### Updating Assistants

1. **Modify instructions** in `apps/agent/src/assistant-config.ts`
2. **Re-run setup script** with existing IDs in `.env`:
   ```bash
   pnpm --filter @agents/agent exec tsx scripts/setup-assistants.ts
   ```
3. **Script updates assistants** instead of creating new ones

### Production Deployment

1. Run setup script once in development
2. Store assistant IDs in Vercel/production environment
3. Deploy code as normal
4. Assistants automatically loaded from environment

## Key Benefits

1. **Consistency**: Same assistants used for all requests
2. **Performance Tracking**: OpenAI Dashboard shows metrics over time for same assistant
3. **Zero Cold Start**: No assistant creation during request processing
4. **Easy Updates**: Modify instructions and re-run script (no code deployments needed)
5. **Full Control**: Use any model and tool configuration (not limited by Dashboard UI)
6. **Cost Efficient**: No wasted creation API calls

## Files Modified

| File | Changes |
|------|---------|
| `scripts/setup-assistants.ts` | NEW - Setup script for creating/updating assistants |
| `apps/agent/src/assistants-processor.ts` | Removed creation logic, use env vars directly |
| `apps/agent/src/assistant-config.ts` | Added JSDoc, updated model to gpt-5-mini |
| `apps/agent/src/tests/assistants-processor.test.ts` | Added config validation test |
| `packages/core/src/index.ts` | Made assistant IDs required |
| `README.md` | Added setup instructions and workflow documentation |
| `.cursor/rules/ai-processing.mdc` | Complete rewrite for persistent assistants |

## Build Status

All packages build successfully:
- `@agents/agent` ✓
- `@agents/core` ✓
- `@agents/db` ✓
- `@agents/prompts` ✓
- `@agents/slack-bot` ✓
- `@agents/docs` ✓

No linter errors in modified files.

## Next Steps

1. **Run setup script** to create persistent assistants:
   ```bash
   pnpm tsx scripts/setup-assistants.ts
   ```

2. **Save assistant IDs** to `.env` and production environment

3. **Verify tests pass**:
   ```bash
   pnpm test
   ```

4. **Deploy** code to production

5. **Monitor** OpenAI Dashboard for assistant performance metrics

## Environment Variable Checklist

Required (previously optional):
- [ ] `OPENAI_EXTRACTION_ASSISTANT_ID` - from setup script
- [ ] `OPENAI_RESPONSE_ASSISTANT_ID` - from setup script
- [ ] `OPENAI_API_KEY` - existing
- [ ] `OPENAI_VECTOR_STORE_ID` - existing
- [ ] `DATABASE_URL` - existing

Optional (unchanged):
- [ ] `SLACK_BOT_TOKEN`
- [ ] `SLACK_SIGNING_SECRET`
- [ ] `SLACK_REVIEW_CHANNEL`
- [ ] `HUBSPOT_API_KEY`
- [ ] `HUBSPOT_WEBHOOK_SECRET`

## Troubleshooting

**Error: OPENAI_EXTRACTION_ASSISTANT_ID environment variable is required**
- Run: `pnpm tsx scripts/setup-assistants.ts`
- Save output IDs to `.env`

**Error: Failed to create assistant**
- Verify `OPENAI_API_KEY` is valid
- Verify `OPENAI_VECTOR_STORE_ID` exists and is accessible
- Check OpenAI API rate limits

**Vector store searches return no results**
- Verify vector store ID is correct
- Check files are uploaded and indexed
- Ensure queries are specific enough for semantic matching

## References

- Setup script: `scripts/setup-assistants.ts`
- Processor: `apps/agent/src/assistants-processor.ts`
- Tests: `apps/agent/src/tests/assistants-processor.test.ts`
- Documentation: `README.md`, `.cursor/rules/ai-processing.mdc`
- OpenAI Docs: https://platform.openai.com/docs/assistants
