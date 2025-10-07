import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs", regions: ["iad1"] };

const parseErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const start = Date.now();
  try {
    const duration = Date.now() - start;
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      version: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    const duration = Date.now() - start;
    const message = parseErrorMessage(error);
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      error: message
    });
  }
}
