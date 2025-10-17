-- Migration: Add slack_retry_queue table for persistent Slack retry handling
-- Created: 2025-01-17

CREATE TABLE IF NOT EXISTS "slack_retry_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"draft_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"original_email" text NOT NULL,
	"original_email_subject" text,
	"original_email_body" text,
	"draft_text" text NOT NULL,
	"confidence" numeric NOT NULL,
	"extraction" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hubspot_ticket_url" text,
	"retry_count" numeric DEFAULT '0' NOT NULL,
	"next_retry_at" timestamp with time zone NOT NULL,
	"last_error" text,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slack_retry_queue" ADD CONSTRAINT "slack_retry_queue_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "slack_retry_queue" ADD CONSTRAINT "slack_retry_queue_draft_id_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "drafts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- Add index for efficient retry processing
CREATE INDEX IF NOT EXISTS "slack_retry_queue_status_next_retry_idx" ON "slack_retry_queue" ("status", "next_retry_at");
--> statement-breakpoint
-- Add index for ticket/draft lookups
CREATE INDEX IF NOT EXISTS "slack_retry_queue_ticket_draft_idx" ON "slack_retry_queue" ("ticket_id", "draft_id");
