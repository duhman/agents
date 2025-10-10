import { buildNodeMeta } from "../components/operator/mapping.js";
import { assert, equal } from "./assert.js";

const artifacts = {
  ticket_creation_status: { ticketId: "T-123", status: "created" },
  draft_creation_status: { draftId: "D-456", status: "created" },
  policy_validation: { overallPass: true },
  drafting_progress: { progress: 0.6 },
  slack_post_status: { status: "posted", messageUrl: "https://slack.test/msg" },
  vector_search_context: { enabled: true, results: [{ id: "x", score: 0.9, titleMasked: "..." }] },
  extraction_result: { is_cancellation: true },
  human_review_status: { decision: "approve" }
};

const errorArtifacts = {
  ticket_creation_status: { status: "error", error: "fail T" },
  draft_creation_status: { status: "error" },
  slack_post_status: { status: "error" }
};

const meta = buildNodeMeta(artifacts);

equal(meta.create_ticket, { footer: "Ticket: T-123", status: "created" }, "ticket meta mismatch");
equal(meta.generate_draft.footer, "Progress: 60%", "draft progress footer mismatch");
equal(meta.policy, { footer: "Policy: OK", status: "success" }, "policy meta mismatch");
equal(meta.slack, { footer: "Slack: posted", status: "posted", linkUrl: "https://slack.test/msg" }, "slack meta mismatch");
equal(meta.vector_search, { footer: "Results: 1", status: "info" }, "vector search meta mismatch");
equal(meta.triage, { footer: "Cancellation: true", status: "info" }, "triage meta mismatch");
equal(meta.review, { footer: "Review: approve", status: "success" }, "review meta mismatch");

console.log("mapping.test.ts passed");
const metaErr = buildNodeMeta(errorArtifacts as any);
equal(metaErr.create_ticket.footer, "Ticket: error", "ticket error footer mismatch");
equal(metaErr.generate_draft.footer, "Draft: error", "draft error footer mismatch");
equal(metaErr.slack.footer, "Slack: error", "slack error footer mismatch");

console.log("mapping.error cases passed");
