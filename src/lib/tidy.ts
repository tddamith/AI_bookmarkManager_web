import type { Source } from "@/lib/library-store";

/**
 * "AI tidy-up" suggestions, computed from the library as it stands. Nothing is changed here; the portal applies
 * accepted suggestions one bookmark at a time through PATCH /api/library/bookmarks/:id.
 */
export type TidySuggestion = { id: string; title: string; domain: string; suggest: { name: string; why: string } | null };
export type TidyMerge = { into: string; from: { name: string; count: number }[]; ids: string[] };
export type TidyData = {
  checked: number;
  duplicates: number;
  dead: number;
  unsorted: TidySuggestion[];
  unsortedTotal: number;
  merges: TidyMerge[];
};

const domainOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; } };
const STOP = new Set(["the", "and", "for", "with", "how", "your", "you", "from", "that", "this", "what", "are", "was", "into", "guide", "page"]);
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w));
/** "Dev Tools", "dev-tool" and "devtools" all collapse to the same key. */
const key = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/s$/, "");
const MAX_ROWS = 50;

export function tidyData(src: Source): TidyData {
  const name = (id: string | null) => (id ? src.folders[id]?.name ?? id : null);
  const filed = src.marks.filter((m) => m.folderId && name(m.folderId));
  const loose = src.marks.filter((m) => !m.folderId);

  // Per folder: how often each domain / tag / title word shows up. Used to pick the best home for a loose bookmark.
  const profile = new Map<string, { domains: Map<string, number>; tags: Map<string, number>; words: Map<string, number>; size: number }>();
  for (const m of filed) {
    const f = name(m.folderId)!;
    const p = profile.get(f) ?? { domains: new Map(), tags: new Map(), words: new Map(), size: 0 };
    p.size++;
    const d = domainOf(m.url);
    p.domains.set(d, (p.domains.get(d) ?? 0) + 1);
    for (const t of m.tags) p.tags.set(t, (p.tags.get(t) ?? 0) + 1);
    for (const w of new Set(words(m.title))) p.words.set(w, (p.words.get(w) ?? 0) + 1);
    profile.set(f, p);
  }

  const unsorted: TidySuggestion[] = [...loose].sort((a, b) => b.savedAt - a.savedAt).slice(0, MAX_ROWS).map((m) => {
    const d = domainOf(m.url);
    const ws = new Set(words(m.title));
    let best: { name: string; score: number; why: string } | null = null;
    for (const [f, p] of profile) {
      const sameSite = p.domains.get(d) ?? 0;
      const tagHits = m.tags.filter((t) => p.tags.has(t));
      const wordHits = [...ws].filter((w) => (p.words.get(w) ?? 0) >= 2);
      const score = sameSite * 3 + tagHits.length * 2 + wordHits.length * 0.5 + (sameSite || tagHits.length || wordHits.length ? Math.log10(p.size + 1) * 0.1 : 0);
      if (score <= 0) continue;
      const why = sameSite ? `${d} is already in ${f}` : tagHits.length ? `Tagged #${tagHits[0]}, like ${f}` : `Similar to pages in ${f}`;
      if (!best || score > best.score) best = { name: f, score, why };
    }
    return { id: m.id, title: m.title, domain: d, suggest: best ? { name: best.name, why: best.why } : null };
  });

  // Folders whose names differ only by case, punctuation or a trailing "s".
  const groups = new Map<string, Map<string, string[]>>();
  for (const m of filed) {
    const f = name(m.folderId)!;
    const g = groups.get(key(f)) ?? new Map<string, string[]>();
    g.set(f, [...(g.get(f) ?? []), m.id]);
    groups.set(key(f), g);
  }
  const merges: TidyMerge[] = [];
  for (const g of groups.values()) {
    if (g.size < 2) continue;
    const ordered = [...g.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const [into] = ordered[0];
    const rest = ordered.slice(1);
    merges.push({ into, from: rest.map(([n, ids]) => ({ name: n, count: ids.length })), ids: rest.flatMap(([, ids]) => ids) });
  }

  return { checked: src.marks.length, duplicates: src.duplicates, dead: src.dead, unsorted, unsortedTotal: loose.length, merges };
}
