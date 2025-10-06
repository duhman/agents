# Vercel Development Guide

This guide covers Vercel-specific development patterns and best practices for the Agents project.

## Quick Start

### Local Development

```bash
# Install dependencies
pnpm install

# Start local development server
pnpm dev

# Test functions locally with Vercel CLI
vercel dev
```

### Deploy to Vercel

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## Function Development

### Runtime Configuration

Every Vercel function should include runtime configuration:

```typescript
// Configure Vercel function runtime
export const config = {
  runtime: "nodejs",
  regions: ["iad1"] // Specify region closest to your database
};
```

### Function Timeouts

Configure appropriate timeouts in `vercel.json`:

```json
{
  "functions": {
    "api/*.ts": {
      "maxDuration": 30
    },
    "api/cron/*.ts": {
      "maxDuration": 300
    }
  }
}
```

## Database Connections

### Connection Pooling

Use optimized connection pooling for serverless environments:

```typescript
import postgres from "postgres";

const isServerless = process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME;

const queryClient = postgres(connectionString, {
  prepare: isServerless ? false : undefined,
  max: isServerless ? 1 : 10,
  idle_timeout: isServerless ? 20 : undefined,
  connect_timeout: 10,
  transform: {
    undefined: null // Transform undefined to null for PostgreSQL
  }
});
```

### Connection String Format

For Vercel Postgres, use pooled connection string:

```
postgres://user:pass@host/db?pgbouncer=true&connection_limit=1
```

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgres://user:pass@host/db?pgbouncer=true&connection_limit=1

# OpenAI
OPENAI_API_KEY=sk-...

# Slack (for production)
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_REVIEW_CHANNEL=C...

# Cron authentication
CRON_SECRET=...
```

### Validation

Always validate environment variables with Zod:

```typescript
import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(1),
  SLACK_BOT_TOKEN: z.string().min(1).optional(),
  SLACK_SIGNING_SECRET: z.string().min(1).optional()
});

const env = envSchema.parse(process.env);
```

## Error Handling

### Structured Logging

Use structured logging with request IDs:

```typescript
import { generateRequestId, logInfo, logError, type LogContext } from "@agents/core";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = generateRequestId();
  const logContext: LogContext = { requestId };
  const startTime = Date.now();

  try {
    logInfo("Request received", logContext, {
      method: req.method,
      url: req.url
    });

    // Process request...

    const duration = Date.now() - startTime;
    logInfo("Request completed", { ...logContext, duration });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    logError("Request failed", { ...logContext, duration }, error);

    return res.status(500).json({ error: error.message });
  }
}
```

### HTTP Status Codes

Return appropriate status codes based on error type:

```typescript
const statusCode = error.message?.includes("quota")
  ? 402
  : error.message?.includes("rate limit")
    ? 429
    : error.message?.includes("timeout")
      ? 504
      : 500;

return res.status(statusCode).json({
  error: error.message || "Internal server error",
  request_id: requestId
});
```

## Performance Optimization

### Fire-and-Forget Operations

Use fire-and-forget for non-critical operations:

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Process critical path first
  const result = await processEmail(data);

  // Fire-and-forget non-critical operations
  postToSlack(result).catch(error => {
    logError("Slack posting failed", logContext, error);
    // Don't fail the webhook if Slack fails
  });

  // Return immediately
  return res.status(200).json({ success: true });
}
```

### Retry Logic

Implement retry logic with exponential backoff:

```typescript
import { withRetry } from "@agents/core";

const result = await withRetry(
  async () => {
    return await openai.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        /* ... */
      ],
      response_format: zodResponseFormat(extractionSchema, "extraction"),
      temperature: 0,
      timeout: 30000
    });
  },
  3, // maxRetries
  1000 // baseDelay
);
```

## Health Checks

### Comprehensive Health Endpoint

