type ArtifactType =
  | "extraction_result"
  | "drafting_progress"
  | "policy_validation"
  | "vector_search_context"
  | "ticket_creation_status"
  | "draft_creation_status"
  | "slack_post_status"
  | "human_review_status";

export type ArtifactEvent = {
  requestId: string;
  type: ArtifactType;
  data: Record<string, unknown>;
  ts?: number;
};

type Subscriber = (evt: ArtifactEvent) => void;

const channels = new Map<string, Set<Subscriber>>();
const recentRuns: {
  items: {
    requestId: string;
    createdAt: number;
    status: "running" | "completed" | "error";
    lastArtifactType?: ArtifactType;
    updatedAt: number;
  }[];
  max: number;
} = { items: [], max: 200 };

const latestByType: Map<string, Map<ArtifactType, ArtifactEvent>> = new Map();

export function subscribe(requestId: string, fn: Subscriber) {
  let set = channels.get(requestId);
  if (!set) {
    set = new Set();
    channels.set(requestId, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
    if (set && set.size === 0) channels.delete(requestId);
  };
}

function upsertRunMeta(requestId: string, lastType?: ArtifactType, status?: "running" | "completed" | "error") {
  const now = Date.now();
  const idx = recentRuns.items.findIndex((r) => r.requestId === requestId);
  if (idx === -1) {
    recentRuns.items.unshift({
      requestId,
      createdAt: now,
      status: status ?? "running",
      lastArtifactType: lastType,
      updatedAt: now
    });
    if (recentRuns.items.length > recentRuns.max) {
      recentRuns.items.pop();
    }
  } else {
    const r = recentRuns.items[idx];
    r.updatedAt = now;
    if (lastType) r.lastArtifactType = lastType;
    if (status) r.status = status;
    recentRuns.items.splice(idx, 1);
    recentRuns.items.unshift(r);
  }
}

export function publish(evt: ArtifactEvent) {
  const ts = evt.ts ?? Date.now();
  const enriched = { ...evt, ts };
  upsertRunMeta(evt.requestId, evt.type);

  const map = latestByType.get(evt.requestId) ?? new Map();
  map.set(evt.type, enriched);
  latestByType.set(evt.requestId, map);

  const subs = channels.get(evt.requestId);
  if (subs && subs.size) {
    for (const fn of subs) {
      try {
        fn(enriched);
      } catch {
      }
    }
  }
}

export function markRunCompleted(requestId: string) {
  upsertRunMeta(requestId, undefined, "completed");
}

export function markRunError(requestId: string) {
  upsertRunMeta(requestId, undefined, "error");
}

export function getRecentRuns() {
  return recentRuns.items.slice(0);
}

export function getLatestArtifacts(requestId: string): Record<string, unknown> {
  const map = latestByType.get(requestId);
  if (!map) return {};
  const obj: Record<string, unknown> = {};
  for (const [k, v] of map.entries()) {
    obj[k] = v.data;
  }
  return obj;
}

export function writeSSE(res: any, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}
