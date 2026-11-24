"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/empty-state";
import { SiteIcon } from "@/components/portal/site-icon";
import { ago, type Bookmark, type LibraryData } from "@/components/portal/types";

type Sort = "recent" | "opened" | "name";
type Chip = string;

const PAGE = 50;
const DAY = 86_400_000;
const folderFills = ["#D4FA1E", "#A6C3DD", "#111111", "#C9B597", "#FFFFFF"];

const outline = "h-9 cursor-pointer rounded-full border-[1.5px] border-white bg-transparent px-4 text-[13px] text-white hover:bg-white/10";

function FolderGlyph({ fill, size = 14 }: { fill: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" fill={fill} stroke="#111111" strokeWidth="1.4" />
    </svg>
  );
}

function Tags({ tags, wrap }: { tags: string[]; wrap?: boolean }) {
  return (
    <span className={`flex gap-1 ${wrap ? "flex-wrap" : "w-[150px] shrink-0 overflow-hidden max-lg:hidden"}`}>
      {tags.map((t) => (
        <span key={t} className="inline-flex h-6 items-center whitespace-nowrap rounded-full border border-ink bg-white px-[9px] text-[11px]">#{t}</span>
      ))}
    </span>
  );
}

export function BookmarksView({ lib, rows, heading, searching, activeId, onActive, onChanged, onTidy, onAdd }: {
  lib: LibraryData | null;
  rows: Bookmark[];
  heading: string;
  searching: boolean;
  activeId: string | null;
  onActive: (id: string) => void;
  onChanged: () => void;
  onTidy: () => void;
  onAdd?: () => void;
}) {
  const [sort, setSort] = useState<Sort>("recent");
  const [mode, setMode] = useState<"list" | "grid">("list");
  const [chip, setChip] = useState<Chip>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState(false);

  const folderIndex = useMemo(() => new Map((lib?.folders ?? []).map((f, i) => [f.name, i])), [lib]);
  const fill = (name: string) => folderFills[(folderIndex.get(name) ?? 0) % folderFills.length];

  const topTags = useMemo(() => {
    const n = new Map<string, number>();
    for (const b of rows) for (const t of b.tags) n.set(t, (n.get(t) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t);
  }, [rows]);
  const chips: [Chip, string][] = [["all", "All"], ["unread", "Never opened"], ["summary", "Has AI summary"], ...topTags.map((t): [Chip, string] => [`tag:${t}`, `#${t}`])];
  const activeChip = chips.some(([id]) => id === chip) ? chip : "all";

  const list = useMemo(() => {
    let out = rows;
    if (activeChip === "unread") out = out.filter((b) => b.opens === 0);
    else if (activeChip === "summary") out = out.filter((b) => b.summary.trim());
    else if (activeChip.startsWith("tag:")) out = out.filter((b) => b.tags.includes(activeChip.slice(4)));
    if (sort === "opened") out = [...out].sort((a, b) => b.opens - a.opens || b.savedAt - a.savedAt);
    else if (sort === "name") out = [...out].sort((a, b) => a.title.localeCompare(b.title));
    return out;
  }, [rows, activeChip, sort]);

  const shown = list.slice(0, limit);
  const now = lib?.fetchedAt ?? 0;
  const groups = useMemo(() => {
    if (sort !== "recent") return [{ name: sort === "opened" ? "Most opened first" : "A to Z", items: shown }];
    const g = [{ name: "Today", items: [] as Bookmark[] }, { name: "This week", items: [] as Bookmark[] }, { name: "Earlier", items: [] as Bookmark[] }];
    for (const b of shown) g[now - b.savedAt < DAY ? 0 : now - b.savedAt < 7 * DAY ? 1 : 2].items.push(b);
    return g.filter((x) => x.items.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.length, sort, now, list]);

  const total = lib?.counts.all ?? rows.length;
  const filtered = searching || activeChip !== "all" || heading !== "All bookmarks";
  const count = filtered
    ? `${list.length} ${list.length === 1 ? "bookmark" : "bookmarks"}`
    : `${total.toLocaleString("en-US")} bookmarks · ${lib?.folders.length ?? 0} folders · ${rows.filter((b) => b.summary.trim()).length} with AI summaries`;

  const ids = [...picked].filter((id) => rows.some((b) => b.id === id));
  const toggle = (id: string) => setPicked((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleGroup = (items: Bookmark[], on: boolean) => setPicked((p) => { const n = new Set(p); items.forEach((b) => (on ? n.delete(b.id) : n.add(b.id))); return n; });

  async function each(fn: (b: Bookmark) => Promise<Response>) {
    setBusy(true);
    await Promise.allSettled(rows.filter((b) => picked.has(b.id)).map(fn));
    setBusy(false);
    setPicked(new Set());
    onChanged();
  }
  const patch = (b: Bookmark, body: object) => fetch(`/api/library/bookmarks/${b.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  function move() {
    const name = window.prompt("Move to which folder? (new names create a folder)", lib?.folders[0]?.name ?? "");
    if (name?.trim()) void each((b) => patch(b, { folderName: name.trim() }));
  }
  function addTags() {
    const raw = window.prompt("Add tags (comma separated)");
    const add = (raw ?? "").split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    if (add.length) void each((b) => patch(b, { tags: [...new Set([...b.tags, ...add])] }));
  }
  function del() {
    if (window.confirm(`Delete ${ids.length} ${ids.length === 1 ? "bookmark" : "bookmarks"}? This can't be undone.`)) void each((b) => fetch(`/api/library/bookmarks/${b.id}`, { method: "DELETE" }));
  }

  const vb = (on: boolean) => `flex h-[34px] w-9 cursor-pointer items-center justify-center rounded-full border-0 ${on ? "bg-ink text-white" : "bg-transparent text-ink"}`;
  const check = "m-0 size-[18px] shrink-0 cursor-pointer accent-ink";

  if (lib && lib.counts.all === 0 && !searching && heading === "All bookmarks") {
    return (
      <div className="flex grow flex-col gap-5">
        <div>
          <h1 className="text-[44px] font-normal leading-[1.02] tracking-[-0.035em]">All bookmarks</h1>
          <p className="mt-1 text-[13px] text-ink-muted">0 bookmarks</p>
        </div>
        <EmptyState kind="all" kicker="All bookmarks" title="No bookmarks yet."
          body="Everything you save lands here, newest first, each with a short AI summary so you remember why you kept it."
          primary={{ label: "Import bookmarks", href: "/import" }} secondary={onAdd ? { label: "Add a link", onClick: onAdd } : undefined}
          footnote="Importing only reads your browser bookmarks. Nothing there is moved or changed." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[44px] font-normal leading-[1.02] tracking-[-0.035em]">{heading}</h1>
          <p className="mt-1 text-[13px] text-ink-muted">{count}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="sort" className="text-[13px] text-ink-muted">Sort —</label>
          <div className="relative flex items-center">
            <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 cursor-pointer appearance-none rounded-full border-[1.5px] border-ink bg-transparent pl-4 pr-9 text-sm text-ink">
              <option value="recent">Recently saved</option>
              <option value="opened">Most opened</option>
              <option value="name">Name A–Z</option>
            </select>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="pointer-events-none absolute right-3.5"><path d="M6 9l6 6 6-6" /></svg>
          </div>
          <div role="group" aria-label="View" className="flex rounded-full border-[1.5px] border-ink p-[3px]">
            <button type="button" aria-pressed={mode === "list"} aria-label="List view" onClick={() => setMode("list")} className={vb(mode === "list")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <button type="button" aria-pressed={mode === "grid"} aria-label="Grid view" onClick={() => setMode("grid")} className={vb(mode === "grid")}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chips.map(([id, label]) => (
          <button key={id} type="button" aria-pressed={activeChip === id} onClick={() => { setChip(id); setLimit(PAGE); }}
            className={`h-9 cursor-pointer rounded-full border-[1.5px] border-ink px-3.5 text-[13px] ${activeChip === id ? "bg-ink text-white" : "bg-transparent text-ink hover:bg-white"}`}>{label}</button>
        ))}
      </div>

      {ids.length > 0 && (
        <div role="toolbar" aria-label="Selected bookmarks" className="flex flex-wrap items-center gap-2.5 rounded-[26px] bg-ink py-2.5 pl-5 pr-2.5 text-white">
          <span className="grow text-sm" aria-live="polite">{ids.length} {ids.length === 1 ? "bookmark" : "bookmarks"} selected</span>
          <button type="button" disabled={busy} onClick={move} className={outline}>Move to folder</button>
          <button type="button" disabled={busy} onClick={addTags} className={outline}>Add tags</button>
          <button type="button" onClick={onTidy} className="h-9 cursor-pointer rounded-full border-0 bg-lime px-4 text-[13px] font-medium text-ink hover:bg-lime-deep">AI sort these</button>
          <button type="button" disabled={busy} onClick={del} className={outline}>Delete</button>
          <button type="button" aria-label="Clear selection" onClick={() => setPicked(new Set())} className="flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-white/10">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      )}

      {mode === "list" ? (
        <div className="flex flex-col gap-5">
          {groups.map((g) => {
            const allOn = g.items.length > 0 && g.items.every((b) => picked.has(b.id));
            return (
              <section key={g.name} className="flex flex-col">
                <div className="flex h-9 items-center gap-3 border-b border-ink text-[13px]">
                  <input type="checkbox" aria-label={`Select all in ${g.name}`} checked={allOn} onChange={() => toggleGroup(g.items, allOn)} className={check} />
                  <span className="font-medium">{g.name} —</span>
                  <span className="text-ink-muted">{g.items.length}</span>
                </div>
                {g.items.map((b) => {
                  const on = picked.has(b.id);
                  return (
                    <div key={b.id} className={`flex min-h-16 items-center gap-3.5 border-b border-ink/15 px-2 ${on ? "bg-[#EEF8BE]" : b.id === activeId ? "bg-white" : "hover:bg-white/60"}`}>
                      <input type="checkbox" aria-label={`Select ${b.title}`} checked={on} onChange={() => toggle(b.id)} className={check} />
                      <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-[#D9D9D5] bg-white" aria-hidden="true">
                        <SiteIcon domain={b.domain} size={20} />
                      </span>
                      <button type="button" onClick={() => onActive(b.id)} aria-pressed={b.id === activeId} className="flex min-w-0 grow cursor-pointer flex-col gap-[3px] border-0 bg-transparent p-0 text-left text-ink">
                        <span className="w-full truncate text-[15px]">{b.title}</span>
                        <span className="w-full truncate text-xs text-ink-muted"><span className="font-medium text-ink">{b.domain}</span>{b.summary && ` · ${b.summary}`}</span>
                      </button>
                      <Tags tags={b.tags} />
                      <span className="flex w-[120px] shrink-0 items-center gap-1.5 text-[13px] max-sm:hidden"><FolderGlyph fill={fill(b.folder)} /><span className="truncate">{b.folder}</span></span>
                      <span className="w-11 shrink-0 text-right text-xs text-ink-muted">{ago(b.savedAt, now)}</span>
                      <button type="button" aria-label={`More actions for ${b.title}`} onClick={() => onActive(b.id)} className="flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-white">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#111" aria-hidden="true"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
                      </button>
                    </div>
                  );
                })}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {shown.map((b) => {
            const on = picked.has(b.id);
            return (
              <article key={b.id} className={`flex min-h-[230px] flex-col gap-2.5 rounded-[22px] border-[1.5px] p-[18px] ${on ? "border-ink bg-[#EEF8BE]" : "border-transparent bg-white"}`}>
                <div className="flex items-center justify-between">
                  <span className="flex size-[38px] items-center justify-center rounded-[10px] border border-[#D9D9D5] bg-white" aria-hidden="true">
                    <SiteIcon domain={b.domain} size={20} />
                  </span>
                  <input type="checkbox" aria-label={`Select ${b.title}`} checked={on} onChange={() => toggle(b.id)} className={check} />
                </div>
                <button type="button" onClick={() => onActive(b.id)} className="cursor-pointer border-0 bg-transparent p-0 text-left text-[17px] leading-[1.2] tracking-[-0.01em] text-ink">{b.title}</button>
                {b.summary && <p className="line-clamp-4 text-[13px] leading-[1.45] text-ink-muted">{b.summary}</p>}
                <Tags tags={b.tags} wrap />
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink pt-2.5 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5"><FolderGlyph fill={fill(b.folder)} size={13} /><span className="truncate">{b.folder}</span></span>
                  <span className="shrink-0 text-ink-muted">{b.domain} · {ago(b.savedAt, now)}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {lib && list.length === 0 && (
        <p className="py-10 text-base text-ink-muted">{searching || activeChip !== "all" ? "Nothing matches. Try another word or clear the filters." : "Nothing here yet."}</p>
      )}

      {list.length > shown.length && (
        <div className="flex justify-center pt-2">
          <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="h-[46px] cursor-pointer rounded-full border-[1.5px] border-ink bg-transparent px-6 text-sm text-ink hover:bg-white">
            Load more · showing {shown.length} of {list.length.toLocaleString("en-US")}
          </button>
        </div>
      )}
    </div>
  );
}
