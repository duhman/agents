# Zod Upgrade Notes

## Current Status: Zod v3.22.0

The project currently uses Zod v3.22.0 across all packages due to OpenAI SDK compatibility constraints.

## Upgrade Attempt (January 2025)

### What We Tried

1. **Updated all package.json files** to use `zod@^4.1.12`
2. **Fixed schema syntax** for Zod v4 compatibility:
   - Changed `z.string().date().optional().nullable()` to `z.string().date().nullable().optional()`
   - Added error messages to `.date()` calls
3. **Encountered build failures** in `apps/agent/src/hybrid-processor.ts` at line 85:
   ```
   error TS2345: Argument of type 'ZodObject<...>' is not assignable to parameter of type 'ZodType<any, ZodTypeDef, any>'
   ```

### Root Cause

The `openai/helpers/zod` module in `openai@6.2.0`:

- Expects Zod v3 types (`ZodType<any, ZodTypeDef, any>`)
- Uses vendored `zod-to-json-schema` that imports `ZodFirstPartyTypeKind`
- `ZodFirstPartyTypeKind` was removed in Zod v4

### Revert Decision

Reverted to Zod v3.22.0 to maintain:

- ✅ Working builds
- ✅ Runtime compatibility with `zodResponseFormat()`
- ✅ No breaking changes to existing code

## Future Upgrade Path

### Option 1: Wait for OpenAI SDK Support

- Track issue: `openai/openai-node#1576`
- Wait for official Zod v4 support in `openai/helpers/zod`
- Expected timeline: TBD

### Option 2: Custom zodResponseFormat Implementation

- Replace `openai/helpers/zod` with custom implementation
- Use `zod-to-json-schema` directly with Zod v4
- Requires testing and validation

### Option 3: Fork and Patch

- Fork `openai` package locally
- Update vendored `zod-to-json-schema` to v4-compatible version
- Maintain custom fork until upstream support

## Current Dependencies

```json
{
  "zod": "^3.22.0",
  "openai": "^6.2.0"
}
```

## Files Modified During Attempt

- `apps/agent/package.json`
- `apps/docs/package.json`
- `packages/core/package.json`
- `packages/prompts/package.json`
- `packages/prompts/src/templates-enhanced.ts`
- `apps/agent/src/hybrid-processor.ts`

All changes have been reverted to maintain working state.

## References

- [Zod v4 Migration Guide](https://zod.dev/v4/changelog)
- [OpenAI Node SDK Issue #1576](https://github.com/openai/openai-node/issues/1576)
- [Zod v4 Breaking Changes](https://zod.dev/v4/changelog)
