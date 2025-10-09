import type { NextApiRequest, NextApiResponse } from "next";
import { assertMasked } from "../_sanitizer.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const recent = Number(req.query.recent ?? 50);
    const items: unknown[] = [];
    assertMasked(items);
    res.status(200).json(items);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Internal error" });
  }
}
