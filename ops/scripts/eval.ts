#!/usr/bin/env tsx
/**
 * Run offline evaluation against golden set
 */
import "dotenv/config";
import OpenAI from "openai";
import { extractionSchema, extractionPrompt } from "@agents/prompts";
import { zodResponseFormat } from "openai/helpers/zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface GoldenExample {
  email: string;
  expected: {
    is_cancellation: boolean;
    reason: string;
    language: string;
  };
}

const goldenSet: GoldenExample[] = [
  {
    email: "Hei, jeg skal flytte til Oslo 15. mars. Kan jeg si opp abonnementet?",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "no"
    }
  },
  {
    email: "Hi, I'm relocating to Bergen next month and need to cancel my subscription.",
    expected: {
      is_cancellation: true,
      reason: "moving",
      language: "en"
    }
  },
  {
    email: "Hvordan fungerer appen?",
    expected: {
      is_cancellation: false,
      reason: "unknown",
      language: "no"
    }
  }
];

async function runEvaluation() {
  console.log(`Running evaluation on ${goldenSet.length} examples...`);
  
  let correct = 0;
  let total = goldenSet.length;

  for (const example of goldenSet) {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        { role: "user", content: extractionPrompt(example.email) }
      ],
      response_format: zodResponseFormat(extractionSchema, "extraction")
    });

    const result = completion.choices[0]?.message?.parsed;
    
    if (result) {
      const match = 
        result.is_cancellation === example.expected.is_cancellation &&
        result.reason === example.expected.reason &&
        result.language === example.expected.language;
      
      if (match) correct++;
      
      console.log(`  ${match ? "✓" : "✗"} Expected: ${JSON.stringify(example.expected)}, Got: ${JSON.stringify({
        is_cancellation: result.is_cancellation,
        reason: result.reason,
        language: result.language
      })}`);
    }
  }

  const accuracy = (correct / total) * 100;
  console.log(`\n✓ Accuracy: ${accuracy.toFixed(1)}% (${correct}/${total})`);
  
  if (accuracy < 90) {
    console.error("✗ Accuracy below threshold (90%)");
    process.exit(1);
  }
}

runEvaluation().catch(err => {
  console.error("✗ Evaluation failed:", err);
  process.exit(1);
});

