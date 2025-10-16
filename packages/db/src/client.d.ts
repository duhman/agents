import postgres from "postgres";
import * as schema from "./schema.js";
export declare const migrationClient: postgres.Sql<{}>;
declare global {
    var __agentsDbQueryClient: ReturnType<typeof postgres> | undefined;
}
export declare let db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
export declare function resetDbClient(reason?: string): Promise<void>;
