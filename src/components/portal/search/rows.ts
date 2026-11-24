import type { Doc, FolderInfo, Filter, Suggestions } from "@/lib/search";
import { IS_VALUES } from "@/lib/search";

export type Row =
  | { kind: "bookmark"; key: string; doc: Doc }
  | { kind: "site"; key: string; domain: string; count: number }
  | { kind: "tag"; key: string; tag: string; count: number }
  | { kind: "folder"; key: string; folder: FolderInfo; tone: number }
  | { kind: "recent"; key: string; text: string }
  | { kind: "quick"; key: string; label: string; to: { view: "later" | "fav" } | { folder: FolderInfo; tone: number } }
  | { kind: "operator"; key: string; filter: Filter; count?: number; tone?: number }
  | { kind: "all"; key: string; text: string };

export type Section = { id: string; label: string; rows: Row[] };

export function emptySections(recent: string[], folders: FolderInfo[]): Section[] {
  const out: Section[] = [];
  if (recent.length) out.push({ id: "recent", label: "Recent searches", rows: recent.map((text) => ({ kind: "recent", key: `r:${text}`, text })) });
  out.push({
    id: "quick", label: "Quick filters",
    rows: [
      { kind: "quick", key: "q:later", label: "Read later", to: { view: "later" } },
      { kind: "quick", key: "q:fav", label: "Favorites", to: { view: "fav" } },
      ...folders.slice(0, 3).map((f, i): Row => ({ kind: "quick", key: `q:f:${f.id}`, label: f.name, to: { folder: f, tone: i } })),
    ],
  });
  return out;
}

export function typedSections(s: Suggestions, folders: FolderInfo[]): Section[] {
  const tone = (id: string) => Math.max(0, folders.findIndex((f) => f.id === id));
  return [
    { id: "bookmarks", label: "Bookmarks", rows: s.bookmarks.map((doc): Row => ({ kind: "bookmark", key: `b:${doc.id}`, doc })) },
    { id: "sites", label: "Sites", rows: s.sites.map((x): Row => ({ kind: "site", key: `s:${x.domain}`, ...x })) },
    { id: "tags", label: "Tags", rows: s.tags.map((x): Row => ({ kind: "tag", key: `t:${x.tag}`, ...x })) },
    { id: "folders", label: "Folders", rows: s.folders.map((f): Row => ({ kind: "folder", key: `f:${f.id}`, folder: f, tone: tone(f.id) })) },
  ].filter((g) => g.rows.length);
}

/** Value suggestions while an operator is being typed: site:dri → matching sites, etc. */
export function operatorSection(op: Filter["k"], value: string, s: Suggestions, folders: FolderInfo[]): Section {
  const v = value.toLowerCase();
  const rows: Row[] =
    op === "is" ? IS_VALUES.filter((x) => x.startsWith(v)).map((x) => ({ kind: "operator", key: `o:is:${x}`, filter: { k: "is", v: x } }))
    : op === "site" ? s.sites.map((x) => ({ kind: "operator", key: `o:site:${x.domain}`, filter: { k: "site", v: x.domain }, count: x.count }))
    : op === "tag" ? s.tags.map((x) => ({ kind: "operator", key: `o:tag:${x.tag}`, filter: { k: "tag", v: x.tag }, count: x.count }))
    : folders.filter((f) => f.name.toLowerCase().includes(v)).slice(0, 4).map((f, i) => ({ kind: "operator", key: `o:folder:${f.id}`, filter: { k: "folder", v: f.name }, count: f.count, tone: i }));
  return { id: "operator", label: op === "is" ? "Filter" : `${op[0].toUpperCase()}${op.slice(1)}s`, rows };
}
