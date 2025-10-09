import type { NextApiRequest, NextApiResponse } from "next";
import { assertMasked } from "../../_sanitizer.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { requestId } = req.query as { requestId: string };
    const payload: Record<string, unknown> = { requestId, topology: { nodes: [], edges: [] }, latestArtifacts: {}, anchors: {}, links: {} };
    assertMasked(payload);
    res.status(200).json(payload);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Internal error" });
  }
}
