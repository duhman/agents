# 🚨 QUICK FIX: Create Database Tables

## Problem

Your webhook is failing with: `relation "tickets" does not exist`

## Why

The database connection works, but tables haven't been created yet.

## Fix (Choose One Method)

### Method 1: Neon Console (FASTEST - 2 minutes) ⚡

1. **Open Neon Console:** https://console.neon.tech/
2. **Select your database**
3. **Click "SQL Editor"**
4. **Copy the file:** `packages/db/migrations/apply-to-neon.sql`
5. **Paste into editor**
6. **Click "Run"**
7. **Done!** ✅

### Method 2: Command Line (5 minutes)

```bash
# Get your DATABASE_URL from Vercel or Neon
export DATABASE_URL="postgres://user:password@ep-xxx.neon.tech:5432/database?sslmode=require"

# Run the migration script
./scripts/apply-production-migration.sh
```

### Method 3: Drizzle Kit (Developer Method)

```bash
cd /Users/bigmac/projects/agents
export DATABASE_URL="your-neon-connection-string"
cd packages/db
pnpm drizzle-kit migrate
```

## Verify It Worked

### Test 1: Health Check

```bash
curl https://agents-elaway.vercel.app/api/health
```

Should show: `"database": {"status": "healthy"}`

### Test 2: Trigger HubSpot Webhook

Create a test ticket in HubSpot and check Vercel logs.

Should show: `✅ Created ticket via fallback` and `✅ Created draft via fallback`

### Test 3: Check Database

In Neon SQL Editor:

```sql
SELECT COUNT(*) FROM tickets;
SELECT COUNT(*) FROM drafts;
SELECT COUNT(*) FROM human_reviews;
```

## What Tables Get Created

1. **tickets** - Stores customer emails (masked)
2. **drafts** - Stores AI-generated responses
3. **human_reviews** - Stores human review decisions

## Need Help?

See `URGENT_DATABASE_FIX.md` for detailed troubleshooting.

---

**Recommended:** Use Method 1 (Neon Console) - it's the fastest and most reliable.
