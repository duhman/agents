import postgres from "postgres";
import * as schema from "./schema.js";
export declare const migrationClient: postgres.Sql<{}>;
declare global {
    var __agentsDbQueryClient: ReturnType<typeof postgres> | undefined;
}
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
//# sourceMappingURL=client.d.ts.map