/**
 * Enhanced Fine-Tuning Data Export Script
 * 
 * Exports approved drafts for OpenAI fine-tuning
 * Target: ≥270 examples across different categories
 */

import { db } from "@agents/db";
import { tickets, drafts, humanReviews } from "@agents/db/src/schema.js";
import { eq } from "drizzle-orm";
import { writeFileSync } from "fs";
import { systemPolicyNO_Enhanced, systemPolicyEN_Enhanced } from "@agents/prompts";

interface FineTuningExample {
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
}

async function exportForFineTuning() {
  console.log("\n🔄 Exporting fine-tuning data...\n");

  try {
    // Fetch all approved reviews with their tickets and drafts
    const reviews = await db
      .select()
      .from(humanReviews)
      .leftJoin(tickets, eq(humanReviews.ticketId, tickets.id))
      .leftJoin(drafts, eq(humanReviews.draftId, drafts.id))
      .where(eq(humanReviews.decision, "approved"))
      .limit(1000);

    console.log(`Found ${reviews.length} approved reviews\n`);

    if (reviews.length === 0) {
      console.log("⚠️  No approved reviews found yet.");
      console.log("   Continue using HITM workflow to collect examples.\n");
      return;
    }

    // Process reviews into fine-tuning format
    const examples: FineTuningExample[] = reviews
      .filter(r => r.tickets && r.drafts && r.tickets.rawEmailMasked)
      .map(r => ({
        messages: [
          {
            role: "system" as const,
            content: r.drafts!.language === "no" 
              ? systemPolicyNO_Enhanced 
              : systemPolicyEN_Enhanced
          },
          {
            role: "user" as const,
            content: r.tickets!.rawEmailMasked
          },
          {
            role: "assistant" as const,
            content: r.humanReviews.finalText
          }
        ]
      }));

    // Calculate distribution
    const byLanguage = examples.reduce((acc, e) => {
      const lang = e.messages[0].content.includes("Norwegian") ? "NO" : "EN";
      acc[lang] = (acc[lang] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Analyze edge cases (basic heuristic)
    const byCategory = {
      standard_relocation: 0,
      future_move_date: 0,
      no_app_access: 0,
      sameie_concern: 0,
      already_canceled: 0,
      other: 0
    };

    examples.forEach(e => {
      const userContent = e.messages[1].content.toLowerCase();
      if (userContent.includes("sameie") || userContent.includes("association")) {
        byCategory.sameie_concern++;
      } else if (userContent.includes("allerede") || userContent.includes("already")) {
        byCategory.already_canceled++;
      } else if (userContent.includes("app") && (userContent.includes("ikke") || userContent.includes("not"))) {
        byCategory.no_app_access++;
      } else if (userContent.match(/oktober|november|desember|october|november|december/)) {
        byCategory.future_move_date++;
      } else if (userContent.includes("flytt") || userContent.includes("moving")) {
        byCategory.standard_relocation++;
      } else {
        byCategory.other++;
      }
    });

    // Write to JSONL file
    const jsonlContent = examples.map(e => JSON.stringify(e)).join("\n");
    const filename = `fine-tuning-data-${new Date().toISOString().split('T')[0]}.jsonl`;
    writeFileSync(filename, jsonlContent);

    console.log("✅ Export complete!\n");
    console.log("📊 Distribution:");
    console.log(`   Total examples: ${examples.length}`);
    console.log(`   By language:`);
    Object.entries(byLanguage).forEach(([lang, count]) => {
      console.log(`     - ${lang}: ${count} (${((count / examples.length) * 100).toFixed(1)}%)`);
    });
    console.log(`   By category:`);
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`     - ${cat}: ${count}`);
    });
    console.log(`\n📝 File: ${filename}`);

    // Check if we have enough for fine-tuning
    console.log("\n🎯 Fine-Tuning Readiness:");
    const MINIMUM_REQUIRED = 270;
    if (examples.length >= MINIMUM_REQUIRED) {
      console.log(`   ✅ Ready! You have ${examples.length}/${MINIMUM_REQUIRED} examples`);
      console.log("\n   Next steps:");
      console.log("   1. Review the JSONL file for quality");
      console.log("   2. Upload to OpenAI fine-tuning:");
      console.log(`      openai api fine_tunes.create -t ${filename} -m gpt-4o-mini-2024-07-18`);
      console.log("   3. Monitor training progress");
      console.log("   4. Test fine-tuned model vs base model");
      console.log("   5. Deploy if ≥10% improvement in approval rate\n");
    } else {
      const needed = MINIMUM_REQUIRED - examples.length;
      console.log(`   ⚠️  Need ${needed} more examples (${examples.length}/${MINIMUM_REQUIRED})`);
      console.log("   Continue using HITM workflow to collect more approved drafts.\n");
      
      console.log("   Target distribution:");
      console.log("   - Standard relocation (NO): 100");
      console.log("   - Standard relocation (EN): 50");
      console.log("   - Future move date: 30");
      console.log("   - No app access: 30");
      console.log("   - Sameie concern: 20");
      console.log("   - Already canceled: 20");
      console.log("   - Swedish language: 20");
      console.log("   Total: 270 minimum\n");
    }

  } catch (error: any) {
    console.error("❌ Export failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

exportForFineTuning();

