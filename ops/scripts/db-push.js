#!/usr/bin/env tsx
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Push schema to database (for dev; use migrations in prod)
 */
const child_process_1 = require("child_process");
console.log("Pushing schema to database...");
(0, child_process_1.execSync)("cd packages/db && pnpm drizzle-kit push", { stdio: "inherit" });
console.log("✓ Schema pushed");
