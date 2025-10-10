// @ts-nocheck
import type { NextApiRequest, NextApiResponse } from "next";
import { assertMasked } from "../../_sanitizer.js";
import { getLatestArtifacts } from "../../../../../server/operator/events.js";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { requestId } = req.query as { requestId: string };
    const latestArtifacts = getLatestArtifacts(requestId);

    const topology = {
      nodes: [
        { id: "triage", type: "workflow", data: { label: "Triage" } },
        { id: "cancellation", type: "workflow", data: { label: "Cancellation Agent" } },
        { id: "mask_pii", type: "workflow", data: { label: "Mask PII" } },
        { id: "vector_search", type: "workflow", data: { label: "Vector Search" } },
        { id: "create_ticket", type: "workflow", data: { label: "Create Ticket" } },
        { id: "generate_draft", type: "workflow", data: { label: "Generate Draft" } },
        { id: "calc_conf", type: "workflow", data: { label: "Calculate Confidence" } },
        { id: "policy", type: "workflow", data: { label: "Policy Validation" } },
        { id: "slack", type: "workflow", data: { label: "Post to Slack" } },
        { id: "review", type: "workflow", data: { label: "Human Review" } },
        { id: "done", type: "workflow", data: { label: "Done" } }
      ],
      edges: [
        { id: "e1", source: "triage", target: "cancellation", type: "animated" },
        { id: "e2", source: "cancellation", target: "mask_pii", type: "animated" },
        { id: "e3", source: "mask_pii", target: "vector_search", type: "temporary" },
        { id: "e4", source: "mask_pii", target: "create_ticket", type: "animated" },
        { id: "e5", source: "create_ticket", target: "generate_draft", type: "animated" },
        { id: "e6", source: "generate_draft", target: "calc_conf", type: "animated" },
        { id: "e7", source: "calc_conf", target: "policy", type: "animated" },
        { id: "e8", source: "policy", target: "slack", type: "animated" },
        { id: "e9", source: "slack", target: "review", type: "animated" },
        { id: "e10", source: "review", target: "done", type: "animated" }
      ]
    };

    const payload: Record<string, unknown> = {
      requestId,
      topology,
      latestArtifacts,
      anchors: {},
      links: {}
    };
    assertMasked(payload);
    res.status(200).json(payload);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Internal error" });
  }
}
