"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/empty-state";
import { SiteIcon } from "@/components/portal/site-icon";
import type { Bookmark, LibraryData } from "@/components/portal/types";

type Sort = "opened" | "recent" | "name";

export function FavoritesView({ lib, rows: all, activeId, onActive, onOpen, onChanged, onBrowse }: {
  lib: LibraryData | null;
  rows: Bookmark[];
  activeId: string | null;
  onActive: (id: string) => void;
  onOpen: (id: string) => void | Promise<void>;
  onChanged: () => void;
  onBrowse: () => void;
}) {
  const [sort, setSort] = useState<Sort>("opened");
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  // `all` can still hold the previous tab's rows while the new list loads, so only ever show real favorites.
  const rows = useMemo(() => all.filter((b) => b.fav && !gone.has(b.id)), [all, gone]);

  const list = useMemo(() => {
    const out = [...rows];
    if (sort === "opened") out.sort((a, b) => b.opens - a.opens || b.savedAt - a.savedAt);
    else if (sort === "name") out.sort((a, b) => a.title.localeCompare(b.title));
    else out.sort((a, b) => b.savedAt - a.savedAt);
    return out;
  }, [rows, sort]);

  const top = useMemo(() => [...rows].sort((a, b) => b.opens - a.opens)[0], [rows]);
  const topId = top && top.opens > 0 ? top.id : null;

  async function unstar(b: Bookmark) {
    setBusy(true); setFailed(false);
    const res = await fetch(`/api/library/bookmarks/${b.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ fav: false }) }).catch(() => null);
    setBusy(false);
    if (res?.ok) setGone((g) => new Set(g).add(b.id)); else setFailed(true);
    onChanged();
  }

  if (lib && lib.counts.fav === 0) {
    return (
      <div className="flex grow flex-col gap-5">
        <div>
          <h1 className="text-[44px] font-normal leading-[1.02] tracking-[-0.035em]">Favorites</h1>
          <p className="mt-1 text-[13px] text-ink-muted">0 favorites</p>
        </div>
        <EmptyState kind="favorites" kicker="Favorites" title="No favorites yet."
          body="Star a bookmark to pin it here, so the pages you open every day are always one click away."
          primary={{ label: "Go to All bookmarks", onClick: onBrowse, arrow: true }} footnote="You can also star a page from the side panel while you’re on it." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[44px] font-normal leading-[1.02] tracking-[-0.035em]">Favorites</h1>
          <p className="mt-1 text-[13px] text-ink-muted">{lib ? rows.length : 0} starred</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="fav-sort" className="text-[13px] text-ink-muted">Sort —</label>
          <select id="fav-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 cursor-pointer rounded-full border-[1.5px] border-ink bg-transparent px-4 text-sm text-ink">
            <option value="opened">Most opened</option>
            <option value="recent">Recently saved</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      {failed && <p role="alert" className="m-0 border-l-2 border-ink bg-white px-3 py-2 text-sm">We couldn&apos;t update that favorite. Try again.</p>}

      {top && topId && (
        <p className="m-0 rounded-[20px] bg-white px-[18px] py-3.5 text-sm">
          You open <strong className="font-medium">{top.title}</strong> the most — {top.opens} {top.opens === 1 ? "time" : "times"}.
        </p>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        {list.map((b) => (
          <article key={b.id} className={`flex min-h-[220px] flex-col gap-3 rounded-[22px] border-[1.5px] p-5 ${b.id === topId ? "bg-lime" : "bg-white"} ${b.id === activeId ? "border-ink" : "border-transparent"}`}>
            <div className="flex items-center justify-between">
              <span className="flex size-[46px] items-center justify-center rounded-[10px] border border-[#D9D9D5] bg-white"><SiteIcon domain={b.domain} size={26} /></span>
              <button type="button" disabled={busy} aria-label={`Remove ${b.title} from favorites`} onClick={() => void unstar(b)} className="flex size-[34px] cursor-pointer items-center justify-center rounded-full border-0 bg-transparent hover:bg-black/5 disabled:opacity-50">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#111" stroke="#111" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
              </button>
            </div>
            <button type="button" onClick={() => onActive(b.id)} aria-pressed={b.id === activeId} className="cursor-pointer border-0 bg-transparent p-0 text-left text-xl leading-[1.15] tracking-[-0.02em] text-ink">{b.title}</button>
            <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink pt-2.5 text-xs">
              <span className="min-w-0 truncate">{b.folder} · {b.domain}</span>
              <button type="button" onClick={() => void onOpen(b.id)} className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-xs text-ink underline">Opened {b.opens}× ↗</button>
            </div>
          </article>
        ))}
      </div>

      {lib && list.length === 0 && <p className="py-10 text-base text-ink-muted">No favorites yet. Star a bookmark and it will show up here.</p>}
    </div>
  );
}
