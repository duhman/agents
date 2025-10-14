# Operator UI (Deprecated)

The experiment to ship a standalone “Operator UI” has been retired. We now rely entirely on Slack as the human-in-the-loop surface, and the supporting code has been removed from the monorepo.

## Current State
- No server-rendered UI or Next.js app is bundled with the agent.
- Vercel functions under `/api/operator/*` have been deleted.
- Flags such as `UI_EXPERIMENTAL_OPERATOR` and `DEVTOOLS_ENABLED` no longer gate any features.
- Observability artifacts are still emitted behind the flag in case the UI returns in the future, but they produce no side effects today.

## Human Review
- Slack remains the canonical surface (Approve / Edit / Reject with modal feedback).
- Rejection reasons and edited replies are persisted via the `human_reviews` table.
- For analytics, export data directly from the database instead of relying on the old UI endpoints.

## Privacy & Masking
- Continue to enforce masking through `@agents/core` helpers before data leaves the agent runtime.
- No additional sanitizer layer is required after the UI removal.

## Documentation Notes
- Historical references to `/api/operator/runs*` have been removed from runbooks.
- Any tooling that previously queried those routes should be deleted or updated to query the database/export scripts instead.
