import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/agents";

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });

// For query client - optimized for serverless with connection pooling
// In production (Vercel), use pooled connection with prepare: false
const isServerless = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME;
const queryClient = postgres(connectionString, {
  // Disable prepared statements for serverless/pooled connections
  prepare: isServerless ? false : undefined,
  // Connection pooling configuration
  max: isServerless ? 1 : 10,
  idle_timeout: isServerless ? 20 : undefined,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

