import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Built-in library store used when AUTH_API_URL is empty (dev / single instance — swap for a database in production).
 * The browser extension (side panel) pushes folders + bookmarks + import progress here; the web "Importing" screen reads it.
 */
export type Folder = { id: string; name: string };
export type Mark = {
  id: string;
  url: string;
  title: string;
  folderId: string | null;
  savedAt: number;
  later: boolean;
  fav: boolean;
  tags: string[];
  summary: string;
  moved?: boolean;
};
export type ImportState = {
  status: "idle" | "importing" | "done";
  total: number;
  /** 0 imported · 1 duplicates · 2 folders · 3 tags & summaries */
  stage: 0 | 1 | 2 | 3;
  duplicates: number;
  dead: number;
};
type Lib = { folders: Record<string, Folder>; marks: Record<string, Mark>; import: ImportState; opens?: { t: number; m: string }[] };
type Db = Record<string, Lib>;

const FILE = process.env.LIBRARY_STORE_FILE ?? path.join(process.cwd(), ".data", "library.json");
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

async function load(): Promise<Db> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Db;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw e;
  }
}
async function save(db: Db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db), { mode: 0o600 });
  await fs.rename(tmp, FILE);
}

const MARK_DEFAULTS: Partial<Mark> = { later: false, fav: false, tags: [], summary: "", savedAt: 0 };
const empty = (): Lib => ({ folders: {}, marks: {}, import: { status: "idle", total: 0, stage: 0, duplicates: 0, dead: 0 } });
const normUrl = (u: string) => u.trim().replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();

export type SyncInput = {
  folders?: { id: string; name: string }[];
  bookmarks?: { id?: string; url: string; title?: string; folderId?: string | null; savedAt?: number }[];
  import?: { total?: number; stage?: number; status?: string; dead?: number };
};

/** Upsert from the extension. Re-sending the same bookmark is safe; a different id with the same URL counts as a duplicate. */
export function syncLibrary(userId: string, input: SyncInput) {
  return locked(async () => {
    const db = await load();
    const lib = (db[userId] ??= empty());
    for (const f of input.folders ?? []) lib.folders[f.id] = { id: f.id, name: f.name };
    const byUrl = new Map(Object.values(lib.marks).map((m) => [normUrl(m.url), m]));
    for (const b of input.bookmarks ?? []) {
      const key = normUrl(b.url);
      const id = b.id ?? randomUUID();
      const existing = byUrl.get(key);
      if (existing && existing.id !== id) {
        lib.import.duplicates += 1;
        continue;
      }
      const prev = lib.marks[id];
      const mark: Mark = { ...MARK_DEFAULTS, ...prev, id, url: b.url, title: b.title?.trim() || b.url, folderId: b.folderId ?? null, savedAt: prev?.savedAt ?? b.savedAt ?? Date.now() };
      lib.marks[id] = mark;
      byUrl.set(key, mark);
    }
    const imp = input.import;
    if (imp) {
      if (typeof imp.total === "number") lib.import.total = imp.total;
      if (typeof imp.dead === "number") lib.import.dead = imp.dead;
      if (typeof imp.stage === "number") lib.import.stage = Math.min(3, Math.max(0, Math.floor(imp.stage))) as ImportState["stage"];
      if (imp.status === "importing" || imp.status === "done" || imp.status === "idle") lib.import.status = imp.status;
    }
    if (lib.import.status === "idle" && imp?.status !== "idle") lib.import.status = "importing"; // any sync starts the import
    if (lib.import.status === "done") lib.import.stage = 3;
    await save(db);
  });
}

