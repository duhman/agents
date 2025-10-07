import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";
const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/agents";
// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });
// For query client - optimized for serverless with connection pooling
const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;
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
//# sourceMappingURL=client.js.map