/**
 * Metrics API Endpoint
 * 
 * Returns current agent performance metrics
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
// @ts-expect-error - compiled output
import { metricsCollector } from "../apps/agent/dist/metrics.js";

export const config = { runtime: "nodejs", regions: ["iad1"] };

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const metrics = metricsCollector.getMetrics();
    
    res.status(200).json({
      metrics,
      timestamp: new Date().toISOString(),
      version: "hybrid-enhanced-v1"
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to fetch metrics",
      timestamp: new Date().toISOString()
    });
  }
}

