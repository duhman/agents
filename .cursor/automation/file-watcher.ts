#!/usr/bin/env tsx
/**
 * File Watcher for Development Mode
 * 
 * Monitors key files and automatically triggers rule updates
 * when changes are detected during development.
 */

import { watch } from "chokidar";
import { CursorRulesAutomation } from "./rules-updater";
import { debounce } from "lodash";

const WATCH_PATTERNS = [
  "packages/db/src/schema.ts",
  "packages/prompts/src/templates.ts",
  "packages/agents-runtime/src/*.ts",
  "package.json",
  "packages/*/package.json",
  "documentation/project/plan.md",
  ".cursor/hooks.json",
  ".cursor/modes.json"
];

const DEBOUNCE_MS = 2000; // Wait 2s after last change

console.log("👀 Starting Cursor Rules File Watcher...");
console.log("Monitoring:", WATCH_PATTERNS.join(", "));

const automation = new CursorRulesAutomation();

const runAutomation = debounce(async (path: string) => {
  console.log(`\n🔄 Change detected: ${path}`);
  console.log("Running automation...\n");
  
  try {
    await automation.run();
    console.log("✅ Automation complete. Watching for changes...\n");
  } catch (error) {
    console.error("❌ Automation error:", error);
  }
}, DEBOUNCE_MS);

const watcher = watch(WATCH_PATTERNS, {
  ignored: /(^|[\/\\])\../, // ignore dotfiles
  persistent: true,
  ignoreInitial: true
});

watcher
  .on("change", (path) => runAutomation(path))
  .on("add", (path) => runAutomation(path))
  .on("error", (error) => console.error("Watcher error:", error));

console.log("✅ File watcher started. Press Ctrl+C to stop.\n");

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Stopping file watcher...");
  watcher.close();
  process.exit(0);
});

