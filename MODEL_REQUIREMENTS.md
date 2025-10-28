# Model Requirements for OpenAI Assistants API

## Overview

This project uses OpenAI's Assistants API exclusively with the `gpt-4.1` model for both extraction and response generation assistants.

## Model Choice: gpt-4.1

### Why gpt-4.1?

`gpt-4.1` is the ONLY model that fully supports:
- **Assistants API** with all features
- **File Search Tool** (required for vector store integration)
- **Thread Management** and streaming responses
- **Structured Outputs** via JSON schemas

### Assistants in This Project

1. **Extraction Assistant** (`scripts/setup-assistants.ts`)
   - Model: `gpt-4.1`
   - Temperature: 0 (deterministic)
   - Purpose: Extract structured data from customer emails

2. **Response Assistant** (`scripts/setup-assistants.ts`)
   - Model: `gpt-4.1`
   - Temperature: 0.3 (controlled creativity)
   - Purpose: Generate personalized customer responses

## Models NOT Supported for Assistants

The following models do NOT support Assistants API with file_search tool:

- ❌ `gpt-5-mini` - Not compatible with Assistants API
- ❌ `gpt-4o-mini-2024-07-18` - Missing file_search support
- ❌ `gpt-4o-2024-08-06` - Chat completions model, not Assistants model
- ❌ Any other non-`gpt-4.1` model

Reference: https://platform.openai.com/docs/models/gpt-4.1

## Usage Rules

### ✅ DO

```typescript
// Correct: Use gpt-4.1 for assistants
const extractionConfig: AssistantSetupConfig = {
  name: "Extraction Assistant",
  model: "gpt-4.1",  // ✅ CORRECT
  temperature: 0,
  tools: [{ type: "file_search" }],
  // ...
};
```

### ❌ DON'T

```typescript
// Wrong: Don't use other models for assistants
const config = {
  model: "gpt-5-mini",                  // ❌ Not supported
  model: "gpt-4o-mini-2024-07-18",      // ❌ No file_search
  model: "gpt-4o-2024-08-06",           // ❌ Chat API only
};
```

## Files Using gpt-4.1

| File | Component | Model |
|------|-----------|-------|
| `scripts/setup-assistants.ts` | Extraction Assistant Config | `gpt-4.1` |
| `scripts/setup-assistants.ts` | Response Assistant Config | `gpt-4.1` |
| `apps/agent/src/assistant-config.ts` | Configuration Functions | References `gpt-4.1` |

## Documentation Files

The following files document the model choice:

- `README.md` - Architecture overview with model specs
- `.cursor/rules/ai-processing.mdc` - Model requirements section
- `MIGRATION_SUMMARY.md` - Implementation details
- `MODEL_REQUIREMENTS.md` - This file (authoritative model documentation)

## Key Features Supported by gpt-4.1

### For Assistants API

- ✅ File Search (vector store integration)
- ✅ Thread Management
- ✅ Streaming Responses
- ✅ Structured Outputs
- ✅ Tool Calling (including file_search)
- ✅ Temperature Control

### Intelligence Level

- High reasoning capability
- 1,847,576 token context window
- 32,768 max output tokens
- Knowledge cutoff: Jun 01, 2024

## Setup and Configuration

### Creating Assistants

```bash
# Run setup script to create assistants with gpt-4.1
pnpm tsx scripts/setup-assistants.ts

# Output:
# OPENAI_EXTRACTION_ASSISTANT_ID=asst_...
# OPENAI_RESPONSE_ASSISTANT_ID=asst_...
```

### Updating Assistants

To update assistant configurations:

1. Modify `scripts/setup-assistants.ts`
2. Ensure model remains `gpt-4.1`
3. Re-run: `pnpm tsx scripts/setup-assistants.ts`

The script will update existing assistants (idempotent operation).

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Input Cost | $2.00 per 1M tokens |
| Output Cost | $8.00 per 1M tokens |
| Context Window | 1,847,576 tokens |
| Max Output | 32,768 tokens |
| Intelligence | Higher (reasoning-focused) |

## Troubleshooting

### Error: "Model 'X' cannot be used with the Assistants API"

**Solution:** Change model to `gpt-4.1` in the configuration.

### Error: "file_search tool not supported"

**Solution:** Ensure assistant is created with `gpt-4.1` model.

### Assistants Not Using Vector Store

**Solution:** Verify gpt-4.1 model and file_search tool are configured.

## References

- OpenAI Models Docs: https://platform.openai.com/docs/models/gpt-4.1
- Assistants API: https://platform.openai.com/docs/assistants
- File Search Tool: https://platform.openai.com/docs/assistants/tools/file-search

## Future Updates

If OpenAI releases new models with Assistants API support:

1. Update `scripts/setup-assistants.ts`
2. Update this documentation
3. Update `.cursor/rules/ai-processing.mdc`
4. Update `README.md`
5. Re-run setup script to migrate assistants

Always prioritize models officially documented as supporting Assistants API.
