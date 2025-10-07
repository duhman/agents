// Minimal JS health endpoint to avoid monorepo imports in serverless function
export const config = { runtime: "nodejs", regions: ["iad1"] };

export default async function handler(_req, res) {
  const start = Date.now();
  try {
    const duration = Date.now() - start;
    return res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      version: process.env.VERCEL_GIT_COMMIT_SHA || "local",
      environment: process.env.NODE_ENV || "development"
    });
  } catch (error) {
    const duration = Date.now() - start;
    return res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      duration_ms: duration,
      error: error?.message || String(error)
    });
  }
}
