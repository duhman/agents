# Minimal OpenAI Agent - Quick Start Guide
## Get Your Email Processing Agent Running in 30 Minutes

This guide will help you set up the minimal OpenAI agent system from scratch, following the PRD and implementation guide.

---

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database (local or hosted)
- OpenAI API key
- Optional: Slack workspace for human review

---

## Step 1: Project Setup (5 minutes)

### 1.1 Create Project Directory

```bash
mkdir minimal-openai-agent
cd minimal-openai-agent
```

### 1.2 Initialize Package

```bash
npm init -y
```

### 1.3 Install Dependencies

```bash
npm install openai@^6.2.0 zod@^3.22.0 dotenv@^16.3.0 pg @slack/web-api
npm install -D @types/node@^20.0.0 tsx@^4.7.0 typescript@^5.3.0 @types/pg
```

### 1.4 Create Project Structure

```bash
mkdir -p src sql docs
touch src/index.ts src/schemas.ts src/pii.ts src/openai.ts src/database.ts src/utils.ts src/processor.ts src/slack.ts src/webhook.ts
touch sql/schema.sql vercel.json .env.example README.md
```

---

## Step 2: Environment Configuration (5 minutes)

### 2.1 Create Environment File

```bash
cp .env.example .env
```

### 2.2 Configure Environment Variables

Edit `.env` with your values:

```bash
# Database (required)
DATABASE_URL=postgres://user:password@localhost:5432/minimal_agent

# OpenAI (required)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Slack (optional - for human review)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_SIGNING_SECRET=your-slack-signing-secret
SLACK_REVIEW_CHANNEL=C1234567890

# Environment
NODE_ENV=development
```

### 2.3 Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Copy it to your `.env` file

---

## Step 3: Database Setup (5 minutes)

### 3.1 Create Database

```bash
# Using psql
createdb minimal_agent

# Or using your preferred PostgreSQL client
```

### 3.2 Run Schema

```bash
psql $DATABASE_URL -f sql/schema.sql
```

### 3.3 Verify Tables

```bash
psql $DATABASE_URL -c "\dt"
```

You should see: `tickets`, `drafts`, `human_reviews`

---

## Step 4: Copy Implementation Code (10 minutes)

### 4.1 Copy All Source Files

Copy the complete implementation from the `MINIMAL_AGENT_IMPLEMENTATION_GUIDE.md`:

1. **src/schemas.ts** - Zod schemas
2. **src/pii.ts** - PII masking utilities
3. **src/openai.ts** - OpenAI integration
4. **src/database.ts** - Database operations
5. **src/utils.ts** - Utility functions
6. **src/processor.ts** - Main processing logic
7. **src/slack.ts** - Slack integration
8. **src/webhook.ts** - Webhook handler
9. **src/index.ts** - Main entry point
10. **sql/schema.sql** - Database schema
11. **vercel.json** - Vercel configuration

### 4.2 Update Package.json

```json
{
  "name": "minimal-openai-agent",
  "version": "1.0.0",
  "description": "Minimal OpenAI agent for email processing",
  "main": "src/index.ts",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:setup": "psql $DATABASE_URL -f sql/schema.sql",
    "test": "tsx src/test.ts"
  },
  "dependencies": {
    "openai": "^6.2.0",
    "zod": "^3.22.0",
    "dotenv": "^16.3.0",
    "pg": "^8.11.0",
    "@slack/web-api": "^6.10.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/pg": "^8.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Step 5: Test Locally (5 minutes)

### 5.1 Start Development Server

```bash
npm run dev
```

You should see:
```
Server running on http://localhost:3000
```

### 5.2 Test with Sample Email

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test",
    "customerEmail": "test@example.com",
    "subject": "Oppsigelse av abonnement",
    "body": "Hei, jeg flytter fra adressen min og ønsker å si opp abonnementet mitt. Jeg flytter 15. mars 2024."
  }'
```

### 5.3 Expected Response

```json
{
  "success": true,
  "ticketId": "123e4567-e89b-12d3-a456-426614174000",
  "draftId": "123e4567-e89b-12d3-a456-426614174001",
  "message": "Email processed successfully",
  "processingTime": 2500,
  "extraction": {
    "is_cancellation": true,
    "reason": "moving",
    "move_date": "2024-03-15",
    "language": "no",
    "edge_case": "none",
    "urgency": "future",
    "customer_concerns": [],
    "policy_risks": [],
    "confidence_factors": {
      "clear_intent": true,
      "complete_information": true,
      "standard_case": true
    }
  },
  "confidence": 1.0
}
```

---

## Step 6: Deploy to Vercel (5 minutes)

### 6.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 6.2 Deploy

```bash
vercel
```

Follow the prompts:
- Link to existing project? No
- Project name: minimal-openai-agent
- Directory: ./
- Override settings? No

### 6.3 Set Environment Variables

```bash
vercel env add DATABASE_URL
vercel env add OPENAI_API_KEY
vercel env add SLACK_BOT_TOKEN
vercel env add SLACK_SIGNING_SECRET
vercel env add SLACK_REVIEW_CHANNEL
```

### 6.4 Test Production

```bash
curl -X POST https://your-project.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "source": "test",
    "customerEmail": "test@example.com",
    "subject": "Cancel subscription",
    "body": "Hi, I am moving and would like to cancel my subscription."
  }'
```

---

## Step 7: Optional - Slack Integration

### 7.1 Create Slack App

1. Go to [Slack API](https://api.slack.com/apps)
2. Create new app
3. Add OAuth scopes: `chat:write`, `channels:read`
4. Install to workspace
5. Copy bot token to `.env`

### 7.2 Test Slack Integration

Send a test email and check your Slack channel for the review message.

---

## Troubleshooting

### Common Issues

**1. Database Connection Error**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgres://user:password@host:port/database
```

**2. OpenAI API Error**
```bash
# Check API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

**3. TypeScript Errors**
```bash
# Install missing types
npm install -D @types/pg
```

**4. Vercel Deployment Issues**
```bash
# Check build logs
vercel logs
```

### Debug Mode

Add to your `.env`:
```bash
DEBUG=true
NODE_ENV=development
```

This will show detailed logs in the console.

---

## Next Steps

### 1. Customize Prompts

Edit the system prompts in `src/openai.ts` to match your business needs.

### 2. Add More Languages

Extend the language detection and response generation for additional languages.

### 3. Implement Vector Store

Add RAG context using your existing OpenAI vector store:

```typescript
// In src/openai.ts
if (process.env.OPENAI_VECTOR_STORE_ID) {
  // Add vector store context to prompts
}
```

### 4. Add Monitoring

Implement logging and metrics collection for production monitoring.

### 5. Scale Up

Consider adding:
- Batch processing
- Advanced error handling
- Performance monitoring
- Multi-agent orchestration

---

## Learning Resources

### OpenAI Documentation
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Function Calling](https://platform.openai.com/docs/guides/function-calling)

### Best Practices
- Always mask PII before LLM calls
- Use structured outputs with Zod schemas
- Implement retry logic for API calls
- Validate all inputs and outputs
- Log everything for debugging

### Security
- Never commit API keys
- Use environment variables
- Implement proper error handling
- Validate webhook signatures

---

## Support

If you encounter issues:

1. Check the logs in your terminal
2. Verify all environment variables are set
3. Test each component individually
4. Review the implementation guide for details

This minimal system demonstrates the core patterns of OpenAI agent development while maintaining production-ready quality and security standards.
