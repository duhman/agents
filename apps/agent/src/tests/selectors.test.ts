import { selectExecutedNodeIds, selectEdgeStatuses, selectNodeMeta } from "../components/operator/store.js";

const snapshot = {
  topology: {
    nodes: [
      { id: "triage", data: {} },
      { id: "create_ticket", data: {} },
      { id: "generate_draft", data: {} },
    ],
    edges: [
      { id: "e1", source: "triage", target: "create_ticket" },
      { id: "e2", source: "create_ticket", target: "generate_draft", type: "temporary" },
    ]
  }
};

const artifacts = {
  extraction_result: { is_cancellation: true },
  ticket_creation_status: { ticketId: "T-1", status: "created" }
};

const s = { runs: [], selectedRunId: "r", snapshot, latestArtifacts: artifacts, events: [] };

const executed = selectExecutedNodeIds(s as any);
if (!executed.has("triage") || !executed.has("create_ticket")) {
  throw new Error("selectExecutedNodeIds failed");
}

const edges = selectEdgeStatuses(s as any);
if (edges.e1 !== "animated") {
  throw new Error("selectEdgeStatuses e1 should be animated");
}
if (edges.e2 !== "temporary") {
  throw new Error("selectEdgeStatuses e2 should be temporary");
}

console.log("selectors.test.ts passed");
