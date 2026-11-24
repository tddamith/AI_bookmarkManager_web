import "server-only";
import { authApiUrl } from "@/lib/auth";
import * as local from "@/lib/library-store";
import type { Folder, ImportState, Mark, MarkPatch, Source } from "@/lib/library-store";
import type { Item, PipelineStore } from "@/lib/import-pipeline";

/**
 * Bookmark data access. With AUTH_API_URL set, bookmarks live in the API's sync collection (`POST /sync`) — the same one
 * the browser extension syncs with, so the web portal and the add-on always show the same library. Otherwise they live in
 * the built-in file store. Opens + dead-link counts are always kept locally (the API has no such fields).
 *
 * Sync item → web bookmark: folderPath → folder (root tokens and a leading "Stash" folder are hidden), note → summary,
 * tags → tags, and the web-only flags are stored as tags: `favorite` and `read-later`.
 * Duplicates (same URL ignoring #fragment, trailing "/" and case) are rejected by the API and skipped here too.
 */
export type Ctx = { userId: string; token: string };

const RESERVED = new Set(["favorite", "read-later"]);
const ROOTS = new Set(["@bar", "@other", "@mobile"]);
const SEP = " › ";
const external = () => Boolean(authApiUrl());

type SyncItem = { syncId: string; title: string; url: string; folderPath?: string[]; tags?: string[]; note?: string; remindAt?: number | null; deleted?: boolean; clientAt?: number };
type SyncResponse = { cursor: number; changes: SyncItem[]; more: boolean; reset?: boolean; rejected?: number; duplicates?: { syncId: string; of: string }[] };

async function post(ctx: Ctx, path: string, body: unknown) {
  return fetch(`${authApiUrl()}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${ctx.token}` },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
}

const normUrl = (u: string) => u.trim().replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();

function folderName(path: string[] = []): string | null {
  const p = [...path];
  if (p[0] && ROOTS.has(p[0])) p.shift();
  if (p[0]?.toLowerCase() === "stash") p.shift();
  return p.length ? p.join(SEP) : null;
}

function toMark(it: SyncItem): Mark {
  const tags = it.tags ?? [];
  return {
    id: it.syncId,
    url: it.url,
    title: it.title || it.url,
    folderId: folderName(it.folderPath),
    savedAt: it.clientAt || Date.now(),
    later: tags.includes("read-later"),
    fav: tags.includes("favorite"),
    tags: tags.filter((t) => !RESERVED.has(t)),
    summary: it.note ?? "",
  };
}

/** Everything in the account: all pages of POST /sync from cursor 0, tombstones dropped, duplicate URLs collapsed. */
async function pullAll(ctx: Ctx): Promise<SyncItem[]> {
  const items = new Map<string, SyncItem>();
  let cursor = 0;
  for (let i = 0; i < 100; i++) {
    const res = await post(ctx, "/sync", { cursor, changes: [] });
    if (!res.ok) throw new Error(`sync ${res.status}`);
    const page = (await res.json()) as SyncResponse;
    for (const c of page.changes) items.set(c.syncId, c);
    if (!page.more) break;
    cursor = page.cursor;
  }
  const seen = new Set<string>();
  const out: SyncItem[] = [];
  for (const it of items.values()) {
    if (it.deleted || !it.url) continue;
    const k = normUrl(it.url);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(it);
  }
  return out;
}

/** Push changes (≤500 per request) without pulling. Returns how many were rejected as duplicates. */
async function pushChanges(ctx: Ctx, changes: Partial<SyncItem>[]) {
  let duplicates = 0;
  for (let i = 0; i < changes.length; i += 500) {
    const res = await post(ctx, "/sync", { cursor: 0, quiet: true, changes: changes.slice(i, i + 500) });
    if (!res.ok) throw new Error(`sync ${res.status}`);
    duplicates += ((await res.json()) as SyncResponse).duplicates?.length ?? 0;
  }
  return duplicates;
}

