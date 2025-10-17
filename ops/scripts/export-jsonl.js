#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Export training JSONL from human_reviews table
 */
require("dotenv/config");
const db_1 = require("@agents/db");
const fs_1 = require("fs");
const path_1 = require("path");
async function exportTrainingData() {
    console.log("Fetching approved/edited reviews...");
    const reviews = await db_1.db
        .select({
        ticketId: db_1.humanReviews.ticketId,
        decision: db_1.humanReviews.decision,
        finalText: db_1.humanReviews.finalText,
        createdAt: db_1.humanReviews.createdAt
    })
        .from(db_1.humanReviews)
        .where((0, db_1.eq)(db_1.humanReviews.decision, "approve"))
        .orderBy(db_1.humanReviews.createdAt);
    console.log(`Found ${reviews.length} approved reviews`);
    const jsonlLines = [];
    for (const review of reviews) {
        if (!review.ticketId)
            continue;
        const ticket = await db_1.db.query.tickets.findFirst({
            where: (0, db_1.eq)(db_1.tickets.id, review.ticketId)
        });
        if (!ticket)
            continue;
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
    const outPath = (0, path_1.join)(process.cwd(), "ops", "training-data.jsonl");
    (0, fs_1.writeFileSync)(outPath, jsonlLines.join("\n"));
    console.log(`✓ Exported ${jsonlLines.length} training examples to ${outPath}`);
}
exportTrainingData().catch(err => {
    console.error("✗ Export failed:", err);
    process.exit(1);
});
