# 🚀 Vercel + Neon Marketplace Integration - Migration Guide

**Status:** Neon is attached via Vercel Marketplace ✅  
**Issue:** Tables need to be created in the Neon database

---

## ✅ What Vercel Has Already Done

When you attached Neon via Vercel Marketplace:

- ✅ Neon database provisioned automatically
- ✅ DATABASE_URL environment variable injected into Vercel
- ✅ Connection credentials configured
- ✅ SSL/security settings applied

**What's Missing:** The database tables (tickets, drafts, human_reviews)

---

## 🎯 Three Ways to Apply Migration

### Option 1: Via Neon Console (Recommended - 2 minutes) ⚡

Since Neon is connected to your Vercel account:

1. **Access Neon Console**
   - Go to: https://console.neon.tech/
   - Login (should auto-detect from Vercel connection)
   - You should see your database: `ep-dark-voice-a2tfhnpy-pooler.eu-central-1.aws.neon.tech`

2. **Open SQL Editor**
   - Click on your database
   - Navigate to "SQL Editor" or "Query" tab

3. **Run Migration**
   - Copy entire contents of: `/Users/bigmac/projects/agents/packages/db/migrations/apply-to-neon.sql`
   - Paste into SQL editor
   - Click "Run" or press Cmd+Enter

4. **Verify Success**
   You'll see:
   ```
   table_name    | column_count
   --------------+-------------
   drafts        |           7
   human_reviews |           7
   tickets       |           7
   ```

**Done!** Tables are now created.

---

### Option 2: Via Vercel CLI with Local Migration (5 minutes)

Pull the DATABASE_URL from Vercel and run migration locally:

```bash
# 1. Navigate to project
cd /Users/bigmac/projects/agents

# 2. Install Vercel CLI (if not already)
# pnpm add -g vercel

# 3. Link to your project
vercel link

# 4. Pull environment variables
vercel env pull .env.local

# 5. The .env.local file now has DATABASE_URL
# Verify it's there:
cat .env.local | grep DATABASE_URL

# 6. Export it temporarily
export $(cat .env.local | grep DATABASE_URL)

# 7. Run migration
cd packages/db
pnpm drizzle-kit migrate

# 8. Verify tables exist
pnpm db:studio
```

---

### Option 3: Add Migration to Build Process (Automated)

Add automatic migrations to your Vercel build:

**Step 1: Create migration script**

Create `scripts/migrate-production.sh`:

```bash
#!/bin/bash
set -e

echo "🔄 Running database migrations..."

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set, skipping migrations"
  exit 0
fi

cd packages/db
pnpm drizzle-kit migrate

echo "✅ Migrations complete"
```

**Step 2: Make it executable**

```bash
chmod +x scripts/migrate-production.sh
```

**Step 3: Update vercel.json**

```json
{
  "buildCommand": "pnpm install && ./scripts/migrate-production.sh && pnpm build",
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

**Step 4: Commit and push**

```bash
git add scripts/migrate-production.sh vercel.json
git commit -m "feat: add automatic database migrations to build"
git push
```

Vercel will run migrations on every deployment! ✨

---

## 🔍 Get Your Neon Database URL

If you need to see your DATABASE_URL:

### Method A: Vercel Dashboard

1. Go to: https://vercel.com/elaway/agents/settings/environment-variables
2. Find `DATABASE_URL` or `POSTGRES_URL`
3. Click "Show" to reveal the value
4. Copy the connection string

### Method B: Vercel CLI

```bash
cd /Users/bigmac/projects/agents
vercel env pull .env.local
cat .env.local | grep DATABASE_URL
```

### Method C: Neon Dashboard

1. Go to: https://console.neon.tech/
2. Select your database
3. Click "Connection Details"
4. Copy the connection string

---

## 📊 Verify Migration Worked

### Test 1: Health Endpoint

```bash
curl https://agents-elaway.vercel.app/api/health
```

**Should return:**

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

### Test 2: Check Tables in Neon

In Neon SQL Editor:

```sql
-- List tables
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Should return: tickets, drafts, human_reviews
```

### Test 3: Test HubSpot Webhook

Trigger a test ticket from HubSpot.

**Vercel logs should show:**

```
✅ Created ticket via fallback
✅ Created draft via fallback
✅ Email processing completed successfully
```

---

## 🎯 Recommended Approach

**For immediate fix:**
→ Use **Option 1** (Neon Console) - Fastest, no setup needed

**For long-term automation:**
→ Use **Option 3** (Build Process) - Migrations run automatically on deploy

**For local development:**
→ Use **Option 2** (Vercel CLI) - Pull env vars and run locally

---

## 🔐 Security Note

The DATABASE_URL from Vercel Marketplace includes:

- ✅ SSL enabled (`sslmode=require`)
- ✅ Connection pooling optimized for serverless
- ✅ Credentials managed by Vercel/Neon
- ✅ Automatic rotation support

You don't need to manage credentials manually!

---

## 🐛 Troubleshooting

### "Permission denied" when running migrations

**Solution:** Make sure you're using the pooled connection URL with proper SSL settings.

### "Connection refused"

**Solution:** Check that Neon database is not paused (free tier auto-pauses after inactivity).

### "Already exists" errors

**Solution:** This is fine! The migration uses `IF NOT EXISTS` and handles duplicates gracefully.

---

## 🎉 What Happens After Migration

1. **Webhooks start working** - HubSpot tickets will be processed
2. **Data gets stored** - Tickets and drafts saved to Neon
3. **Slack HITM activates** - Review messages posted to Slack
4. **Training data accumulates** - Ready for fine-tuning when you have 500+ examples

---

## 📞 Next Steps

1. **Choose your migration method** (Option 1 recommended)
2. **Run the migration** (2 minutes)
3. **Verify it worked** (test health endpoint)
4. **Test with HubSpot ticket**
5. **Monitor Vercel logs** for successful processing

---

**Current Status:** Ready to migrate ✅  
**Recommended:** Option 1 (Neon Console)  
**Time Required:** 2 minutes  
**Risk Level:** Zero (uses IF NOT EXISTS, wrapped in transaction)
