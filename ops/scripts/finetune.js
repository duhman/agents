#!/usr/bin/env tsx
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Fine-tune OpenAI model with exported training data
 */
require("dotenv/config");
const openai_1 = __importDefault(require("openai"));
const fs_1 = require("fs");
const path_1 = require("path");
const openai = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
async function fineTuneModel() {
    const trainingFilePath = (0, path_1.join)(process.cwd(), "ops", "training-data.jsonl");
    console.log("Uploading training file...");
    const file = await openai.files.create({
        file: (0, fs_1.createReadStream)(trainingFilePath),
        purpose: "fine-tune"
    });
    console.log(`✓ Uploaded file: ${file.id}`);
    console.log("Creating fine-tuning job...");
    const job = await openai.fineTuning.jobs.create({
        training_file: file.id,
        model: "gpt-4o-mini-2024-07-18",
        hyperparameters: {
            n_epochs: 3
        }
    });
    console.log(`✓ Fine-tuning job created: ${job.id}`);
    console.log("Monitoring job status...");
    let status = job.status;
    while (status !== "succeeded" && status !== "failed" && status !== "cancelled") {
        await new Promise(resolve => setTimeout(resolve, 30000)); // Poll every 30s
        const updated = await openai.fineTuning.jobs.retrieve(job.id);
        status = updated.status;
        console.log(`  Status: ${status}`);
        if (updated.trained_tokens) {
            console.log(`  Trained tokens: ${updated.trained_tokens}`);
        }
    }
    if (status === "succeeded") {
        const final = await openai.fineTuning.jobs.retrieve(job.id);
        console.log(`✓ Fine-tuning succeeded! Model: ${final.fine_tuned_model}`);
        // Save model ID to config
        const configPath = (0, path_1.join)(process.cwd(), "config", "models.json");
        const config = {
            fine_tuned_model: final.fine_tuned_model,
            job_id: job.id,
            created_at: new Date().toISOString()
        };
        (0, fs_1.writeFileSync)(configPath, JSON.stringify(config, null, 2));
        console.log(`✓ Saved model config to ${configPath}`);
    }
    else {
        console.error(`✗ Fine-tuning ${status}`);
        process.exit(1);
    }
}
fineTuneModel().catch(err => {
    console.error("✗ Fine-tuning failed:", err);
    process.exit(1);
});
