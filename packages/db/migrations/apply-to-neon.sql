-- ============================================================================
-- Neon Database Schema Migration
-- ============================================================================
-- This SQL creates all required tables for the Agents project
-- Run this in your Neon console or via psql
--
-- How to use:
-- 1. Go to: https://console.neon.tech/
-- 2. Select your database
-- 3. Open SQL Editor
-- 4. Copy and paste this entire file
-- 5. Click "Run"
--
-- Or via command line:
--   psql "$DATABASE_URL" -f packages/db/migrations/apply-to-neon.sql
-- ============================================================================

BEGIN;

-- Create tickets table
-- Stores masked customer email tickets from HubSpot
CREATE TABLE IF NOT EXISTS "tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "source" varchar(32) NOT NULL,
  "customer_email" text NOT NULL,
  "raw_email_masked" text NOT NULL,
  "reason" varchar(64),
  "move_date" date,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create drafts table  
-- Stores AI-generated draft responses for review
CREATE TABLE IF NOT EXISTS "drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid,
  "language" varchar(5) NOT NULL,
  "draft_text" text NOT NULL,
  "confidence" numeric NOT NULL,
  "model" varchar(64) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Create human_reviews table
-- Stores human review decisions for HITM workflow
CREATE TABLE IF NOT EXISTS "human_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid,
  "draft_id" uuid,
  "decision" varchar(16) NOT NULL,
  "final_text" text NOT NULL,
  "reviewer_slack_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraint for drafts -> tickets
DO $$ BEGIN
  ALTER TABLE "drafts" ADD CONSTRAINT "drafts_ticket_id_tickets_id_fk" 
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") 
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraint for human_reviews -> tickets
DO $$ BEGIN
  ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_ticket_id_tickets_id_fk" 
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") 
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraint for human_reviews -> drafts
DO $$ BEGIN
  ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_draft_id_drafts_id_fk" 
    FOREIGN KEY ("draft_id") REFERENCES "drafts"("id") 
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create slack_retry_queue table
-- Stores failed Slack posts for retry with exponential backoff
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

-- Add foreign key constraint for slack_retry_queue -> tickets
DO $$ BEGIN
  ALTER TABLE "slack_retry_queue" ADD CONSTRAINT "slack_retry_queue_ticket_id_tickets_id_fk" 
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") 
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraint for slack_retry_queue -> drafts
DO $$ BEGIN
  ALTER TABLE "slack_retry_queue" ADD CONSTRAINT "slack_retry_queue_draft_id_drafts_id_fk" 
    FOREIGN KEY ("draft_id") REFERENCES "drafts"("id") 
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add index for efficient retry processing (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS "slack_retry_queue_status_next_retry_idx" 
  ON "slack_retry_queue" ("status", "next_retry_at");

-- Add index for ticket/draft lookups
CREATE INDEX IF NOT EXISTS "slack_retry_queue_ticket_draft_idx" 
  ON "slack_retry_queue" ("ticket_id", "draft_id");

COMMIT;

-- Verify tables were created
SELECT table_name, 
       (SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND information_schema.columns.table_name = information_schema.tables.table_name) as column_count
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected output:
-- table_name    | column_count
-- --------------+-------------
-- drafts        |           7
-- human_reviews |           7
-- tickets       |           7

