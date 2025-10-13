# Operator UI + Observability (Artifacts-driven) — Living Spec

- SDKs: AI SDK v5 (https://ai-sdk.dev), ai-sdk-tools (Artifacts/Store/Devtools/Cache)
- Principles: privacy-first, read-only v1, Slack is system of record, schema-driven
- Flags: UI_EXPERIMENTAL_OPERATOR, DEVTOOLS_ENABLED, CACHE_VECTOR_SEARCH (all default false)

## Artifacts (Zod)
See @agents/artifacts-schemas for canonical schemas:
- extraction_result
- drafting_progress
- policy_validation
- vector_search_context
- ticket_creation_status
- draft_creation_status
- slack_post_status
- human_review_status

## Producer emission points
- extractionAgent completion
- vectorStoreSearchTool
- createTicketTool, createDraftTool
- calculateConfidenceTool, validatePolicyComplianceTool
- postToSlackTool
- human review state reconciliation

All human-readable fields masked at source with maskPII from @agents/core.

## Transport
- SSE per run at /api/operator/runs/:requestId/stream
- Heartbeats every 15s, reconnect with backoff; polling fallback

## Operator APIs (read-only)
- GET /api/operator/runs?recent=50
- GET /api/operator/runs/:requestId
- GET /api/operator/runs/:requestId/stream (SSE)

Responses pass a PII sanitizer that rejects payloads with unmasked emails/phones/addresses.

## Slack Modal Requirements (2025-10-10)
- Ack every interaction within 3 seconds (`response_action` or 200 JSON) — [Slack docs](https://docs.slack.dev/interactivity/handling-user-interaction)
- `trigger_id` & modal interactivity pointers expire 3 seconds after Slack issues them — [Modals guide](https://docs.slack.dev/surfaces/modals)
- For `view_submission` events: use HTTP response (`response_action: "push"`) to avoid `views.open` retries/timeouts in serverless runtimes
- For `block_actions` events: use `views.open` API with `trigger_id` (response_action is not supported)
- Trim or reject payloads beyond Slack’s 3k plain-text input limit before responding; log when fallback truncation occurs

## UI
- Next.js route/app gated by UI_EXPERIMENTAL_OPERATOR
- Left: Recent runs
- Center: AI Elements Canvas (animated executed path, temporary alternatives)
- Right: Details for selected node
- Devtools: dev-only
- No mutations; Slack link-outs only

## Caching (optional)
- Vector search only; short TTL; masked summaries; kill-switch

## Testing
- Unit: schemas parse; sanitizer deny-list; maskPII golden
- Integration: artifact emission → SSE stream; DB anchors
- E2E: live stream renders; no unmasked PII; Slack link works

## Rollout
- Dark deploy with flags off → staging canary → internal prod canary
- CI gates for PII and prod flag safety