export function summaryFrom(src: Pick<Source, "marks" | "folders">, imp: ImportState) {
  const marks = src.marks;
  const processed = marks.length;
  const total = Math.max(imp.total, processed);
  const counts = new Map<string, number>();
  for (const m of marks) if (m.folderId) counts.set(m.folderId, (counts.get(m.folderId) ?? 0) + 1);
  const folders = Object.values(src.folders)
    .map((f) => ({ ...f, count: counts.get(f.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return {
    status: imp.status,
    stage: imp.stage,
    processed,
    total,
    percent: imp.status === "done" ? 100 : total ? Math.min(100, Math.round((processed / total) * 100)) : 0,
    stats: { bookmarks: processed, folders: folders.length, duplicates: imp.duplicates, dead: imp.dead },
    folders,
  };
}

export async function librarySummary(userId: string) {
  const lib = (await load())[userId] ?? empty();
  return summaryFrom({ marks: Object.values(lib.marks), folders: lib.folders }, lib.import);
}
export type LibrarySummary = Awaited<ReturnType<typeof librarySummary>>;

// ---------------------------------------------------------------------------
// Dashboard / library reads and writes
// ---------------------------------------------------------------------------
const DAY = 864e5;
const norm = (m: Mark): Mark => ({ ...MARK_DEFAULTS, ...m });
const domainOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const OTHER = "Unsorted";

async function libOf(db: Db, userId: string) {
  return (db[userId] ??= empty());
}

/** Everything the list/dashboard calculations need — from the built-in file store or from the external API. */
export type Source = {
  marks: Mark[];
  folders: Record<string, Folder>;
  opens: { t: number; m: string }[];
  duplicates: number;
  dead: number;
};

export async function localSource(userId: string): Promise<Source> {
  const lib = (await load())[userId] ?? empty();
  return { marks: Object.values(lib.marks), folders: lib.folders, opens: lib.opens ?? [], duplicates: lib.import.duplicates, dead: lib.import.dead };
}

/** Per-user activity kept here even when bookmarks live in the external API: opens + import progress. */
export async function localActivity(userId: string) {
  const lib = (await load())[userId] ?? empty();
  return { opens: lib.opens ?? [], import: lib.import };
}
export function recordOpenEvent(userId: string, markId: string) {
  return locked(async () => {
    const db = await load();
    const lib = await libOf(db, userId);
    const log = (lib.opens ??= []);
    log.push({ t: Date.now(), m: markId });
    if (log.length > 5000) log.splice(0, log.length - 5000);
    await save(db);
  });
}
export function setImportState(userId: string, patch: Partial<ImportState>) {
  return locked(async () => {
    const db = await load();
    const lib = await libOf(db, userId);
    lib.import = { ...lib.import, ...patch };
    await save(db);
  });
}

export function listLibrary(src: Source, opts: { view?: string; folderId?: string; q?: string }) {
  const lib = src;
  const all = src.marks.map(norm);
  const counts = new Map<string, number>();
  for (const m of all) if (m.folderId) counts.set(m.folderId, (counts.get(m.folderId) ?? 0) + 1);
  let list = all;
  if (opts.folderId) list = list.filter((m) => m.folderId === opts.folderId);
  else if (opts.view === "later") list = list.filter((m) => m.later);
  else if (opts.view === "fav") list = list.filter((m) => m.fav);
  const q = opts.q?.trim().toLowerCase();
  if (q) list = list.filter((m) => `${m.title} ${domainOf(m.url)} ${m.tags.join(" ")}`.toLowerCase().includes(q));
  list = [...list].sort((a, b) => b.savedAt - a.savedAt).slice(0, 300);
  const fname = (id: string | null) => (id ? lib.folders[id]?.name ?? OTHER : OTHER);
  return {
    bookmarks: list.map((m) => ({ ...m, domain: domainOf(m.url), folder: fname(m.folderId) })),
    counts: { all: all.length, later: all.filter((m) => m.later).length, fav: all.filter((m) => m.fav).length },
    folders: Object.values(lib.folders).map((f) => ({ ...f, count: counts.get(f.id) ?? 0 })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}

function resolveFolder(lib: Lib, folderName?: string | null): string | null {
  const name = folderName?.trim().slice(0, 200);
  if (!name) return null;
  const hit = Object.values(lib.folders).find((f) => f.name.toLowerCase() === name.toLowerCase());
  if (hit) return hit.id;
  const id = randomUUID();
  lib.folders[id] = { id, name };
  return id;
}

export type MarkPatch = { title?: string; folderName?: string | null; later?: boolean; fav?: boolean; tags?: string[] };

export function addMark(userId: string, input: { url: string; title?: string; folderName?: string | null }) {
  return locked(async () => {
    const db = await load();
    const lib = await libOf(db, userId);
    const key = normUrl(input.url);
    if (Object.values(lib.marks).some((m) => normUrl(m.url) === key)) return { ok: false as const, reason: "exists" as const };
    const id = randomUUID();
    const mark: Mark = { id, url: input.url, title: input.title?.trim() || domainOf(input.url), folderId: resolveFolder(lib, input.folderName), savedAt: Date.now(), later: false, fav: false, tags: [], summary: "" };
    lib.marks[id] = mark;
    await save(db);
    return { ok: true as const, id };
  });
}

export function updateMark(userId: string, id: string, patch: MarkPatch) {
  return locked(async () => {
    const db = await load();
    const lib = await libOf(db, userId);
    const m = lib.marks[id];
    if (!m) return false;
    if (typeof patch.title === "string" && patch.title.trim()) m.title = patch.title.trim().slice(0, 500);
    if (typeof patch.later === "boolean") m.later = patch.later;
    if (typeof patch.fav === "boolean") m.fav = patch.fav;
    if (Array.isArray(patch.tags)) m.tags = patch.tags.slice(0, 10).map((t) => t.slice(0, 30));
    if (patch.folderName !== undefined) {
      const next = resolveFolder(lib, patch.folderName);
      if (next !== m.folderId) m.moved = true;
      m.folderId = next;
    }
    await save(db);
    return true;
  });
}

export function deleteMark(userId: string, id: string) {
  return locked(async () => {
    const db = await load();
    const lib = await libOf(db, userId);
    if (!lib.marks[id]) return false;
    delete lib.marks[id];
    await save(db);
    return true;
  });
}

/** Records that a saved page was opened (feeds the dashboard) and returns its URL. */
export function recordOpen(userId: string, id: string) {
  return locked(async () => {
    const db = await load();
    const lib = await libOf(db, userId);
    const m = lib.marks[id];
    if (!m) return null;
    const log = (lib.opens ??= []);
    log.push({ t: Date.now(), m: id });
    if (log.length > 5000) log.splice(0, log.length - 5000);
    await save(db);
    return m.url;
  });
}

const sign = (n: number, unit = "") => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}${unit}`;
const hour12 = (h: number) => [((h + 11) % 12) + 1, h % 24 >= 12 ? "pm" : "am"] as const;

export function dashboardData(src: Source, range: "week" | "month", tzOffsetMin: number) {
  const lib = { folders: src.folders, opens: src.opens, import: { duplicates: src.duplicates, dead: src.dead } };
  const now = Date.now();
  const span = range === "month" ? 30 : 7;
  const from = now - span * DAY;
  const prevFrom = from - span * DAY;
  const marks = src.marks.map(norm);
  const byId = new Map(marks.map((m) => [m.id, m]));
  const opens = lib.opens.filter((o) => byId.has(o.m));
  const cur = opens.filter((o) => o.t >= from);
  const prev = opens.filter((o) => o.t >= prevFrom && o.t < from);
  const folderOf = (id: string) => { const f = byId.get(id)?.folderId; return f ? lib.folders[f]?.name ?? OTHER : OTHER; };
  const label = range === "month" ? "month" : "week";

  const savedCur = marks.filter((m) => m.savedAt >= from).length;
  const savedPrev = marks.filter((m) => m.savedAt >= prevFrom && m.savedAt < from).length;
  const openedDelta = prev.length ? Math.round(((cur.length - prev.length) / prev.length) * 100) : null;
  const later = marks.filter((m) => m.later);

  // Interests: share of opens by folder (falls back to share of saved pages when nothing was opened yet).
  const share = (events: { m: string }[]) => {
    const t = new Map<string, number>();
    for (const e of events) t.set(folderOf(e.m), (t.get(folderOf(e.m)) ?? 0) + 1);
    return t;
  };
  const basisCur = cur.length ? share(cur) : share(marks.map((m) => ({ m: m.id })));
  const basisPrev = share(prev);
  const totCur = [...basisCur.values()].reduce((a, b) => a + b, 0) || 1;
  const totPrev = [...basisPrev.values()].reduce((a, b) => a + b, 0);
  const interests = [...basisCur.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => {
    const pct = Math.round((n / totCur) * 100);
    const before = totPrev ? Math.round(((basisPrev.get(name) ?? 0) / totPrev) * 100) : null;
    return { name, pct, delta: before === null ? "new" : sign(pct - before, "%") };
  });

  // Activity buckets (local time).
  const local = (t: number) => t - tzOffsetMin * 60000;
  let days: { day: string; n: number }[] = [];
  if (range === "week") {
    const startOfToday = Math.floor(local(now) / DAY) * DAY;
    days = Array.from({ length: 7 }, (_, i) => {
      const d0 = startOfToday - (6 - i) * DAY;
      return { day: new Date(d0).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }), n: cur.filter((o) => local(o.t) >= d0 && local(o.t) < d0 + DAY).length };
    });
  } else {
    days = Array.from({ length: 4 }, (_, i) => ({ day: `Wk ${i + 1}`, n: 0 }));
    for (const o of cur) days[Math.min(3, Math.floor(((o.t - from) / (span * DAY)) * 4))].n++;
  }
  const top = days.reduce((a, b) => (b.n > a.n ? b : a), days[0]);
  const hours = Array.from({ length: 24 }, () => 0);
  for (const o of cur) hours[Math.floor((local(o.t) % DAY) / 3600000)]++;
  let peak: string | null = null;
  if (cur.length >= 5) {
    let best = 0, bestSum = -1;
    for (let h = 0; h < 24; h++) { const sum = hours[h] + hours[(h + 1) % 24]; if (sum > bestSum) { best = h; bestSum = sum; } }
    const [a, am] = hour12(best), [b, bm] = hour12(best + 2);
    peak = am === bm ? `${a} and ${b} ${bm}` : `${a} ${am} and ${b} ${bm}`;
  }

  const topFolders = new Set(interests.slice(0, 2).map((i) => i.name));
  const openCount = new Map<string, number>();
  for (const o of cur) openCount.set(o.m, (openCount.get(o.m) ?? 0) + 1);
  const everOpened = new Set(opens.map((o) => o.m));
  const gems = marks
    .filter((m) => m.savedAt && m.savedAt < now - 30 * DAY && !everOpened.has(m.id))
    .sort((a, b) => Number(topFolders.has(folderOf2(b))) - Number(topFolders.has(folderOf2(a))) || a.savedAt - b.savedAt)
    .slice(0, 3)
    .map((m) => ({ id: m.id, title: m.title, why: topFolders.has(folderOf2(m)) ? `Matches your ${folderOf2(m)} reading` : `Saved ${Math.floor((now - m.savedAt) / DAY)} days ago` }));
  function folderOf2(m: Mark) { return m.folderId ? lib.folders[m.folderId]?.name ?? OTHER : OTHER; }

  const unsorted = marks.filter((m) => !m.folderId).length;
  const tips: { title: string; why: string; action: string; to: { view?: string; open?: string } }[] = [];
  const oldestLater = [...later].sort((a, b) => a.savedAt - b.savedAt)[0];
  if (oldestLater) tips.push({ title: oldestLater.title, why: `In Read later since ${Math.max(1, Math.floor((now - oldestLater.savedAt) / DAY))}d`, action: "Open", to: { open: oldestLater.id } });
  if (unsorted) tips.push({ title: `File ${unsorted} unsorted bookmark${unsorted === 1 ? "" : "s"}`, why: "They aren't in a folder yet", action: "Review", to: { view: "all" } });
  if (lib.import.duplicates) tips.push({ title: `${lib.import.duplicates} duplicate${lib.import.duplicates === 1 ? "" : "s"} were skipped`, why: "Found while importing", action: "Review", to: { view: "all" } });
  if (gems[0]) tips.push({ title: gems[0].title, why: gems[0].why, action: "Open", to: { open: gems[0].id } });

  return {
    range,
    kpis: [
      { value: String(savedCur), label: "Pages saved", delta: `${sign(savedCur - savedPrev)} vs last ${label}` },
      { value: String(cur.length), label: "Saved pages opened", delta: openedDelta === null ? `Nothing to compare yet` : `${sign(openedDelta, "%")} vs last ${label}` },
      { value: marks.length ? `${Math.round((marks.filter((m) => m.folderId && !m.moved).length / marks.length) * 100)}%` : "–", label: "Saves AI filed for you", delta: `You changed ${marks.filter((m) => m.moved).length}` },
      { value: String(later.length), label: "Waiting in Read later", delta: `${later.filter((m) => topFolders.has(folderOf2(m))).length} match your interests` },
    ],
    interests,
    days,
    busiest: cur.length ? `Busiest: ${top.day}` : "No opens yet",
    peak,
    tips: tips.slice(0, 4),
    rising: interests.filter((i) => i.delta.startsWith("+")).slice(0, 4).map((i) => ({ name: i.name, note: i.delta })),
    top: [...openCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, n], i) => ({ id, rank: i + 1, title: byId.get(id)!.title, n })),
    gems,
    empty: marks.length === 0,
    filedLeft: unsorted + lib.import.duplicates,
  };
}
