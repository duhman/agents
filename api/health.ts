import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSlackRetryQueueStatus, processSlackRetryQueue } from "../apps/slack-bot/dist/index.js";
import { checkSlackCapabilities } from "../apps/slack-bot/src/slack-utils";

export const config = { runtime: "nodejs", regions: ["iad1"] };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const startTime = Date.now();
    const [slackCapabilities, retryQueueStatus] = await Promise.all([
      checkSlackCapabilities(),
      Promise.resolve(getSlackRetryQueueStatus())
    ]);

    // Process retry queue if there are items
    if (retryQueueStatus.count > 0) {
      try {
        await processSlackRetryQueue();
      } catch (error) {
        console.error("Error processing retry queue:", error);
      }
    }

    const duration = Date.now() - startTime;
    const isHealthy =
      slackCapabilities.hasValidToken &&
      slackCapabilities.hasRequiredScopes;

    const health = {
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      services: {
        slack: {
          status: slackCapabilities.hasValidToken ? "ok" : "error",
          hasValidToken: slackCapabilities.hasValidToken,
          hasRequiredScopes: slackCapabilities.hasRequiredScopes,
          canOpenModals: slackCapabilities.canOpenModals,
          error: slackCapabilities.error
        }
      },
      retryQueue: retryQueueStatus
    };

    const statusCode = isHealthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error: any) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error?.message || String(error)
    });
  }
}
