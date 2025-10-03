import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/agents";

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });

// For query client
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

