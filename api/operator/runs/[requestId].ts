import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertMasked } from "../_sanitizer.js";

export const config = { runtime: "nodejs", regions: ["iad1"] };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const { requestId } = req.query as { requestId?: string };
    const payload: Record<string, unknown> = {
      requestId: requestId || "",
      topology: { nodes: [], edges: [] },
      latestArtifacts: {},
      anchors: {},
      links: {}
    };
    assertMasked(payload);
    res.status(200).json(payload);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Internal error" });
  }
}