async function getImportState(ctx: Ctx) {
  try {
    const res = await fetch(`${authApiUrl()}/sync/import-state`, { headers: { authorization: `Bearer ${ctx.token}` }, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return res.ok ? ((await res.json()) as { total: number; done: number; stage: number; duplicates: number; dead: number; status: ImportState["status"]; source?: ImportState["source"]; error?: string; ageSec?: number }) : null;
  } catch {
    return null;
  }
}

export async function getSource(ctx: Ctx): Promise<Source> {
  if (!external()) return local.localSource(ctx.userId);
  const [items, act] = await Promise.all([pullAll(ctx), local.localActivity(ctx.userId)]);
  const marks = items.map(toMark);
  const folders: Record<string, Folder> = {};
  for (const m of marks) if (m.folderId) folders[m.folderId] = { id: m.folderId, name: m.folderId };
  return { marks, folders, opens: act.opens, duplicates: act.import.duplicates, dead: act.import.dead };
}

export async function importSummary(ctx: Ctx) {
  if (!external()) return local.librarySummary(ctx.userId);
  const [src, st] = await Promise.all([getSource(ctx), getImportState(ctx)]);
  const imp: ImportState = {
    status: st?.status ?? "idle", total: st?.total ?? 0, stage: (st?.stage ?? 0) as ImportState["stage"], duplicates: st?.duplicates ?? 0, dead: st?.dead ?? 0,
    done: st?.done ?? 0, source: st?.source === "server" ? "server" : "extension", error: st?.error,
    updatedAt: typeof st?.ageSec === "number" ? Date.now() - st.ageSec * 1000 : undefined,
  };
  const sum = local.summaryFrom(src, imp);
  if (imp.source === "server") return sum;   // the pipeline reports its own per-stage progress
  // The extension reports how far it has got; synced library size is the floor.
  const processed = Math.max(st?.done ?? 0, sum.processed);
  const total = Math.max(imp.total, processed);
  return { ...sum, processed, total, percent: imp.status === "done" ? 100 : total ? Math.min(100, Math.round((processed / total) * 100)) : 0 };
}

const tagsOf = (m: { tags: string[]; fav: boolean; later: boolean }) => [...m.tags, ...(m.later ? ["read-later"] : []), ...(m.fav ? ["favorite"] : [])];

/** Folder name → path. Reuses an existing folder's exact path when the name matches; new folders go under Other bookmarks › Stash. */
function pathFor(name: string | null | undefined, items: SyncItem[]): string[] {
  const n = name?.trim();
  if (!n) return [];
  const hit = items.find((i) => folderName(i.folderPath)?.toLowerCase() === n.toLowerCase());
  if (hit?.folderPath) {
    // keep the matched folder's own prefix, but the full path of that folder (not of the item's parent)
    return hit.folderPath;
  }
  return ["@other", "Stash", ...n.split(SEP).map((p) => p.trim().slice(0, 120)).filter(Boolean)];
}

export async function addBookmark(ctx: Ctx, input: { url: string; title?: string; folderName?: string | null }) {
  if (!external()) return local.addMark(ctx.userId, input);
  const items = await pullAll(ctx);
  if (items.some((m) => normUrl(m.url) === normUrl(input.url))) return { ok: false as const, reason: "exists" as const };
  const syncId = crypto.randomUUID();
  const change: Partial<SyncItem> = {
    syncId, url: input.url, deleted: false, clientAt: Date.now(), tags: [], note: "", remindAt: null,
    title: input.title?.trim() || new URL(input.url).hostname.replace(/^www\./, ""),
    folderPath: pathFor(input.folderName, items),
  };
  try {
    return (await pushChanges(ctx, [change])) > 0 ? { ok: false as const, reason: "exists" as const } : { ok: true as const, id: syncId };
  } catch {
    return { ok: false as const, reason: "invalid" as const };
  }
}

export async function patchBookmark(ctx: Ctx, id: string, patch: MarkPatch) {
  if (!external()) return local.updateMark(ctx.userId, id, patch);
  const items = await pullAll(ctx);
  const it = items.find((i) => i.syncId === id);
  if (!it) return false;
  const m = toMark(it);
  const next = {
    tags: patch.tags ?? m.tags,
    later: patch.later ?? m.later,
    fav: patch.fav ?? m.fav,
  };
  const change: Partial<SyncItem> = {
    syncId: id, url: it.url, deleted: false, clientAt: Date.now(), remindAt: it.remindAt ?? null, note: it.note ?? "",
    title: typeof patch.title === "string" && patch.title.trim() ? patch.title.trim().slice(0, 500) : it.title,
    folderPath: patch.folderName !== undefined ? pathFor(patch.folderName, items) : it.folderPath ?? [],
    tags: tagsOf(next),
  };
  if (typeof patch.summary === "string") change.note = patch.summary.slice(0, 1500);
  try { await pushChanges(ctx, [change]); return true; } catch { return false; }
}

export async function removeBookmark(ctx: Ctx, id: string) {
  if (!external()) return local.deleteMark(ctx.userId, id);
  try { await pushChanges(ctx, [{ syncId: id, deleted: true, clientAt: Date.now() }]); return true; } catch { return false; }
}

export async function openBookmark(ctx: Ctx, id: string): Promise<string | null> {
  if (!external()) return local.recordOpen(ctx.userId, id);
  const it = (await pullAll(ctx)).find((i) => i.syncId === id);
  if (!it) return null;
  await local.recordOpenEvent(ctx.userId, id);
  return it.url;
}

export type ImportInput = {
  folders?: { id: string; name: string }[];
  bookmarks?: { id?: string; url: string; title?: string; folderId?: string | null; folderName?: string | null; savedAt?: number }[];
  import?: { total?: number; stage?: number; status?: string; dead?: number };
};

/** File-upload batches from the web (and legacy extension batches). External mode: pushed to /sync; duplicates are rejected by the API. */
export async function importBatch(ctx: Ctx, input: ImportInput) {
  if (!external()) return local.syncLibrary(ctx.userId, input);
  const names = new Map((input.folders ?? []).map((f) => [f.id, f.name]));
  const batch = input.bookmarks ?? [];
  const starting = batch.length === 0 && typeof input.import?.total === "number";   // a new import begins: reset counters
  const prev = starting ? null : await getImportState(ctx);
  let duplicates = prev?.duplicates ?? 0;
  let added = 0;
  if (batch.length) {
    const have = new Set((await pullAll(ctx)).map((i) => normUrl(i.url)));
    const changes: Partial<SyncItem>[] = [];
    for (const b of batch) {
      const k = normUrl(b.url);
      if (have.has(k)) { duplicates++; continue; }
      have.add(k);
      const folder = b.folderName ?? (b.folderId ? names.get(b.folderId) : null);
      changes.push({
        syncId: crypto.randomUUID(), url: b.url, title: b.title?.trim() || b.url, deleted: false, tags: [], note: "", remindAt: null,
        folderPath: folder ? ["@other", "Stash", ...folder.split(SEP).map((p) => p.trim()).filter(Boolean)] : ["@other", "Stash", "Inbox"],
        clientAt: b.savedAt ?? Date.now(),
      });
    }
    duplicates += await pushChanges(ctx, changes);
    added = changes.length;
  }
  const imp = input.import;
  const status = imp?.status === "idle" || imp?.status === "importing" || imp?.status === "done" ? imp.status : prev?.status === "done" ? "importing" : (prev?.status ?? "importing");
  await post(ctx, "/sync/import-state", {
    total: typeof imp?.total === "number" ? imp.total : prev?.total ?? 0,
    done: (prev?.done ?? 0) + added + (batch.length - added),
    stage: status === "done" ? 3 : typeof imp?.stage === "number" ? imp.stage : prev?.stage ?? 0,
    duplicates, dead: typeof imp?.dead === "number" ? imp.dead : prev?.dead ?? 0, status,
  }).catch(() => undefined);
}

/** Cheap "does this user have any bookmarks?" check (used to route empty libraries to Get started). */
export async function hasBookmarks(ctx: Ctx): Promise<boolean> {
  if (!external()) return (await local.localSource(ctx.userId)).marks.length > 0;
  try {
    return (await pullAll(ctx)).length > 0;
  } catch {
    return true; // on errors, don't trap the user in onboarding
  }
}


/**
 * What the import pipeline reads and writes. External mode: the API's /sync collection + /sync/import-state (so the extension, this app
 * and every server instance see the same progress). Otherwise the built-in file store.
 */
export function createPipelineStore(ctx: Ctx): PipelineStore {
  const toItem = (m: Mark, folders: Record<string, Folder>): Item => ({
    id: m.id, url: m.url, title: m.title, folder: m.folderId ? folders[m.folderId]?.name ?? null : null, tags: m.tags, summary: m.summary, savedAt: m.savedAt,
  });

  if (!external()) {
    return {
      list: async () => { const src = await local.localSource(ctx.userId); return src.marks.map((m) => toItem(m, src.folders)); },
      remove: async (id) => { await local.deleteMark(ctx.userId, id); },
      update: async (id, p) => { await local.updateMark(ctx.userId, id, { ...(p.folder !== undefined ? { folderName: p.folder } : {}), tags: p.tags, summary: p.summary }); },
      setState: async (st) => { await local.setImportState(ctx.userId, { status: st.status, stage: st.stage, done: st.done, total: st.total, duplicates: st.duplicates, dead: st.dead, error: st.error, source: "server" }); },
    };
  }

  let cache: SyncItem[] = [];
  let pending = new Map<string, Partial<SyncItem>>();   // writes are batched: one /sync request per ~100 changes, not one per bookmark
  const flush = async () => {
    if (!pending.size) return;
    const batch = [...pending.values()];
    pending = new Map();
    await pushChanges(ctx, batch);
  };
  const queue = async (change: Partial<SyncItem>) => {
    pending.set(change.syncId!, change);
    if (pending.size >= 100) await flush();
  };
  return {
    flush,
    list: async () => {
      cache = await pullAll(ctx);
      return cache.map((i) => { const m = toMark(i); return { id: m.id, url: m.url, title: m.title, folder: m.folderId, tags: m.tags, summary: m.summary, savedAt: m.savedAt }; });
    },
    remove: async (id) => { await queue({ syncId: id, deleted: true, clientAt: Date.now() }); },
    update: async (id, p) => {
      const it = cache.find((i) => i.syncId === id);
      if (!it) return;
      const m = toMark(it);
      const tags = p.tags ?? m.tags;
      const change: Partial<SyncItem> = {
        syncId: id, url: it.url, title: it.title, deleted: false, clientAt: Date.now(), remindAt: it.remindAt ?? null,
        note: p.summary !== undefined ? p.summary.slice(0, 1500) : it.note ?? "",
        folderPath: p.folder !== undefined ? pathFor(p.folder, cache) : it.folderPath ?? [],
        tags: tagsOf({ tags, later: m.later, fav: m.fav }),
      };
      Object.assign(it, change);   // keep the cache current so later updates (and folder paths) see this one
      await queue(change);
    },
    setState: async (st) => {
      const res = await post(ctx, "/sync/import-state", { total: st.total, done: st.done, stage: st.stage, duplicates: st.duplicates, dead: st.dead, status: st.status, source: "server", error: st.error ?? "" });
      if (!res.ok) throw new Error(`import-state ${res.status}`);
    },
  };
}
