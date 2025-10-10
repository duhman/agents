import type { NextApiRequest, NextApiResponse } from "next";
import { subscribe, writeSSE } from "../../../../../server/operator/events.js";

export const config = {
  api: {
    bodyParser: false
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { requestId } = req.query as { requestId: string };

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  res.flushHeaders?.();

  writeSSE(res, "heartbeat", { ts: Date.now() });

  const unsubscribe = subscribe(requestId, (evt) => {
    writeSSE(res, "artifact", { type: evt.type, data: evt.data, ts: evt.ts });
  });

  const interval = setInterval(() => writeSSE(res, "heartbeat", { ts: Date.now() }), 15000);

  req.on("close", () => {
    clearInterval(interval);
    unsubscribe();
    res.end();
  });
}
