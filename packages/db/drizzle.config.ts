import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./migrations",
  driver: "pg",
  dbCredentials: {
    connectionString:
      process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/agents"
  }
});
