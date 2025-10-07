# 🚨 URGENT: Database Tables Missing

## Problem Identified

Your Vercel logs show:

```
PostgresError: relation "tickets" does not exist
```

**Root Cause:** The database connection works perfectly, but the **tables haven't been created** in your Neon database yet.

## ✅ What's Working

- Database connection: ✅ Connected to Neon (`ep-dark-voice-a2tfhnpy-pooler.eu-central-1.aws.neon.tech`)
- Webhook receiving requests: ✅ Working
- Agent processing: ✅ Working (until it tries to save to database)
- Migration file exists: ✅ `packages/db/migrations/0000_busy_snowbird.sql`

## ❌ What's Missing

The migration file was never executed against your Neon production database, so the tables don't exist.

---

## 🔧 SOLUTION - Apply Migrations to Neon

### Option 1: Using Drizzle Kit (Recommended)

**Step 1: Get your Neon connection string**

```bash
# From Vercel dashboard or Neon dashboard
# Should look like:
# postgres://user:password@ep-xxx.neon.tech:5432/database?sslmode=require
```

**Step 2: Run migration locally against production**

```bash
cd /Users/bigmac/projects/agents

# Export your Neon connection string temporarily
export DATABASE_URL="postgres://user:password@ep-xxx.neon.tech:5432/database?sslmode=require"

# Navigate to db package
cd packages/db

# Apply the migration
pnpm drizzle-kit migrate

# Verify tables were created
pnpm drizzle-kit studio
```

This will:

1. Connect to your Neon database
2. Run the SQL from `migrations/0000_busy_snowbird.sql`
3. Create all 3 tables: `tickets`, `drafts`, `human_reviews`

### Option 2: Manual SQL Execution (Alternative)

If you prefer to run the SQL manually through Neon's console:

1. **Go to Neon Console:** https://console.neon.tech/
2. **Select your database**
3. **Open SQL Editor**
4. **Copy and paste this SQL:**

```sql
-- Create tickets table
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
CREATE TABLE IF NOT EXISTS "human_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid,
  "draft_id" uuid,
  "decision" varchar(16) NOT NULL,
  "final_text" text NOT NULL,
  "reviewer_slack_id" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
  ALTER TABLE "drafts" ADD CONSTRAINT "drafts_ticket_id_tickets_id_fk"
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_ticket_id_tickets_id_fk"
    FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "human_reviews" ADD CONSTRAINT "human_reviews_draft_id_drafts_id_fk"
    FOREIGN KEY ("draft_id") REFERENCES "drafts"("id")
    ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
```

5. **Click "Run" or "Execute"**
6. **Verify tables exist:**

   ```sql
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

   Should return: `tickets`, `drafts`, `human_reviews`

### Option 3: Quick Verification Script

Create a script to test the migration:

```bash
#!/bin/bash
# test-migration.sh

echo "🔍 Testing Neon database migration..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set. Please export it first:"
  echo "   export DATABASE_URL='postgres://...'"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo "🔗 Connecting to Neon..."

cd /Users/bigmac/projects/agents/packages/db

# Run migration
pnpm drizzle-kit migrate

echo "✅ Migration complete!"
echo "🔍 Verifying tables..."

# You can add a simple query here to verify
echo "Done! Please check Neon console or run: pnpm db:studio"
```

---

## 📋 Verification Steps

After applying the migration, verify it worked:

### 1. Check Neon Console

Go to your Neon dashboard and verify the tables exist.

### 2. Test Health Endpoint

```bash
curl https://agents-elaway.vercel.app/api/health
```

Should return:

```json
{
  "status": "healthy",
  "services": {
    "database": {
      "status": "healthy",
      "latency_ms": 45
    }
  }
}
```

### 3. Test Webhook with HubSpot

Trigger another HubSpot ticket and check the logs. You should see:

```
✅ Created ticket via fallback
✅ Created draft via fallback
✅ Email processing completed successfully
```

### 4. Verify Data in Database

Using Drizzle Studio or Neon SQL Editor:

```sql
SELECT COUNT(*) FROM tickets;
SELECT COUNT(*) FROM drafts;
SELECT COUNT(*) FROM human_reviews;
```

---

## 🔄 Future: Automate Migrations

To prevent this in the future, you have two options:

### Option A: Run Migrations Before Deployment (Recommended)

**Add to your deployment workflow:**

```bash
# Before deploying to Vercel, run:
cd packages/db
pnpm drizzle-kit generate  # Generate migration files
pnpm drizzle-kit migrate   # Apply to production
git add migrations/
git commit -m "chore: apply database migration"
git push
```

### Option B: Add Migration Script to Build (Advanced)

Update `vercel.json`:

```json
{
  "buildCommand": "pnpm install && pnpm db:migrate && pnpm build"
}
```

Add to `package.json`:

```json
{
  "scripts": {
    "db:migrate": "cd packages/db && drizzle-kit migrate"
  }
}
```

**⚠️ Warning:** This requires DATABASE_URL to be available during build time, which may not work with all Vercel configurations.

---

## 🎯 Quick Fix Summary

**Fastest solution:**

1. Go to Neon Console: https://console.neon.tech/
2. Open SQL Editor
3. Copy/paste the SQL from Option 2 above
4. Click "Run"
5. Test webhook again

**Time to fix:** ~2 minutes

---

## 📞 Need Help?

If you encounter any issues:

1. **Check Neon logs** for SQL errors
2. **Verify connection string** has correct permissions
3. **Test locally first** with a test database
4. **Run migrations one table at a time** if you get errors

---

**Status:** Ready to apply migration ✅  
**Impact:** High - Blocks all ticket/draft creation  
**Complexity:** Low - Simple SQL execution  
**Time to fix:** 2-5 minutes
