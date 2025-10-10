import type { VercelRequest, VercelResponse } from "@vercel/node";
import { assertMasked } from "./_sanitizer.js";

export const config = { runtime: "nodejs", regions: ["iad1"] };

export default async function handler(_req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    const items: Array<Record<string, unknown>> = [];
    assertMasked(items);
    res.status(200).json(items);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Internal error" });
  }
}
