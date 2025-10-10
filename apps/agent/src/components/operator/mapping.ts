export function buildNodeMeta(latestArtifacts: Record<string, any>) {
  const meta: Record<string, { footer?: string; status?: string; linkUrl?: string }> = {};

  if (latestArtifacts.ticket_creation_status) {
    const t = latestArtifacts.ticket_creation_status;
    meta.create_ticket = {
      footer: t.status === 'error' ? 'Ticket: error' : `Ticket: ${t.ticketId ?? '—'}`,
      status: t.status ?? 'unknown'
    };
  }

  if (latestArtifacts.draft_creation_status) {
    const d = latestArtifacts.draft_creation_status;
    meta.generate_draft = {
      footer: d.status === 'error' ? 'Draft: error' : `Draft: ${d.draftId ?? '—'}`,
      status: d.status ?? 'unknown'
    };
  }

  if (latestArtifacts.policy_validation) {
    const p = latestArtifacts.policy_validation;
    const ok = !!p.overallPass;
    meta.policy = {
      footer: ok ? 'Policy: OK' : 'Policy: Attention',
      status: ok ? 'success' : 'warning'
    };
  }

  if (latestArtifacts.drafting_progress) {
    const dp = latestArtifacts.drafting_progress;
    meta.generate_draft = {
      footer: typeof dp.progress === 'number' ? `Progress: ${(dp.progress * 100).toFixed(0)}%` : 'Progress: —',
      status: dp.progress === 1 ? 'success' : 'running'
    };
  }

  if (latestArtifacts.slack_post_status) {
    const s = latestArtifacts.slack_post_status;
    meta.slack = {
      footer: s.status === 'error' ? 'Slack: error' : `Slack: ${s.status}`,
      status: s.status,
      linkUrl: s.messageUrl || ''
    };
  }

  if (latestArtifacts.vector_search_context) {
    const v = latestArtifacts.vector_search_context;
    meta.vector_search = {
      footer: v.enabled ? `Results: ${Array.isArray(v.results) ? v.results.length : 0}` : 'Disabled',
      status: v.enabled ? 'info' : 'idle'
    };
  }

  if (latestArtifacts.extraction_result) {
    const ex = latestArtifacts.extraction_result;
    meta.triage = {
      footer: ex.is_cancellation ? 'Cancellation: true' : 'Cancellation: false',
      status: 'info'
    };
  }

  if (latestArtifacts.human_review_status) {
    const hr = latestArtifacts.human_review_status;
    meta.review = {
      footer: `Review: ${hr.decision ?? 'pending'}`,
      status: hr.decision === 'approve' ? 'success' : hr.decision === 'reject' ? 'warning' : 'info'
    };
  }

  return meta;
}
