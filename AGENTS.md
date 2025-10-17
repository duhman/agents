AGENTS.md — Quick contributor guide
Build/Lint/Test

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
  Code Style
- Imports: prefer workspace aliases; use `type` imports for TypeScript types
- Formatting: rely on Prettier; use `pnpm format` and `pnpm format:check`
- Types/Naming: explicit returns; camelCase for functions, PascalCase for types; ALL_CAPS constants
  Cursor Rules
- Rules live in `.cursor/rules/` (root and nested); see README for MDC format
