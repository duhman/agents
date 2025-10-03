# Deployment Documentation

This directory contains guides for setting up and deploying the project locally and to production.

## 📚 Files

### Local Development
- **[`QUICKSTART.md`](QUICKSTART.md)** - Get running locally in <10 minutes
  - Prerequisites
  - Installation steps
  - Database setup
  - Environment configuration
  - Testing the agent
  - Common issues

### Production Deployment
- **[`DEPLOYMENT.md`](DEPLOYMENT.md)** - Vercel deployment guide
  - Vercel CLI setup
  - Environment variables
  - Database configuration
  - Deployment process
  - Post-deployment setup
  - Slack and HubSpot configuration
  - Monitoring and fine-tuning

## 🚀 Quick Start Paths

### For Local Development

```bash
# 1. Clone and install
pnpm install

# 2. Start local Postgres
cd infra && docker compose up -d

# 3. Configure environment
cp .env.example .env
# Edit .env with your OPENAI_API_KEY

# 4. Push database schema
cd packages/db && pnpm drizzle-kit push

# 5. Test the agent
cd apps/agent && pnpm dev
```

See [`QUICKSTART.md`](QUICKSTART.md) for detailed instructions.

### For Production Deployment

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link project
vercel link

# 3. Configure environment variables
# (via Vercel Dashboard)

# 4. Deploy
vercel --prod
```

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for detailed instructions.

## 🔧 Environment Variables

### Required (Local & Production)
- `DATABASE_URL` - Postgres connection string
- `OPENAI_API_KEY` - OpenAI API key

### Required (Production Only)
- `SLACK_BOT_TOKEN` - Slack bot token (xoxb-...)
- `SLACK_SIGNING_SECRET` - Slack signing secret
- `SLACK_REVIEW_CHANNEL` - Slack channel ID for HITM reviews
- `CRON_SECRET` - Random secret for cron auth

### Optional
- `HUBSPOT_ACCESS_TOKEN` - For HubSpot Conversations replies
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - For SMTP fallback

## 📊 Deployment Checklist

### Local Setup
- [ ] Install Node.js 20+
- [ ] Install pnpm
- [ ] Install Docker/OrbStack
- [ ] Clone repository
- [ ] Run `pnpm install`
- [ ] Start Postgres (`docker compose up -d`)
- [ ] Configure `.env` file
- [ ] Push database schema
- [ ] Test agent (`cd apps/agent && pnpm dev`)

### Production Deployment
- [ ] Create Vercel account/project
- [ ] Install Vercel CLI
- [ ] Link project (`vercel link`)
- [ ] Configure environment variables
- [ ] Set up Vercel Postgres
- [ ] Push database schema
- [ ] Deploy (`vercel --prod`)
- [ ] Configure Slack app webhooks
- [ ] Configure HubSpot webhooks (optional)
- [ ] Test webhook endpoints
- [ ] Monitor logs

## 🔍 Troubleshooting

### Common Local Issues

**Database connection error**
- Verify Postgres is running: `docker ps`
- Check `DATABASE_URL` in `.env`
- Ensure port 5432 is not in use

**OpenAI API error**
- Verify `OPENAI_API_KEY` is set
- Check API key has sufficient credits
- Ensure model `gpt-4o-2024-08-06` is available

**Module not found**
- Run `pnpm install` at project root
- Verify workspace references are correct
- Restart TypeScript server

### Common Production Issues

**Vercel Function timeout**
- Check function execution time (<5s for webhooks)
- Use async jobs for long operations
- Review Vercel logs: `vercel logs --follow`

**Slack webhook timeout**
- Ensure `ack()` is called immediately (<3s)
- Process actions asynchronously
- Check Slack app event subscriptions

**Database connection issues**
- Use Vercel Postgres with pooling
- Check connection string format
- Verify connection limits

## 🔗 Related Documentation

- [Project Documentation](../project/) - PRD, policies, technical plan
- [Cursor Documentation](../cursor/) - IDE setup and configuration
- [Repository Root](../../) - README, package.json, monorepo structure

---

**Last Updated:** January 2025  
**Maintained by:** Development Team

