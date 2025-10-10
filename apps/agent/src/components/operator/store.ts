import { useSyncExternalStore } from "react";
import { buildNodeMeta } from "./mapping";

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
