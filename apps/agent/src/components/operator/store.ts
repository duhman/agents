import { useSyncExternalStore } from "react";
import { buildNodeMeta } from "./mapping.js";

type RunMeta = {
  requestId: string;
  createdAt: number;
  status: "running" | "completed" | "error";
  lastArtifactType?: string;
  updatedAt: number;
};

type State = {
  runs: RunMeta[];
  selectedRunId: string | null;
  snapshot: any | null;
  latestArtifacts: Record<string, any>;
  events: any[];
};

type Listener = () => void;

const state: State = {
  runs: [],
  selectedRunId: null,
  snapshot: null,
  latestArtifacts: {},
  events: []
};

const listeners = new Set<Listener>();

function setState(patch: Partial<State>) {
  Object.assign(state, patch);
  listeners.forEach((l) => l());
}

export const store = {
  getState: () => state,
  subscribe: (l: Listener) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setRuns: (runs: RunMeta[]) => setState({ runs }),
  selectRun: (id: string | null) => setState({ selectedRunId: id, events: [], latestArtifacts: {}, snapshot: null }),
  setSnapshot: (snapshot: any) => setState({ snapshot }),
  mergeArtifact: (type: string, data: any) => setState({ latestArtifacts: { ...state.latestArtifacts, [type]: data } }),
  pushEvent: (evt: any) => setState({ events: [evt, ...state.events].slice(0, 200) })
};

export function useStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(store.subscribe, () => selector(state), () => selector(state));
}

export function selectNodeMeta(s: State) {
  return buildNodeMeta(s.latestArtifacts || {});
}
export function selectExecutedNodeIds(s: State): Set<string> {
  const meta = buildNodeMeta(s.latestArtifacts || {});
  const ids = new Set<string>();
  for (const [id, m] of Object.entries(meta)) {
    if (m.status && m.status !== "idle") ids.add(id);
  }
  return ids;
}

export function selectEdgeStatuses(s: State): Record<string, "animated" | "temporary" | "idle"> {
  const topo = s.snapshot?.topology;
  if (!topo) return {};
  const executed = selectExecutedNodeIds(s);
  const statuses: Record<string, "animated" | "temporary" | "idle"> = {};
  for (const e of topo.edges || []) {
    const active = executed.has(e.source) && executed.has(e.target);
    statuses[e.id] = active ? "animated" : (e.type === "temporary" ? "temporary" : "idle");
  }
  return statuses;
}

export function selectErrorState(s: State): Record<string, { message?: string }> {
  const out: Record<string, { message?: string }> = {};
  const a = s.latestArtifacts || {};
  const check = (key: string, nodeId: string) => {
    const v = a[key];
    if (v && (v.status === "error" || v.error)) {
      out[nodeId] = { message: v.error || "error" };
    }
  };
  check("ticket_creation_status", "create_ticket");
  check("draft_creation_status", "generate_draft");
  check("slack_post_status", "slack");
  check("policy_validation", "policy");
  return out;
}
export function selectNodeStatuses(s: State): Record<string, string> {
  const meta = buildNodeMeta(s.latestArtifacts || {});
  const out: Record<string, string> = {};
  for (const [id, m] of Object.entries(meta)) out[id] = m.status || "idle";
  return out;
}
