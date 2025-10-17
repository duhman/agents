#!/usr/bin/env tsx
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Run offline evaluation against golden set
 */
require("dotenv/config");
const openai_1 = __importDefault(require("openai"));
const prompts_1 = require("@agents/prompts");
const zod_1 = require("openai/helpers/zod");
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
const goldenSet = [
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
        const completion = await openai.chat.completions.parse({
            model: "gpt-4o-2024-08-06",
            messages: [{ role: "user", content: (0, prompts_1.extractionPrompt)(example.email) }],
            response_format: (0, zod_1.zodResponseFormat)(prompts_1.extractionSchema, "extraction")
        });
        const result = completion.choices[0]?.message?.parsed;
        if (result) {
            const match = result.is_cancellation === example.expected.is_cancellation &&
                result.reason === example.expected.reason &&
                result.language === example.expected.language;
            if (match)
                correct++;
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
