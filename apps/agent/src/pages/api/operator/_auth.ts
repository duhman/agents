import type { NextApiRequest, NextApiResponse } from "next";

export function requireOperatorAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  const token = process.env.OPERATOR_TOKEN;
  if (!token) return process.env.NODE_ENV !== "production";
  const provided = req.headers["x-operator-token"];
  if (provided === token) return true;
  try {
    res.status(401).json({ error: "unauthorized" });
  } catch {
  }
  return false;
}

export function auditLog(req: NextApiRequest) {
  try {
    const now = new Date().toISOString();
    const requestId = (req.query?.requestId as string) || "";
    console.log(JSON.stringify({ ts: now, path: req.url, requestId, ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress }));
  } catch {
  }
}
