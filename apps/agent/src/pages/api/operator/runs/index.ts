import { requireOperatorAuth, auditLog } from "../../_auth.js";
// @ts-nocheck
import type { NextApiRequest, NextApiResponse } from "next";
import { assertMasked } from "../_sanitizer.js";
import { getRecentRuns } from "../../../../server/operator/events.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  auditLog(req);
  if (!requireOperatorAuth(req, res)) return;
  try {
    const recent = Number(req.query.recent ?? 50);
    const items = getRecentRuns().slice(0, Math.max(1, Math.min(200, recent)));
    assertMasked(items);
    res.status(200).json(items);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Internal error" });
  }
}
