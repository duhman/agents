export type ArtifactType =
  | "extraction_result"
  | "drafting_progress"
  | "policy_validation"
  | "vector_search_context"
  | "ticket_creation_status"
  | "draft_creation_status"
  | "slack_post_status"
  | "human_review_status";

export type ArtifactEvent = {
  requestId: string;
  type: ArtifactType;
  data: Record<string, unknown>;
};

export async function emitArtifact(evt: ArtifactEvent): Promise<void> {
  // Operator UI has been retired; we currently drop observability artifacts.
  // Keeping the function (and evt param) avoids breaking runtime code paths.
  void evt;
}
