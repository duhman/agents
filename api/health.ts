import type { VercelRequest, VercelResponse } from "@vercel/node";
// @ts-expect-error - compiled output does not ship type definitions
import { db } from "../packages/db/dist/index.js";
// @ts-expect-error - compiled output does not ship type definitions
import { tickets } from "../packages/db/dist/index.js";

export const config = { runtime: "nodejs", regions: ["iad1"] };

const parseErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

interface ServiceStatus {
  status: "healthy" | "unhealthy";
  latency_ms?: number;
  error?: string;
}

interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  duration_ms: number;
  version: string;
  environment: string;
  services: {
    database: ServiceStatus;
    openai: ServiceStatus;
    slack?: ServiceStatus;
  };
}

async function checkDatabase(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    // Simple query to verify database connectivity
    await db.select().from(tickets).limit(1);
    return {
      status: "healthy",
      latency_ms: Date.now() - start
    };
  } catch (error) {
    return {
      status: "unhealthy",
      latency_ms: Date.now() - start,
      error: parseErrorMessage(error)
    };
  }
}

async function checkOpenAI(): Promise<ServiceStatus> {
  // Check if OpenAI API key is configured
  if (!process.env.OPENAI_API_KEY) {
    return {
      status: "unhealthy",
      error: "OPENAI_API_KEY not configured"
    };
  }

  // Don't make actual API call to avoid quota usage
  return {
    status: "healthy"
  };
}

async function checkSlack(): Promise<ServiceStatus> {
  // Check if Slack is configured (optional service)
  const hasSlackToken = !!process.env.SLACK_BOT_TOKEN;
  const hasSlackSecret = !!process.env.SLACK_SIGNING_SECRET;
  const hasSlackChannel = !!process.env.SLACK_REVIEW_CHANNEL;

  if (!hasSlackToken || !hasSlackSecret || !hasSlackChannel) {
    return {
      status: "unhealthy",
      error: "Slack credentials not fully configured (optional)"
    };
  }

  return {
    status: "healthy"
  };
}

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  const start = Date.now();
  try {
    // Check all services in parallel
    const [database, openai, slack] = await Promise.all([
      checkDatabase(),
      checkOpenAI(),
      checkSlack()
    ]);

    const duration = Date.now() - start;

    const health: HealthResponse = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      version: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      environment: process.env.NODE_ENV || "development",
      services: {
        database,
        openai,
        slack
      }
    };

    // Determine overall health status
    const criticalServices = [database, openai];
    const hasUnhealthyCritical = criticalServices.some(service => service.status === "unhealthy");

    if (hasUnhealthyCritical) {
      health.status = "unhealthy";
      return res.status(503).json(health);
    }

    // Slack is optional, so only mark as degraded if it's unhealthy
    if (slack.status === "unhealthy") {
      health.status = "degraded";
    }

    return res.status(200).json(health);
  } catch (error) {
    const duration = Date.now() - start;
    const message = parseErrorMessage(error);

    return res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      version: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      environment: process.env.NODE_ENV || "development",
      error: message
    });
  }
}
