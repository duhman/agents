#!/usr/bin/env node

import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

// Read the migration file
const migrationPath = join(process.cwd(), "packages/db/migrations/0001_add_slack_retry_queue.sql");
const migrationSQL = readFileSync(migrationPath, "utf8");

// Get DATABASE_URL from environment
const connectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL not found in environment variables");
  process.exit(1);
}

console.log("🔗 Connecting to database...");
const sql = postgres(connectionString);

try {
  console.log("📦 Applying migration: 0001_add_slack_retry_queue.sql");
  await sql.unsafe(migrationSQL);
  console.log("✅ Migration applied successfully!");

  // Verify the table exists
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'slack_retry_queue'
  `;

  if (tables.length > 0) {
    console.log("✅ slack_retry_queue table created successfully!");
  } else {
    console.log("❌ slack_retry_queue table not found after migration");
  }
} catch (error) {
  console.error("❌ Migration failed:", error.message);
  process.exit(1);
} finally {
  await sql.end();
}
