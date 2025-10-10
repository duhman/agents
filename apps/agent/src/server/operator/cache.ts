type CacheKey = string;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const CACHE_VECTOR_SEARCH = String(process.env.CACHE_VECTOR_SEARCH || "").toLowerCase() === "true";
const DEFAULT_TTL_MS = Number(process.env.CACHE_VECTOR_TTL_MS || 60_000);

const store = new Map<CacheKey, Entry<unknown>>();

function now() {
  return Date.now();
}

export function makeKey(parts: Record<string, unknown>): string {
  return Object.entries(parts)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join("&");
}

export function getVectorSearch<T>(keyParts: { type: "vector_search_context"; query: string; limit: number }): T | undefined {
  if (!CACHE_VECTOR_SEARCH) return undefined;
  const key = makeKey(keyParts);
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setVectorSearch<T>(keyParts: { type: "vector_search_context"; query: string; limit: number }, value: T, ttlMs: number = DEFAULT_TTL_MS): void {
  if (!CACHE_VECTOR_SEARCH) return;
  const key = makeKey(keyParts);
  store.set(key, { value, expiresAt: now() + Math.max(1000, ttlMs) });
}

export function clearExpired(): void {
  const t = now();
  for (const [k, v] of store.entries()) {
    if (v.expiresAt <= t) store.delete(k);
  }
}

export function clearAll(): void {
  store.clear();
}
