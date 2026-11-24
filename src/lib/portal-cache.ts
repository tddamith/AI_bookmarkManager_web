/**
 * Tiny stale-while-revalidate cache for the portal's GET endpoints (client only).
 * `peek` returns whatever is cached right now; `load` fetches (sharing in-flight requests) and updates the cache.
 */
type Entry = { data: unknown; at: number };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export function peek<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  return cache.get(key)?.data as T | undefined;
}

/** Cached value with the time it was fetched. */
export function peekAt<T>(key: string): { data: T; at: number } | undefined {
  if (typeof window === "undefined") return undefined;
  const e = cache.get(key);
  return e ? { data: e.data as T, at: e.at } : undefined;
}

/** Server-provided data (no timestamp: this runs during render, where Date.now() isn't allowed). */
export function seed(key: string, data: unknown) {
  // Browser only: a module-level cache on the server would be shared between requests (and users).
  if (typeof window === "undefined") return;
  if (!cache.has(key)) cache.set(key, { data, at: 0 });
}

export function load<T>(key: string): Promise<T | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const running = inflight.get(key);
  if (running) return running as Promise<T | null>;
  const p = fetch(key, { cache: "no-store" })
    .then(async (res) => {
      if (res.status === 401) { window.dispatchEvent(new Event("tidypin:unauth")); return null; }
      if (!res.ok) return null;
      const data = (await res.json()) as T;
      cache.set(key, { data, at: Date.now() });
      return data;
    })
    .catch(() => null)
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p as Promise<T | null>;
}

export const FOLDERS_KEY = "/api/library/folders";
export const libraryKey = (view: string, folderId: string | null, q: string, filters: { k: string; v: string }[] = []) => {
  const p = new URLSearchParams();
  if (folderId) p.set("folder", folderId);
  else if (view !== "dash") p.set("view", view);
  if (q) p.set("q", q);
  for (const f of filters) {
    if (f.k === "site") p.set("site", f.v);
    else if (f.k === "tag") p.set("tag", f.v);
    else if (f.k === "folder") p.set("folderName", f.v);
    else if (f.v === "favorite") p.set("fav", "1");
    else if (f.v === "readlater") p.set("later", "1");
  }
  return `/api/library?${p}`;
};
