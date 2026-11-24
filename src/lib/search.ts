/**
 * Search shared by the browser (instant suggestions from a light index) and the server (full search incl. AI summaries).
 * Pure functions only, so it can run in both places.
 */
export type Doc = { id: string; title: string; domain: string; folder: string; tags: string[]; summary: string; fav: boolean; later: boolean };
export type FolderInfo = { id: string; name: string; count: number };
export type SearchIndex = { docs: Doc[]; folders: FolderInfo[] };

export type Filter = { k: "site" | "tag" | "folder" | "is"; v: string };
export type Suggestions = {
  bookmarks: Doc[];
  sites: { domain: string; count: number }[];
  tags: { tag: string; count: number }[];
  folders: FolderInfo[];
};
export const EMPTY_SUGGESTIONS: Suggestions = { bookmarks: [], sites: [], tags: [], folders: [] };

export const GROUP_MAX = 4;

export const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
export const tokensOf = (q: string) => norm(q).split(/\s+/).filter(Boolean);
const wordsOf = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

/** Edit distance where swapping two neighbouring letters counts as one edit; false as soon as it must exceed `max`. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let older: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, older[j - 2] + 1);
      cur[j] = v;
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return false;
    older = prev;
    prev = cur;
  }
  return prev[b.length] <= max;
}
const tolerance = (t: string) => (t.length >= 8 ? 2 : t.length >= 4 ? 1 : 0);

/** How well one token matches one text field: prefix > word prefix > contains > small typo. */
function fieldScore(t: string, text: string, w: [number, number, number, number]): number {
  const s = norm(text);
  if (!s) return 0;
  if (s.startsWith(t)) return w[0];
  const words = wordsOf(text);
  if (words.some((x) => x.startsWith(t))) return w[1];
  if (s.includes(t)) return w[2];
  const tol = tolerance(t);
  if (tol && words.some((x) => within(t, x.slice(0, t.length), tol) || within(t, x, tol))) return w[3];
  return 0;
}

const TITLE: [number, number, number, number] = [100, 90, 70, 40];
const META: [number, number, number, number] = [60, 55, 45, 25];

/** 0 = no match. Every token must match somewhere (title, site, tags, folder, then summary). */
export function scoreDoc(d: Doc, tokens: string[]): number {
  let total = 0;
  for (const t of tokens) {
    let best = fieldScore(t, d.title, TITLE);
    best = Math.max(best, fieldScore(t, d.domain, META), fieldScore(t, d.folder, META));
    for (const tag of d.tags) best = Math.max(best, fieldScore(t, tag, META));
    if (!best && d.summary) best = norm(d.summary).includes(t) ? 20 : 0;
    if (!best) return 0;
    total += best;
  }
  return total;
}

export function applyFilters(docs: Doc[], filters: Filter[]): Doc[] {
  return docs.filter((d) =>
    filters.every((f) => {
      const v = norm(f.v);
      if (f.k === "site") return norm(d.domain) === v || norm(d.domain).endsWith(`.${v}`);
      if (f.k === "tag") return d.tags.some((t) => norm(t) === v);
      if (f.k === "folder") return norm(d.folder) === v;
      return v === "favorite" ? d.fav : v === "readlater" ? d.later : true;
    }),
  );
}

/** Full ranked bookmark list for a query (used by the main results page too). */
export function rank(docs: Doc[], query: string): Doc[] {
  const tokens = tokensOf(query);
  if (!tokens.length) return docs;
  return docs.map((d) => ({ d, s: scoreDoc(d, tokens) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.d);
}

const count = <T,>(items: T[], key: (x: T) => string | string[]) => {
  const m = new Map<string, number>();
  for (const it of items) for (const k of [key(it)].flat()) if (k) m.set(k, (m.get(k) ?? 0) + 1);
  return m;
};

export function suggest(docs: Doc[], query: string, filters: Filter[], folders: FolderInfo[]): Suggestions {
  const tokens = tokensOf(query);
  const scoped = applyFilters(docs, filters);
  if (!tokens.length) return { ...EMPTY_SUGGESTIONS, bookmarks: scoped.slice(0, GROUP_MAX) };

  const bookmarks = rank(scoped, query).slice(0, GROUP_MAX);
  const sites = [...count(docs, (d) => d.domain)].filter(([dom]) => tokens.every((t) => fieldScore(t, dom, META) > 0))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, GROUP_MAX).map(([domain, c]) => ({ domain, count: c }));
  const tags = [...count(docs, (d) => d.tags)].filter(([tag]) => tokens.every((t) => fieldScore(t, tag, META) > 0))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, GROUP_MAX).map(([tag, c]) => ({ tag, count: c }));
  const fs = folders.filter((f) => tokens.every((t) => fieldScore(t, f.name, META) > 0)).slice(0, GROUP_MAX);
  return { bookmarks, sites, tags, folders: fs };
}

export const isEmpty = (s: Suggestions) => !s.bookmarks.length && !s.sites.length && !s.tags.length && !s.folders.length;

/** Character ranges of `text` that match the query tokens (for bold highlighting), including small typos. */
export function highlightRanges(text: string, query: string): [number, number][] {
  const lower = text.toLowerCase();
  const out: [number, number][] = [];
  for (const t of query.toLowerCase().split(/\s+/).filter(Boolean)) {
    const i = lower.indexOf(t);
    if (i >= 0) { out.push([i, i + t.length]); continue; }
    const tol = tolerance(t);
    if (!tol) continue;
    for (const m of lower.matchAll(/[a-z0-9]+/g)) {
      const w = m[0];
      if (within(t, w.slice(0, t.length), tol) || within(t, w, tol)) { out.push([m.index!, m.index! + Math.min(w.length, t.length)]); break; }
    }
  }
  out.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const r of out) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

export const IS_VALUES = ["favorite", "readlater"] as const;
const OP_RE = /(^|\s)(site|tag|folder|is):(\S+)\s/i;

/** Pulls completed operators ("site:dribbble.com ") out of the typed text and returns them as chips. */
export function extractChips(raw: string): { text: string; chips: Filter[] } {
  const chips: Filter[] = [];
  let text = raw;
  for (let m = OP_RE.exec(text); m; m = OP_RE.exec(text)) {
    const k = m[2].toLowerCase() as Filter["k"];
    const v = m[3].replace(/^["']|["']$/g, "");
    if (k !== "is" || (IS_VALUES as readonly string[]).includes(v.toLowerCase())) chips.push({ k, v: k === "is" ? v.toLowerCase() : v });
    text = text.slice(0, m.index) + m[1] + text.slice(m.index + m[0].length);
  }
  return { text: chips.length ? text.replace(/^\s+/, "") : raw, chips };
}

/** An operator being typed right now, e.g. "site:dri" → { op: "site", value: "dri" }. */
export function partialOperator(text: string): { op: Filter["k"]; value: string } | null {
  const m = /(?:^|\s)(site|tag|folder|is):(\S*)$/i.exec(text);
  return m ? { op: m[1].toLowerCase() as Filter["k"], value: m[2] } : null;
}

export const filterLabel = (f: Filter) => (f.k === "is" ? `is:${f.v}` : `${f.k}:${f.v}`);
