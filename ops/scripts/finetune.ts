#!/usr/bin/env tsx
/**
 * Fine-tune OpenAI model with exported training data
 */
import "dotenv/config";
import OpenAI from "openai";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function fineTuneModel() {
  const trainingFilePath = join(process.cwd(), "ops", "training-data.jsonl");
  
  console.log("Uploading training file...");
  const file = await openai.files.create({
    file: readFileSync(trainingFilePath),
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
    const configPath = join(process.cwd(), "config", "models.json");
    const config = {
      fine_tuned_model: final.fine_tuned_model,
      job_id: job.id,
      created_at: new Date().toISOString()
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log(`✓ Saved model config to ${configPath}`);
  } else {
    console.error(`✗ Fine-tuning ${status}`);
    process.exit(1);
  }
}

fineTuneModel().catch(err => {
  console.error("✗ Fine-tuning failed:", err);
  process.exit(1);
});

