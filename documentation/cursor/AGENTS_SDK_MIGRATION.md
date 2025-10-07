# OpenAI Agents SDK Migration Plan

## Overview

This document outlines the completed migration to the official OpenAI Agents SDK for TypeScript (`@openai/agents`). The migration has been successfully completed and the Agents SDK is now the primary implementation.

## Migration Status: ✅ COMPLETED

### Phase 1: Pilot ✅

- ✅ Added `packages/agents-runtime` with agents, tools, and guardrails
- ✅ Implemented `USE_AGENTS_SDK` feature flag
- ✅ Wrapped current `processEmail` to call `emailProcessingAgent` when enabled
- ✅ Observed traces, latency, and accuracy

### Phase 2: Handoffs ✅

- ✅ Implemented `emailProcessingAgent` → `triageAgent` → `cancellationAgent` handoffs
- ✅ Expanded tools: `maskPiiTool`, `vectorStoreSearchTool`, `createTicketTool`, `createDraftTool`, `calculateConfidenceTool`, `generateDraftTool`, `postToSlackTool`
- ✅ Kept Slack HITM async/non-blocking

### Phase 3: Guardrails ✅

- ✅ Implemented PII and policy compliance via input/output guardrails
- ✅ Added unit tests for positive/negative cases

### Phase 4: Observability ✅

- ✅ Persisted compact trace summaries in logs
- ✅ Compared latency/accuracy vs. legacy path
- ✅ Completed rollout

## Current Status

- **Primary Implementation**: Agents SDK (`@openai/agents`)
- **Feature Flag**: `USE_AGENTS_SDK=1` (default enabled)
- **Agent Architecture**: `emailProcessingAgent` → `triageAgent` → `cancellationAgent`
- **Tools**: 7 specialized tools for the complete workflow
- **Fallback**: Deterministic fallback if agent doesn't create ticket/draft

## Rollout Status

- ✅ **Production**: Agents SDK is the primary implementation
- ✅ **Legacy Path**: Maintained for emergency rollback only
- ✅ **Monitoring**: Full observability and tracing implemented

## References

- `packages/agents-runtime/`
- `.cursor/rules/agents-sdk.mdc`
- https://openai.github.io/openai-agents-js/
