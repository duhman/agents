import { pgTable, text, timestamp, uuid, varchar, date, numeric, jsonb, boolean } from "drizzle-orm/pg-core";
export const tickets = pgTable("tickets", {
    id: uuid("id").primaryKey().defaultRandom(),
    source: varchar("source", { length: 32 }).notNull(),
    customerEmail: text("customer_email").notNull(),
    rawEmailMasked: text("raw_email_masked").notNull(),
    reason: varchar("reason", { length: 64 }),
    moveDate: date("move_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const drafts = pgTable("drafts", {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id").references(() => tickets.id),
    language: varchar("language", { length: 5 }).notNull(),
    draftText: text("draft_text").notNull(),
    confidence: numeric("confidence").notNull(),
    model: varchar("model", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const humanReviews = pgTable("human_reviews", {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id").references(() => tickets.id),
    draftId: uuid("draft_id").references(() => drafts.id),
    decision: varchar("decision", { length: 16 }).notNull(),
    finalText: text("final_text").notNull(),
    reviewerSlackId: text("reviewer_slack_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const agentWorkflows = pgTable("agent_workflows", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    nodes: jsonb("nodes").notNull().default('[]'),
    edges: jsonb("edges").notNull().default('[]'),
    configuration: jsonb("configuration").notNull().default('{}'),
    status: varchar("status", { length: 16 }).notNull().default('draft'),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
export const agentExecutions = pgTable("agent_executions", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").references(() => agentWorkflows.id).notNull(),
    triggerType: varchar("trigger_type", { length: 32 }).notNull(),
    triggerData: jsonb("trigger_data").notNull().default('{}'),
    status: varchar("status", { length: 32 }).notNull().default('running'),
    startTime: timestamp("start_time", { withTimezone: true }).defaultNow().notNull(),
    endTime: timestamp("end_time", { withTimezone: true }),
    executionTrace: jsonb("execution_trace").notNull().default('[]'),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const agentTriggers = pgTable("agent_triggers", {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id").references(() => agentWorkflows.id).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    configuration: jsonb("configuration").notNull().default('{}'),
    webhookUrl: text("webhook_url"),
    cronExpression: text("cron_expression"),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
export const agentApprovals = pgTable("agent_approvals", {
    id: uuid("id").primaryKey().defaultRandom(),
    executionId: uuid("execution_id").references(() => agentExecutions.id).notNull(),
    nodeId: text("node_id").notNull(),
    slackMessageTs: text("slack_message_ts"),
    slackChannel: text("slack_channel"),
    status: varchar("status", { length: 16 }).notNull().default('pending'),
    approverSlackId: text("approver_slack_id"),
    decisionData: jsonb("decision_data").notNull().default('{}'),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true })
});
//# sourceMappingURL=schema.js.map