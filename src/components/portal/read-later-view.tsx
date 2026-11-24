"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/portal/empty-state";
import { SparkIcon } from "@/components/ui/icons";
import { SiteIcon } from "@/components/portal/site-icon";
import { ago, type Bookmark, type LibraryData } from "@/components/portal/types";

type Sort = "newest" | "oldest" | "unopened";

const DAY = 86_400_000;
const outline = "h-10 cursor-pointer rounded-full border-[1.5px] border-ink bg-transparent px-4 text-[13px] text-ink hover:bg-white disabled:cursor-default disabled:opacity-50";

export function ReadLaterView({ lib, rows: all, activeId, onActive, onOpen, onChanged, onBrowse }: {
  lib: LibraryData | null;
  rows: Bookmark[];
  activeId: string | null;
  onActive: (id: string) => void;
  onOpen: (id: string) => void | Promise<void>;
  onChanged: () => void;
  onBrowse: () => void;
}) {
  const [sort, setSort] = useState<Sort>("newest");
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  // `all` can still hold the previous tab's rows while the new list loads, so only ever show real read-later items.
  const rows = useMemo(() => all.filter((b) => b.later && !gone.has(b.id)), [all, gone]);
  const now = lib?.fetchedAt ?? 0;

  const list = useMemo(() => {
    const out = [...rows];
    if (sort === "oldest") out.sort((a, b) => a.savedAt - b.savedAt);
    else if (sort === "unopened") out.sort((a, b) => a.opens - b.opens || b.savedAt - a.savedAt);
    else out.sort((a, b) => b.savedAt - a.savedAt);
    return out;
  }, [rows, sort]);

  const next = useMemo(() => {
    const pool = rows.filter((b) => !skipped.has(b.id));
    const rank = (b: Bookmark) => (b.opens === 0 ? 2 : 0) + (b.summary.trim() ? 1 : 0);
    return [...pool].sort((a, b) => rank(b) - rank(a) || b.savedAt - a.savedAt)[0] ?? null;
  }, [rows, skipped]);

  const stats = [
    { n: lib?.counts.later ?? rows.length, label: "waiting" },
    { n: rows.filter((b) => b.opens === 0).length, label: "never opened" },
    { n: rows.filter((b) => b.summary.trim()).length, label: "with AI summary" },
    { n: rows.filter((b) => now - b.savedAt > 30 * DAY).length, label: "older than a month" },
  ];

  async function markRead(items: Bookmark[]) {
    setBusy(true); setFailed(false);
    const results = await Promise.all(items.map((b) => fetch(`/api/library/bookmarks/${b.id}`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ later: false }),
    }).then((r) => r.ok).catch(() => false)));
    const done = items.filter((_, i) => results[i]).map((b) => b.id);
    if (done.length) setGone((g) => new Set([...g, ...done]));
    if (done.length < items.length) setFailed(true);
    setBusy(false);
    onChanged();
  }
  function markAll() {
    if (rows.length && window.confirm(`Mark ${rows.length} ${rows.length === 1 ? "bookmark" : "bookmarks"} as read? They stay in your library.`)) void markRead(rows);
  }

  if (lib && lib.counts.later === 0) {
    return (
      <div className="flex grow flex-col gap-5">
        <div>
          <h1 className="text-[44px] font-normal leading-[1.02] tracking-[-0.035em]">Read later</h1>
          <p className="mt-1 text-[13px] text-ink-muted">Nothing waiting</p>
        </div>
        <EmptyState kind="later" kicker="Read later" title="Nothing waiting."
          body="Saving a page for later from the side panel puts it here. When you finish it, it moves back to your library."
          primary={{ label: "Browse your library", onClick: onBrowse, arrow: true }} footnote="You're all caught up." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[44px] font-normal leading-[1.02] tracking-[-0.035em]">Read later</h1>
          <p className="mt-1 text-[13px] text-ink-muted">{rows.length} waiting</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="rl-sort" className="text-[13px] text-ink-muted">Sort —</label>
          <select id="rl-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 cursor-pointer rounded-full border-[1.5px] border-ink bg-transparent px-4 text-sm text-ink">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="unopened">Never opened first</option>
          </select>
          <button type="button" disabled={busy || rows.length === 0} onClick={markAll} className={outline}>Mark all read</button>
        </div>
      </div>

      {failed && <p role="alert" className="m-0 border-l-2 border-ink bg-white px-3 py-2 text-sm">We couldn&apos;t update some bookmarks. Try again.</p>}

      {next && (
        <div className="flex flex-wrap items-center gap-5 rounded-3xl bg-lime px-6 py-[22px]">
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-1.5">
            <p className="flex items-center gap-1.5 text-[13px] font-medium"><SparkIcon size={14} />Best next read —</p>
            <p className="text-[26px] leading-[1.1] tracking-[-0.02em]">{next.title}</p>
            <p className="text-sm text-[#2A2A2A]">{next.domain} · {next.summary.trim() || `Saved ${ago(next.savedAt, now)} ago`}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => void onOpen(next.id)} className="inline-flex h-12 cursor-pointer items-center rounded-3xl border-0 bg-ink px-[22px] text-[15px] font-medium text-white hover:bg-ink-muted">Read now</button>
            {rows.length > 1 && (
              <button type="button" onClick={() => setSkipped((s) => new Set(s).add(next.id))} className="h-12 cursor-pointer rounded-3xl border-[1.5px] border-ink bg-transparent px-[18px] text-sm text-ink hover:bg-white/40">Later</button>
            )}
          </div>
        </div>
      )}

      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] border-y border-ink">
        {stats.map((s, i) => (
          <div key={s.label} className={`py-3 ${i ? "border-l border-ink pl-4" : ""}`}>
            <dd className="m-0 text-[32px] tracking-[-0.03em]">{s.n}</dd>
            <dt className="text-xs text-ink-muted">{s.label}</dt>
          </div>
        ))}
      </dl>

      <section className="flex flex-col">
        <div className="flex h-9 items-center border-b border-ink text-[13px]"><span className="font-medium">Waiting —</span></div>
        {list.map((b) => {
          return (
            <div key={b.id} className={`flex min-h-16 flex-wrap items-center gap-3.5 border-b border-ink/15 px-2 py-2 ${b.id === activeId ? "bg-white" : "hover:bg-white/60"}`}>
              <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] border border-[#D9D9D5] bg-white" aria-hidden="true">
                <SiteIcon domain={b.domain} size={20} />
              </span>
              <button type="button" onClick={() => onActive(b.id)} aria-pressed={b.id === activeId} className="flex min-w-0 flex-[1_1_220px] cursor-pointer flex-col gap-[3px] border-0 bg-transparent p-0 text-left text-ink">
                <span className="w-full truncate text-[15px]">{b.title}</span>
                <span className="w-full truncate text-xs text-ink-muted"><span className="font-medium text-ink">{b.domain}</span>{b.summary && ` · ${b.summary}`}</span>
              </button>
              <span className="w-24 shrink-0 text-xs text-ink-muted max-sm:hidden">Saved {ago(b.savedAt, now)} ago</span>
              <span className="w-24 shrink-0 text-xs max-md:hidden">{b.opens === 0 ? "Never opened" : `Opened ${b.opens}×`}</span>
              <button type="button" onClick={() => void onOpen(b.id)} className="h-8 shrink-0 cursor-pointer rounded-2xl border-0 bg-ink px-3.5 text-xs text-white hover:bg-ink-muted">Read</button>
              <button type="button" disabled={busy} onClick={() => void markRead([b])} className="h-8 shrink-0 cursor-pointer rounded-2xl border-[1.5px] border-ink bg-transparent px-3.5 text-xs text-ink hover:bg-white disabled:opacity-50">Mark read</button>
            </div>
          );
        })}
        {lib && list.length === 0 && <p className="py-10 text-base text-ink-muted">Nothing waiting. Mark a bookmark “Read later” and it will show up here.</p>}
      </section>

      <p className="text-[13px] text-ink-muted">Items you finish stay in your library. Nothing here is ever deleted for you.</p>
    </div>
  );
}
