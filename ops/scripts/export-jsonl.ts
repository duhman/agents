#!/usr/bin/env tsx
/**
 * Export training JSONL from human_reviews table
 */
import "dotenv/config";
import { db, humanReviews, tickets, eq } from "@agents/db";
import { writeFileSync } from "fs";
import { join } from "path";

async function exportTrainingData() {
  console.log("Fetching approved/edited reviews...");

  const reviews = await db
    .select({
      ticketId: humanReviews.ticketId,
      decision: humanReviews.decision,
      finalText: humanReviews.finalText,
      createdAt: humanReviews.createdAt
    })
    .from(humanReviews)
    .where(eq(humanReviews.decision, "approve"))
    .orderBy(humanReviews.createdAt);

  console.log(`Found ${reviews.length} approved reviews`);

  const jsonlLines: string[] = [];

  for (const review of reviews) {
    if (!review.ticketId) continue;

    const ticket = await db.query.tickets.findFirst({
      where: eq(tickets.id, review.ticketId)
    });

    if (!ticket) continue;

    const line = JSON.stringify({
      messages: [
        { role: "user", content: ticket.rawEmailMasked },
        { role: "assistant", content: review.finalText }
      ],
      metadata: {
        ticket_id: ticket.id,
        decision: review.decision,
        created_at: review.createdAt
      }
    });

    jsonlLines.push(line);
  }

  const outPath = join(process.cwd(), "ops", "training-data.jsonl");
  writeFileSync(outPath, jsonlLines.join("\n"));

  console.log(`✓ Exported ${jsonlLines.length} training examples to ${outPath}`);
}

exportTrainingData().catch(err => {
  console.error("✗ Export failed:", err);
  process.exit(1);
});
