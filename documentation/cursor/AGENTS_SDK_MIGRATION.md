# OpenAI Agents SDK Migration Plan

## Overview
This document outlines the phased migration to the official OpenAI Agents SDK for TypeScript (`@openai/agents`). We will adopt the SDK incrementally behind a feature flag to minimize risk and ensure continuity.

## Phases

### Phase 1: Pilot (Weeks 1–2)
- Add `packages/agents-runtime` with agents, tools, and guardrails.
- Implement `USE_AGENTS_SDK` feature flag.
- Wrap current `processEmail` to call `triageAgent` when enabled.
- Observe traces, latency, and accuracy.

### Phase 2: Handoffs (Weeks 3–4)
- Triage → specialized agents (cancellation handler).
- Expand tools as needed.
- Keep Slack HITM async/non-blocking.

### Phase 3: Guardrails (Week 5)
- Enforce PII and policy compliance via input/output guardrails.
- Add unit tests for positive/negative cases.

### Phase 4: Observability (Week 6)
- Persist compact trace summaries in logs.
- Compare latency/accuracy vs. legacy path.
- Decide rollout.

## Rollout
- Stage 1: `USE_AGENTS_SDK=0` (default) – manual tests only.
- Stage 2: Staging enablement – verify metrics.
- Stage 3: Gradual prod enablement – easy rollback via env var.

## Backout
- Toggle `USE_AGENTS_SDK=0`.
- Legacy path remains intact.

## References
- `packages/agents-runtime/`
- `.cursor/rules/agents-sdk.mdc`
- https://openai.github.io/openai-agents-js/
