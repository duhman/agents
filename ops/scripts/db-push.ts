#!/usr/bin/env tsx
/**
 * Push schema to database (for dev; use migrations in prod)
 */
import { execSync } from "child_process";

console.log("Pushing schema to database...");
execSync("cd packages/db && pnpm drizzle-kit push", { stdio: "inherit" });
console.log("✓ Schema pushed");

