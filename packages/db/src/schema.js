import { pgTable, text, timestamp, uuid, varchar, date, numeric } from "drizzle-orm/pg-core";
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
