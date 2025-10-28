#!/usr/bin/env tsx
/**
 * Export training data from human reviews for fine-tuning and analysis
 * Joins tickets, drafts, and human_reviews; masks PII; outputs JSONL
 * 
 * Usage: pnpm tsx scripts/export-training-data.ts [--output ./training-data.jsonl]
 */

import { writeFileSync } from "fs";
import { resolve } from "path";
import { getHumanReviewsWithContext, getReviewStats } from "../packages/db/src/repositories.js";
import { maskPII } from "@agents/core";

interface TrainingExample {
  id: string;
  ticket_id: string;
  draft_id: string;
  decision: "approve" | "edit" | "reject";
  source: string;
  language: string;
  original_email_masked: string;
  original_reason: string | null;
  original_move_date: string | null;
  generated_draft: string;
  draft_confidence: string;
  final_text: string;
  reviewer_slack_id: string;
  created_at: string;
}

async function exportTrainingData(outputPath: string): Promise<void> {
  console.log(`[EXPORT] Starting training data export to ${outputPath}`);

  try {
    // Get all reviews with context
    const reviews = await getHumanReviewsWithContext();
    console.log(`[EXPORT] Retrieved ${reviews.length} human reviews`);

    const examples: TrainingExample[] = [];

    for (const review of reviews) {
      if (!review.draft) {
        console.warn(`[EXPORT] Review ${review.id} missing draft, skipping`);
        continue;
      }

      const ticket = review.draft.ticket;
      if (!ticket) {
        console.warn(`[EXPORT] Review ${review.id} missing ticket, skipping`);
        continue;
      }

      const example: TrainingExample = {
        id: review.id,
        ticket_id: ticket.id,
        draft_id: review.draftId || "",
        decision: review.decision as "approve" | "edit" | "reject",
        source: ticket.source || "unknown",
        language: review.draft.language || "unknown",
        original_email_masked: maskPII(ticket.rawEmailMasked || ""),
        original_reason: ticket.reason || null,
        original_move_date: ticket.moveDate ? new Date(ticket.moveDate).toISOString().split("T")[0] : null,
        generated_draft: review.draft.draftText || "",
        draft_confidence: review.draft.confidence?.toString() || "0",
        final_text: review.finalText || "",
        reviewer_slack_id: maskPII(review.reviewerSlackId || ""),
        created_at: review.createdAt?.toISOString() || new Date().toISOString()
      };

      examples.push(example);
    }

    // Write JSONL format
    const jsonlLines = examples.map(ex => JSON.stringify(ex)).join("\n");
    writeFileSync(outputPath, jsonlLines, "utf-8");

    console.log(`[EXPORT] Exported ${examples.length} training examples to ${outputPath}`);

    // Print stats
    const stats = await getReviewStats();
    console.log(`[EXPORT] Review statistics:`, JSON.stringify(stats, null, 2));

    // Break down by decision
    const byDecision = {
      approved: examples.filter(ex => ex.decision === "approve").length,
      edited: examples.filter(ex => ex.decision === "edit").length,
      rejected: examples.filter(ex => ex.decision === "reject").length
    };
    console.log(`[EXPORT] Breakdown by decision:`, JSON.stringify(byDecision, null, 2));

    // Language distribution
    const languages = examples.reduce(
      (acc, ex) => {
        acc[ex.language] = (acc[ex.language] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    console.log(`[EXPORT] Language distribution:`, JSON.stringify(languages, null, 2));

    console.log(`[EXPORT] Export completed successfully`);
  } catch (error: any) {
    console.error(
      `[EXPORT] Failed to export training data: ${error?.message || String(error)}`
    );
    process.exit(1);
  }
}

// Parse command-line arguments
const outputPathArg = process.argv.find(arg => arg.startsWith("--output="));
const outputPath = outputPathArg
  ? outputPathArg.replace("--output=", "")
  : resolve(process.cwd(), "training-data.jsonl");

exportTrainingData(outputPath).catch(error => {
  console.error(`[EXPORT] Unhandled error:`, error);
  process.exit(1);
});
