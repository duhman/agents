/**
 * Vercel Function: Health check endpoint
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "@agents/db";
import OpenAI from "openai";
import { envSchema } from "@agents/core";

const env = envSchema.parse(process.env);
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

async function checkDatabase(): Promise<{ status: string; details?: string }> {
  try {
    await db.execute("SELECT 1");
    return { status: "healthy" };
  } catch (error: any) {
    return { status: "unhealthy", details: error.message };
  }
}

async function checkOpenAI(): Promise<{ status: string; details?: string }> {
  try {
    await openai.models.list();
    return { status: "healthy" };
  } catch (error: any) {
    return { status: "unhealthy", details: error.message };
  }
}

async function checkSlack(): Promise<{ status: string; details?: string }> {
  try {
    if (!env.SLACK_BOT_TOKEN) {
      return { status: "not_configured", details: "SLACK_BOT_TOKEN not set" };
    }
    // Simple validation - check if token format is correct
    if (!env.SLACK_BOT_TOKEN.startsWith("xoxb-")) {
      return { status: "unhealthy", details: "Invalid Slack bot token format" };
    }
    return { status: "healthy" };
  } catch (error: any) {
    return { status: "unhealthy", details: error.message };
  }
}

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
      services: {
        database,
        openai,
        slack
      },
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
    const duration = Date.now() - startTime;

    return res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      error: error.message
    });
  }
}
