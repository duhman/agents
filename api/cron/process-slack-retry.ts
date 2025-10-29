import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  processSlackRetryQueue,
  getSlackRetryQueueStatus
} from "../../apps/slack-bot/src/index.js";

export const config = { runtime: "nodejs", regions: ["iad1"] };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  // Verify this is a cron job request (Vercel cron jobs send Authorization header)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const startTime = Date.now();
    const initialQueueStatus = await getSlackRetryQueueStatus();

    console.log(
      JSON.stringify({
        level: "info",
        message: "Starting Slack retry queue processing",
        timestamp: new Date().toISOString(),
        queueStats: initialQueueStatus
      })
    );

    await processSlackRetryQueue();

    const finalQueueStatus = await getSlackRetryQueueStatus();
    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        level: "info",
        message: "Completed Slack retry queue processing",
        timestamp: new Date().toISOString(),
        initialStats: initialQueueStatus,
        finalStats: finalQueueStatus,
        duration
      })
    );

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      initialStats: initialQueueStatus,
      finalStats: finalQueueStatus,
      duration
    });
  } catch (error: any) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Slack retry queue processing failed",
        timestamp: new Date().toISOString(),
        error: error?.message || String(error)
      })
    );

    res.status(500).json({
      success: false,
      timestamp: new Date().toISOString(),
      error: error?.message || String(error)
    });
  }
}
