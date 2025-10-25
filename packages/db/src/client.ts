import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const logStructured = (
  level: "info" | "warn" | "error",
  message: string,
  data?: Record<string, any>
) => {
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
  logStructured("info", "Database connection string resolved", {
    requestId: "db-init",
    host,
    isServerless
  });
} catch (error) {
  logStructured("warn", "Invalid database connection string", {
    requestId: "db-init",
    isServerless
  });
  throw error;
}

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 });

declare global {
  // eslint-disable-next-line no-var
  var __agentsDbQueryClient: ReturnType<typeof postgres> | undefined;
}

const createQueryClient = (context: "init" | "reset") => {
  const connectTimeoutSeconds = 10;
  const client = postgres(connectionString, {
    prepare: isServerless ? false : undefined,
    max: isServerless ? 1 : 10,
    idle_timeout: isServerless ? 20 : undefined,
    connect_timeout: connectTimeoutSeconds,
    transform: {
      undefined: null
    }
  });

  logStructured("info", "Postgres query client initialised", {
    requestId: "db-init",
    isServerless,
    connectTimeoutSeconds,
    context
  });

  return client;
};

if (!globalThis.__agentsDbQueryClient) {
  globalThis.__agentsDbQueryClient = createQueryClient("init");
}

let queryClient = globalThis.__agentsDbQueryClient!;
let drizzleClient = drizzle(queryClient, { schema });

export let db = drizzleClient;

let resetPromise: Promise<void> | null = null;

export async function resetDbClient(reason: string = "unspecified"): Promise<void> {
  if (resetPromise) {
    await resetPromise;
    return;
  }

  resetPromise = (async () => {
    const existing = globalThis.__agentsDbQueryClient;
    if (existing) {
      try {
        logStructured("warn", "Postgres query client reset requested", {
          requestId: "db-reset",
          reason
        });
        await existing.end({ timeout: 5 });
      } catch (error: any) {
        logStructured("error", "Postgres query client reset failed", {
          requestId: "db-reset",
          reason,
          error: error?.message || String(error)
        });
      }
    }

    const newClient = createQueryClient("reset");
    globalThis.__agentsDbQueryClient = newClient;
    queryClient = newClient;
    drizzleClient = drizzle(queryClient, { schema });
    db = drizzleClient;

    logStructured("info", "Postgres query client reset completed", {
      requestId: "db-reset",
      reason
    });
  })();

  try {
    await resetPromise;
  } finally {
    resetPromise = null;
  }
}
