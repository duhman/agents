#!/bin/bash
# Apply database migrations to production Neon database
# Usage: ./scripts/apply-production-migration.sh

set -e  # Exit on error

echo "🚀 Applying database migrations to Neon..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  echo ""
  echo "Please set your Neon connection string:"
  echo "  export DATABASE_URL='postgres://user:password@ep-xxx.neon.tech:5432/database?sslmode=require'"
  echo ""
  echo "You can find this in:"
  echo "  - Neon Console: https://console.neon.tech/"
  echo "  - Vercel Dashboard: https://vercel.com/elaway/agents/settings/environment-variables"
  echo ""
  exit 1
fi

echo "✅ DATABASE_URL is configured"
echo ""

# Extract host from connection string for display
HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
echo "🔗 Target database: $HOST"
echo ""

# Confirm before proceeding
read -p "⚠️  This will apply migrations to PRODUCTION. Continue? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Migration cancelled"
  exit 1
fi

echo ""
echo "📦 Navigating to database package..."
cd "$(dirname "$0")/../packages/db" || exit 1

echo "🔄 Running migrations..."
pnpm drizzle-kit migrate

echo ""
echo "✅ Migrations applied successfully!"
echo ""
echo "🔍 Verifying tables..."
echo ""

# Try to verify tables exist (requires psql)
if command -v psql &> /dev/null; then
  echo "Running verification query..."
  psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" || true
  echo ""
fi

echo "✨ All done!"
echo ""
echo "Next steps:"
echo "  1. Test health endpoint: curl https://agents-elaway.vercel.app/api/health"
echo "  2. Trigger a test webhook from HubSpot"
echo "  3. Check Vercel logs for successful ticket/draft creation"
echo ""
echo "To open Drizzle Studio for inspection:"
echo "  cd packages/db && pnpm db:studio"
echo ""

