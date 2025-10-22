AGENTS.md — Quick contributor guide

## Build/Lint/Test

- Build: `pnpm build` (root); per-package: `pnpm --filter @agents/agent build`
- Lint: `pnpm lint` (eslint); auto-fix with `pnpm lint -- --fix`
- Test: `pnpm test` (runs agent tests)
- Single test: run a TS file with TSX:
  ```bash
  node --enable-source-maps ./node_modules/tsx/dist/cli.mjs apps/agent/src/tests/classification.test.ts
  ```
- Scoped single test:
  ```bash
  pnpm --filter @agents/agent exec -- \
    node --enable-source-maps ./node_modules/tsx/dist/cli.mjs apps/agent/src/tests/classification.test.ts
  ```

## Code Style

- Imports: prefer workspace aliases; use `type` imports for TypeScript types
- Formatting: rely on Prettier; use `pnpm format` and `pnpm format:check`
- Types/Naming: explicit returns; camelCase for functions, PascalCase for types; ALL_CAPS constants

## Dependencies

- **Zod v3.22.0**: Current version due to OpenAI SDK compatibility (see `ZOD_UPGRADE_NOTES.md`)
- **OpenAI SDK v6.2.0**: Uses `zodResponseFormat()` for structured outputs
- **Node.js 20+**: Required runtime with TypeScript strict mode

## Cursor Rules

- Rules live in `.cursor/rules/` (root and nested); see README for MDC format
- Core principles include privacy-first PII masking and schema-driven development
- Hybrid deterministic/AI processing patterns documented in `ai-processing.mdc`
