import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const logStructured = (level: "info" | "warn" | "error", message: string, data?: Record<string, any>) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...data
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
  } else if (level === "warn") {
    console.warn(JSON.stringify(payload));
  } else {
    console.log(JSON.stringify(payload));
  }
};

const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  (!isServerless ? "postgres://postgres:postgres@localhost:5432/agents" : undefined);

if (!connectionString) {
  throw new Error(
    "Missing database connection string. Set DATABASE_URL (or POSTGRES_URL*) in the environment."
  );
}

try {
  const { host } = new URL(connectionString);
  logStructured("info", "Database connection string resolved", { requestId: "db-init", host, isServerless });
} catch (error) {
  logStructured("warn", "Invalid database connection string", { requestId: "db-init", isServerless });
  throw error;
}

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });

// For query client - optimized for serverless with connection pooling

// Create connection pool optimized for Vercel serverless functions
const queryClient = postgres(connectionString, {
  // Disable prepared statements for serverless/pooled connections
  prepare: isServerless ? false : undefined,
  // Connection pooling configuration for Vercel
  max: isServerless ? 1 : 10,
  idle_timeout: isServerless ? 20 : undefined,
  connect_timeout: 10,
  // Additional Vercel optimizations
  transform: {
    undefined: null // Transform undefined to null for PostgreSQL
  }
});

export const db = drizzle(queryClient, { schema });