Implement health checks for all services:

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  try {
    const [database, openai, slack] = await Promise.all([
      checkDatabase(),
      checkOpenAI(),
      checkSlack()
    ]);

    const duration = Date.now() - startTime;

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      services: { database, openai, slack },
      version: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      environment: process.env.NODE_ENV || "development"
    };

    // Check if any service is unhealthy
    const unhealthyServices = Object.values(health.services).filter(
      service => service.status === "unhealthy"
    );

    if (unhealthyServices.length > 0) {
      health.status = "degraded";
      return res.status(503).json(health);
    }

    return res.status(200).json(health);
  } catch (error: any) {
    return res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}
```

## Cron Jobs

### Authentication

Protect cron endpoints with authentication:

```typescript
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Process cron job...
}
```

### Schedule Configuration

Define cron schedules in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/export-training-data",
      "schedule": "0 0 1 * *" // Monthly on 1st at midnight
    }
  ]
}
```

## Monitoring & Debugging

### Vercel Analytics

Enable Vercel Analytics for performance monitoring:

1. Go to Vercel Dashboard
2. Navigate to Analytics tab
3. Enable Web Analytics and Speed Insights

### Function Logs

View function logs in Vercel Dashboard:

1. Go to Functions tab
2. Click on specific function
3. View logs and metrics

### Local Debugging

Use Vercel CLI for local debugging:

```bash
# Install Vercel CLI
npm i -g vercel

# Run functions locally
vercel dev

# View logs
vercel logs
```

## Deployment

### Preview Deployments

Every pull request automatically creates a preview deployment:

1. Push to feature branch
2. Create pull request
3. Vercel automatically deploys preview
4. Test on preview URL

### Production Deployment

Deploy to production:

```bash
# Deploy to production
vercel --prod

# Or merge to main branch (if auto-deploy is enabled)
git push origin main
```

### Environment Variables

Set environment variables in Vercel Dashboard:

1. Go to Project Settings
2. Navigate to Environment Variables
3. Add variables for each environment (Development, Preview, Production)

## Best Practices

### Do's

- ✅ Use structured logging with request IDs
- ✅ Implement proper error handling with appropriate HTTP status codes
- ✅ Use connection pooling for database connections
- ✅ Set appropriate function timeouts
- ✅ Validate environment variables
- ✅ Use fire-and-forget for non-critical operations
- ✅ Implement health checks
- ✅ Protect cron endpoints with authentication

### Don'ts

- ❌ Don't create database connections outside request handlers
- ❌ Don't block on long-running operations
- ❌ Don't hardcode secrets
- ❌ Don't ignore error handling
- ❌ Don't forget to set function timeouts
- ❌ Don't skip environment variable validation

## Troubleshooting

### Common Issues

#### Function Timeouts

- Check `maxDuration` in `vercel.json`
- Optimize function performance
- Use fire-and-forget for non-critical operations

#### Database Connection Issues

- Ensure connection string includes pooling parameters
- Use optimized connection pooling for serverless environments
- Check connection limits

#### Environment Variable Issues

- Validate environment variables with Zod
- Check Vercel Dashboard for correct values
- Ensure variables are set for correct environment

#### Build Failures

**pnpm install errors:**

- Ensure `pnpm-lock.yaml` is up to date: `pnpm install`
- Check Node.js version compatibility in `package.json` engines
- Verify pnpm workspace configuration in `pnpm-workspace.yaml`

**Lockfile out of sync:**

```bash
# Update lockfile after dependency changes
pnpm install

# Verify lockfile is current
pnpm install --frozen-lockfile
```

**API route patterns:**

- Ensure functions are in `api/` directory at project root
- Use glob patterns in `vercel.json`: `"api/*.ts"`
- Verify function files exist and have correct exports

**Output directory issues:**

- Vercel expects a `public/` directory for static files
- Create `public/index.html` for API documentation
- Set `"outputDirectory": "public"` in `vercel.json`

### Debugging Steps

1. Check Vercel function logs
2. Verify environment variables
3. Test locally with `vercel dev`
4. Check database connection
5. Review function timeout settings

## References

- [Vercel Functions Documentation](https://vercel.com/docs/functions)
- [Vercel Connection Pooling Guide](https://vercel.com/guides/connection-pooling-with-functions)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel Analytics](https://vercel.com/docs/analytics)
