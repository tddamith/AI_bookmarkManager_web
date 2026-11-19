import "server-only";
import { authApiUrl } from "@/lib/auth";
import * as local from "@/lib/library-store";
import type { Folder, ImportState, Mark, MarkPatch, Source } from "@/lib/library-store";

/**
 * Bookmark data access. With AUTH_API_URL set, bookmarks live in the external API (`/bookmarks`);
 * otherwise in the built-in file store. Opens + import progress are always kept locally (the API has no such fields).
 *
 * The API only has title / url / description / tags, so web-only concepts are stored as tags:
 *   `folder:<Name>` → folder   ·   `favorite`   ·   `read-later`
 * For bookmarks created elsewhere (e.g. the extension), the first plain tag is treated as the folder.
 */
export type Ctx = { userId: string; token: string };

const RESERVED = new Set(["favorite", "read-later"]);
const FOLDER = "folder:";
const external = () => Boolean(authApiUrl());

type ApiBookmark = { id: string; title: string; url: string; description?: string | null; tags?: string[]; created_at: string };

async function api(ctx: Ctx, path: string, init: RequestInit = {}) {
  return fetch(`${authApiUrl()}${path}`, {
    ...init,
    headers: { "content-type": "application/json", authorization: `Bearer ${ctx.token}`, ...(init.headers ?? {}) },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
}

function folderOf(tags: string[]): string | null {
  const explicit = tags.find((t) => t.startsWith(FOLDER));
  if (explicit) return explicit.slice(FOLDER.length).trim() || null;
  return tags.find((t) => !RESERVED.has(t) && !t.startsWith(FOLDER)) ?? null;
}

function toMark(b: ApiBookmark): Mark {
  const tags = b.tags ?? [];
  const folder = folderOf(tags);
  const iso = /[zZ]|[+-]\d\d:?\d\d$/.test(b.created_at) ? b.created_at : `${b.created_at}Z`;
  return {
    id: b.id,
    url: b.url,
    title: b.title,
    folderId: folder,
    savedAt: Date.parse(iso) || Date.now(),
    later: tags.includes("read-later"),
    fav: tags.includes("favorite"),
    tags: tags.filter((t) => !RESERVED.has(t) && !t.startsWith(FOLDER) && t !== folder),
    summary: b.description ?? "",
  };
}

async function loadApiMarks(ctx: Ctx): Promise<Mark[]> {
  const out: Mark[] = [];
  const limit = 500;
  for (let skip = 0; skip < 10_000; skip += limit) {
    const res = await api(ctx, `/bookmarks?skip=${skip}&limit=${limit}`);
    if (!res.ok) throw new Error(`bookmarks ${res.status}`);
    const page = (await res.json()) as ApiBookmark[];
    out.push(...page.map(toMark));
    if (page.length < limit) break;
  }
  return out;
}

export async function getSource(ctx: Ctx): Promise<Source> {
  if (!external()) return local.localSource(ctx.userId);
  const [marks, act] = await Promise.all([loadApiMarks(ctx), local.localActivity(ctx.userId)]);
  const folders: Record<string, Folder> = {};
  for (const m of marks) if (m.folderId) folders[m.folderId] = { id: m.folderId, name: m.folderId };
  return { marks, folders, opens: act.opens, duplicates: act.import.duplicates, dead: act.import.dead };
}

export async function importSummary(ctx: Ctx) {
  if (!external()) return local.librarySummary(ctx.userId);
  const [src, act] = await Promise.all([getSource(ctx), local.localActivity(ctx.userId)]);
  return local.summaryFrom(src, act.import);
}

const normUrl = (u: string) => u.trim().replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();
const tagsFor = (folderName?: string | null, extra: string[] = []) => [...(folderName?.trim() ? [`${FOLDER}${folderName.trim().slice(0, 100)}`] : []), ...extra];

export async function addBookmark(ctx: Ctx, input: { url: string; title?: string; folderName?: string | null }) {
  if (!external()) return local.addMark(ctx.userId, input);
  const existing = await loadApiMarks(ctx);
  if (existing.some((m) => normUrl(m.url) === normUrl(input.url))) return { ok: false as const, reason: "exists" as const };
  const res = await api(ctx, "/bookmarks", {
    method: "POST",
    body: JSON.stringify({ title: input.title?.trim() || new URL(input.url).hostname.replace(/^www\./, ""), url: input.url, tags: tagsFor(input.folderName) }),
  });
  if (!res.ok) return { ok: false as const, reason: "invalid" as const };
  return { ok: true as const, id: ((await res.json()) as ApiBookmark).id };
}

export async function patchBookmark(ctx: Ctx, id: string, patch: MarkPatch) {
  if (!external()) return local.updateMark(ctx.userId, id, patch);
  const cur = await api(ctx, `/bookmarks/${encodeURIComponent(id)}`);
  if (!cur.ok) return false;
  const b = (await cur.json()) as ApiBookmark;
  const m = toMark(b);
  const body: { title?: string; tags?: string[] } = {};
  if (typeof patch.title === "string" && patch.title.trim()) body.title = patch.title.trim().slice(0, 500);
  const touchesTags = patch.folderName !== undefined || patch.later !== undefined || patch.fav !== undefined || patch.tags !== undefined;
  if (touchesTags) {
    const folder = patch.folderName !== undefined ? patch.folderName : m.folderId;
    const later = patch.later ?? m.later;
    const fav = patch.fav ?? m.fav;
    const plain = patch.tags ?? m.tags;
    body.tags = [...tagsFor(folder, plain), ...(later ? ["read-later"] : []), ...(fav ? ["favorite"] : [])];
  }
  const res = await api(ctx, `/bookmarks/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) });
  return res.ok;
}

export async function removeBookmark(ctx: Ctx, id: string) {
  if (!external()) return local.deleteMark(ctx.userId, id);
  const res = await api(ctx, `/bookmarks/${encodeURIComponent(id)}`, { method: "DELETE" });
  return res.ok;
}

export async function openBookmark(ctx: Ctx, id: string): Promise<string | null> {
  if (!external()) return local.recordOpen(ctx.userId, id);
  const res = await api(ctx, `/bookmarks/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  await local.recordOpenEvent(ctx.userId, id);
  return ((await res.json()) as ApiBookmark).url;
}

export type ImportInput = {
  folders?: { id: string; name: string }[];
  bookmarks?: { id?: string; url: string; title?: string; folderId?: string | null; folderName?: string | null; savedAt?: number }[];
  import?: { total?: number; stage?: number; status?: string; dead?: number };
};

/** Extension / file-upload batches. External mode: each bookmark becomes a POST /bookmarks (duplicates skipped). */
export async function importBatch(ctx: Ctx, input: ImportInput) {
  if (!external()) return local.syncLibrary(ctx.userId, input);
  const names = new Map((input.folders ?? []).map((f) => [f.id, f.name]));
  const batch = input.bookmarks ?? [];
  let duplicates = 0;
  if (batch.length) {
    const seen = new Set((await loadApiMarks(ctx)).map((m) => normUrl(m.url)));
    const fresh = batch.filter((b) => {
      const k = normUrl(b.url);
      if (seen.has(k)) { duplicates++; return false; }
      seen.add(k);
      return true;
    });
    for (let i = 0; i < fresh.length; i += 8) {
      await Promise.all(fresh.slice(i, i + 8).map((b) =>
        api(ctx, "/bookmarks", {
          method: "POST",
          body: JSON.stringify({ title: b.title?.trim() || b.url, url: b.url, tags: tagsFor(b.folderName ?? (b.folderId ? names.get(b.folderId) : null)) }),
        }).catch(() => null),
      ));
    }
  }
  const act = await local.localActivity(ctx.userId);
  const imp = input.import;
  const next: Partial<ImportState> = { duplicates: act.import.duplicates + duplicates };
  if (typeof imp?.total === "number") next.total = imp.total;
  if (typeof imp?.dead === "number") next.dead = imp.dead;
  if (typeof imp?.stage === "number") next.stage = Math.min(3, Math.max(0, Math.floor(imp.stage))) as ImportState["stage"];
  if (imp?.status === "importing" || imp?.status === "done" || imp?.status === "idle") next.status = imp.status;
  else if (act.import.status === "idle") next.status = "importing";
  if (next.status === "done") next.stage = 3;
  await local.setImportState(ctx.userId, next);
}
