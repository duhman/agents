import { z } from "zod";

export const stageEnum = z.enum(["loading", "processing", "complete", "error"]);

export const extractionResult = z.object({
  requestId: z.string(),
  stage: stageEnum.default("complete"),
  is_cancellation: z.boolean(),
  reason: z.enum(["moving", "other", "unknown"]),
  move_date: z.string().nullable().optional(),
  language: z.enum(["no", "en"]),
  policy_risks: z.array(z.string()).default([]),
  masked_email_preview: z.string()
});

export type ExtractionResult = z.infer<typeof extractionResult>;

export const draftingProgress = z.object({
  requestId: z.string(),
  ticketId: z.string(),
  draftId: z.string().nullable().optional(),
  progress: z.number().min(0).max(1),
  partialTextMasked: z.string().default(""),
  model: z.string(),
  temperature: z.number(),
  confidence: z.number().min(0).max(1).optional()
});

export type DraftingProgress = z.infer<typeof draftingProgress>;

export const policyValidation = z.object({
  requestId: z.string(),
  checks: z
    .array(
      z.object({
        name: z.string(),
        pass: z.boolean(),
        details: z.string().optional()
      })
    )
    .default([]),
  overallPass: z.boolean()
});

export type PolicyValidation = z.infer<typeof policyValidation>;

export const vectorSearchContext = z.object({
  requestId: z.string(),
  enabled: z.boolean().default(true),
  query: z.string(),
  results: z
    .array(
      z.object({
        id: z.string(),
        score: z.number(),
        titleMasked: z.string()
      })
    )
    .default([])
});

export type VectorSearchContext = z.infer<typeof vectorSearchContext>;

export const ticketCreationStatus = z.object({
  requestId: z.string(),
  ticketId: z.string(),
  status: z.enum(["queued", "created", "error"]).default("created"),
  createdAt: z.string()
});

export type TicketCreationStatus = z.infer<typeof ticketCreationStatus>;

export const draftCreationStatus = z.object({
  requestId: z.string(),
  draftId: z.string(),
  status: z.enum(["queued", "created", "error"]).default("created"),
  createdAt: z.string()
});

export type DraftCreationStatus = z.infer<typeof draftCreationStatus>;

export const slackPostStatus = z.object({
  requestId: z.string(),
  channelId: z.string(),
  threadTs: z.string().optional(),
  status: z.enum(["queued", "posted", "error"]).default("queued"),
  messageUrl: z.string().optional()
});

export type SlackPostStatus = z.infer<typeof slackPostStatus>;

export const humanReviewStatus = z.object({
  requestId: z.string(),
  humanReviewId: z.string().optional(),
  decision: z.enum(["pending", "approve", "edit", "reject"]).default("pending"),
  reviewerSlackId: z.string().optional(),
  finalTextMasked: z.string().optional(),
  updatedAt: z.string()
});

export type HumanReviewStatus = z.infer<typeof humanReviewStatus>;

export const artifactUnion = z.discriminatedUnion("type", [
  z.object({ type: z.literal("extraction_result"), data: extractionResult }),
  z.object({ type: z.literal("drafting_progress"), data: draftingProgress }),
  z.object({ type: z.literal("policy_validation"), data: policyValidation }),
  z.object({ type: z.literal("vector_search_context"), data: vectorSearchContext }),
  z.object({ type: z.literal("ticket_creation_status"), data: ticketCreationStatus }),
  z.object({ type: z.literal("draft_creation_status"), data: draftCreationStatus }),
  z.object({ type: z.literal("slack_post_status"), data: slackPostStatus }),
  z.object({ type: z.literal("human_review_status"), data: humanReviewStatus })
]);

export type ArtifactEvent =
  | { type: "extraction_result"; data: ExtractionResult }
  | { type: "drafting_progress"; data: DraftingProgress }
  | { type: "policy_validation"; data: PolicyValidation }
  | { type: "vector_search_context"; data: VectorSearchContext }
  | { type: "ticket_creation_status"; data: TicketCreationStatus }
  | { type: "draft_creation_status"; data: DraftCreationStatus }
  | { type: "slack_post_status"; data: SlackPostStatus }
  | { type: "human_review_status"; data: HumanReviewStatus };
