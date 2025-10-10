import type { VercelRequest, VercelResponse } from "@vercel/node";

export const config = { runtime: "nodejs", regions: ["iad1"] };

function writeSSE(res: VercelResponse, event: string, data: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  writeSSE(res, "heartbeat", { ts: Date.now() });

  const interval = setInterval(() => writeSSE(res, "heartbeat", { ts: Date.now() }), 15000);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
}
