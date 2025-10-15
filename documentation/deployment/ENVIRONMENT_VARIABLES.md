# Environment Variables

This document describes all environment variables used in the Agents project.

## Required Variables

### Database

```bash
DATABASE_URL=postgres://user:password@host:5432/database?pgbouncer=true&connection_limit=1
```

- **Description**: PostgreSQL connection string
- **Format**: Use pooled connection for production (`pgbouncer=true`)
- **Local**: `postgres://postgres:postgres@localhost:5432/agents`

### OpenAI

```bash
OPENAI_API_KEY=sk-...
# Optional: OpenAI Vector Store used for contextual search of HubSpot tickets
OPENAI_VECTOR_STORE_ID=vs_...
```

- **Description**: OpenAI API key for GPT-4o structured outputs
- **Required**: Yes, for email classification and draft generation
- **OPENAI_VECTOR_STORE_ID**: Optional; when set, agents can search the configured vector store for similar HubSpot tickets to enhance drafts

## Optional Variables

### Slack (Required for Production)

```bash
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_REVIEW_CHANNEL=C...
```

- **Description**: Slack bot configuration for HITM workflow
- **Required**: For production deployment
- **Format**: Bot token starts with `xoxb-`

### HubSpot (Optional)

```bash
HUBSPOT_ACCESS_TOKEN=
HUBSPOT_PORTAL_ID=
HUBSPOT_PORTAL_BASE_URL=
```

- **Description**: HubSpot API token for CRM integration
- **Required**: No, only if using HubSpot webhooks
- **Notes**:
  - `HUBSPOT_PORTAL_ID` and `HUBSPOT_PORTAL_BASE_URL` are optional but recommended when webhooks include the HubSpot ticket ID. When present, Slack review messages will render a direct link back to the ticket (e.g. `https://app-eu1.hubspot.com/contacts/<portal>/record/0-5/<id>`).

### SMTP (Optional)

```bash
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Elaway Support <support@elaway.com>"
```

- **Description**: SMTP configuration for outbound emails
- **Required**: No, only if using email sending

### Cron Authentication

```bash
CRON_SECRET=
```

- **Description**: Secret for cron job authentication
- **Required**: No, only if using scheduled tasks

### Environment

```bash
NODE_ENV=development
```

- **Description**: Node.js environment
- **Values**: `development`, `production`

### Hybrid Processing Configuration

```bash
# No specific configuration needed - hybrid processing is always enabled
```

- **Description**: Hybrid deterministic/AI processing is the default and only mode
- **Required**: No, automatically enabled
- **Status**: ✅ Hybrid processing is the primary implementation

### Agent Performance Tuning

```bash
AGENT_TIMEOUT_MS=30000
AGENT_MAX_RETRIES=3
AGENT_TEMPERATURE=0
```

- **Description**: Agent performance and behavior configuration
- **Required**: No, uses sensible defaults
- **Values**: Timeout in milliseconds, retry count, temperature (0-1)

## Local Development Setup

1. Copy this template to `.env`:

```bash
cp documentation/deployment/ENVIRONMENT_VARIABLES.md .env
```

2. Fill in your values:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/agents
OPENAI_API_KEY=sk-your-key-here
NODE_ENV=development
```

3. Start local services:

```bash
cd infra && docker compose up -d
cd packages/db && pnpm drizzle-kit push
```

## Production Deployment

For production deployment on Vercel:

1. Set environment variables in Vercel dashboard
2. Use pooled database connection (`pgbouncer=true`)
3. Configure Slack bot for HITM workflow
4. Set `NODE_ENV=production`

## Security Notes

- Never commit `.env` files to version control
- Use Vercel environment variables for production secrets
- Rotate API keys regularly
- Use least-privilege access for database connections
