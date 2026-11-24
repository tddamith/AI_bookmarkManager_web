"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/portal/empty-state";
import type { TidyData, TidyMerge, TidySuggestion } from "@/lib/tidy";

type Move = { id: string; to: string };
type Undo = { at: number; items: { id: string; from: string | null }[] };

const stamp = () => Date.now();
const UNDO_KEY = "tidypin:tidy-undo";
const DAYS_30 = 30 * 86_400_000;
const btn = "h-9 shrink-0 cursor-pointer rounded-full border-[1.5px] border-ink bg-transparent px-4 text-[13px] text-ink hover:bg-white disabled:cursor-default disabled:opacity-50";
const solid = "h-9 shrink-0 cursor-pointer rounded-full border-0 bg-ink px-4 text-[13px] font-medium text-white hover:bg-ink-muted disabled:cursor-default disabled:opacity-50";

function readUndo(): Undo | null {
  try {
    const u = JSON.parse(localStorage.getItem(UNDO_KEY) ?? "null") as Undo | null;
    return u && Array.isArray(u.items) && u.items.length && Date.now() - u.at < DAYS_30 ? u : null;
  } catch { return null; }
}
function writeUndo(u: Undo | null) {
  try { if (u) localStorage.setItem(UNDO_KEY, JSON.stringify(u)); else localStorage.removeItem(UNDO_KEY); } catch { /* storage unavailable */ }
}

const patch = (id: string, folderName: string | null) =>
  fetch(`/api/library/bookmarks/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ folderName }) }).then((r) => r.ok).catch(() => false);

export function TidyView({ onChanged, onBrowse }: { onChanged: () => void; onBrowse: () => void }) {
  const [data, setData] = useState<TidyData | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [undo, setUndo] = useState<Undo | null>(readUndo);
  const [checkedAt, setCheckedAt] = useState(0);
  const [picked, setPicked] = useState<Record<string, string>>({}); // user-chosen folder per bookmark

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/library/tidy", { cache: "no-store" });
      if (res.status === 401) { window.dispatchEvent(new Event("tidypin:unauth")); return; }
      if (!res.ok) throw new Error();
      setData((await res.json()) as TidyData); setFailed(false); setCheckedAt(Date.now());
    } catch { setFailed(true); }
  }, []);

  useEffect(() => {
    let live = true;
    void fetch("/api/library/tidy", { cache: "no-store" })
      .then(async (res) => {
        if (!live) return;
        if (res.status === 401) { window.dispatchEvent(new Event("tidypin:unauth")); return; }
        if (!res.ok) { setFailed(true); return; }
        setData((await res.json()) as TidyData); setFailed(false); setCheckedAt(Date.now());
      })
      .catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, []);

  const target = (s: TidySuggestion) => picked[s.id] ?? s.suggest?.name ?? null;

  /** Applies moves, remembers where each bookmark was so "Undo last tidy-up" can put it back. */
  async function apply(moves: Move[], fromOf: (id: string) => string | null, label: string) {
    if (!moves.length || busy) return;
    setBusy(true); setMsg(null);
    const ok = await Promise.all(moves.map((m) => patch(m.id, m.to)));
    const done = moves.filter((_, i) => ok[i]);
    if (done.length) {
      const u = { at: stamp(), items: done.map((m) => ({ id: m.id, from: fromOf(m.id) })) };
      writeUndo(u); setUndo(u);
    }
    setMsg(done.length === moves.length ? `${label}: ${done.length} ${done.length === 1 ? "bookmark" : "bookmarks"} updated.` : `${done.length} of ${moves.length} updated. The rest didn't save — try again.`);
    setBusy(false);
    await load(); onChanged();
  }

  async function revert() {
    if (!undo || busy) return;
    setBusy(true); setMsg(null);
    const ok = await Promise.all(undo.items.map((i) => patch(i.id, i.from)));
    const left = undo.items.filter((_, i) => !ok[i]);
    const u = left.length ? { ...undo, items: left } : null;
    writeUndo(u); setUndo(u);
    setMsg(left.length ? `${undo.items.length - left.length} restored; ${left.length} couldn't be.` : "Last tidy-up undone.");
    setBusy(false);
    await load(); onChanged();
  }

  const acceptOne = (s: TidySuggestion) => { const to = target(s); if (to) void apply([{ id: s.id, to }], () => null, "Filed"); };
  function change(s: TidySuggestion) {
    const to = window.prompt("File this bookmark in which folder? (new names create a folder)", target(s) ?? "");
    if (to?.trim()) { setPicked((p) => ({ ...p, [s.id]: to.trim() })); void apply([{ id: s.id, to: to.trim() }], () => null, "Filed"); }
  }
  const unsortedMoves = (data?.unsorted ?? []).flatMap((s) => { const to = target(s); return to ? [{ id: s.id, to }] : []; });
  const mergeMoves = (m: TidyMerge): Move[] => m.ids.map((id) => ({ id, to: m.into }));
  // Where each merged bookmark came from, so Undo restores the original folder.
  const mergeOrigin = new Map<string, string>();
  for (const m of data?.merges ?? []) { let i = 0; for (const f of m.from) for (let k = 0; k < f.count; k++) mergeOrigin.set(m.ids[i++], f.name); }

  const total = unsortedMoves.length + (data?.merges.reduce((n, m) => n + m.ids.length, 0) ?? 0);
  function fixAll() {
    const moves = [...unsortedMoves, ...(data?.merges.flatMap(mergeMoves) ?? [])];
    void apply(moves, (id) => mergeOrigin.get(id) ?? null, "Tidied");
  }

  const stats = [
    { n: data?.unsortedTotal ?? 0, label: "unsorted to file" },
    { n: data?.merges.length ?? 0, label: "folders to merge" },
    { n: data?.duplicates ?? 0, label: "duplicates skipped on import" },
    { n: data?.dead ?? 0, label: "dead links found on import" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[44px] font-normal leading-[1.02] tracking-[-0.035em]">AI tidy-up</h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            {data ? `Checked ${data.checked.toLocaleString("en-US")} ${data.checked === 1 ? "bookmark" : "bookmarks"}${checkedAt ? " just now" : ""} · nothing changes until you approve` : "Checking your library…"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!undo || busy} onClick={() => void revert()} className={btn}>Undo last tidy-up</button>
          <button type="button" disabled={total === 0 || busy} onClick={fixAll} className={solid}>{total ? `Fix all ${total}` : "Fix all"}</button>
        </div>
      </div>

      {failed && <p role="alert" className="m-0 border-l-2 border-ink bg-white px-3 py-2 text-sm">We couldn&apos;t check your library. <button type="button" onClick={() => void load()} className="cursor-pointer underline">Try again</button></p>}
      {msg && <p role="status" className="m-0 rounded-[14px] bg-lime px-4 py-2.5 text-sm">{msg}</p>}

      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] border-y border-ink">
        {stats.map((s, i) => (
          <div key={s.label} className={`py-3 ${i ? "border-l border-ink pl-4" : ""}`}>
            <dd className="m-0 text-[32px] tracking-[-0.03em]">{data ? s.n : "–"}</dd>
            <dt className="text-xs text-ink-muted">{s.label}</dt>
          </div>
        ))}
      </dl>

      {data && data.unsortedTotal === 0 && data.merges.length === 0 && (
        <EmptyState kind="tidy" kicker="AI tidy-up" title="All tidy."
          body="No unsorted saves or overlapping folders right now. As you save new pages, Tidypin checks again and suggests fixes here first."
          primary={{ label: "Back to my library", onClick: onBrowse, arrow: true }} secondary={{ label: "Check again", onClick: () => void load() }}
          footnote="Nothing is ever changed without your yes." />
      )}

      {data && data.merges.length > 0 && (
        <section className="flex flex-col rounded-[22px] bg-white p-5" aria-label="Folders to merge">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <div><h2 className="text-base font-medium">Folders to merge</h2><p className="text-xs text-ink-muted">Same name, different spelling</p></div>
            <button type="button" disabled={busy} onClick={() => void apply(data.merges.flatMap(mergeMoves), (id) => mergeOrigin.get(id) ?? null, "Merged")} className={solid}>Merge {data.merges.length}</button>
          </div>
          {data.merges.map((m) => (
            <div key={m.into} className="flex min-h-14 flex-wrap items-center gap-3 border-t border-ink/15 py-2">
              <span className="min-w-0 flex-[1_1_220px] text-[15px]">{m.from.map((f) => f.name).join(", ")} → <strong className="font-medium">{m.into}</strong>
                <span className="block text-xs text-ink-muted">Moves {m.ids.length} {m.ids.length === 1 ? "bookmark" : "bookmarks"}</span></span>
              <button type="button" disabled={busy} onClick={() => void apply(mergeMoves(m), (id) => mergeOrigin.get(id) ?? null, "Merged")} className={btn}>Merge</button>
            </div>
          ))}
        </section>
      )}

      {data && data.unsortedTotal > 0 && (
        <section className="flex flex-col rounded-[22px] bg-white p-5" aria-label="Unsorted bookmarks">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <div><h2 className="text-base font-medium">Unsorted</h2><p className="text-xs text-ink-muted">AI picked the best folder for each</p></div>
            <button type="button" disabled={busy || unsortedMoves.length === 0} onClick={() => void apply(unsortedMoves, () => null, "Filed")} className={solid}>Accept {unsortedMoves.length}</button>
          </div>
          {data.unsorted.map((s) => {
            const to = target(s);
            return (
              <div key={s.id} className="flex min-h-14 flex-wrap items-center gap-3 border-t border-ink/15 py-2">
                <span className="min-w-0 flex-[1_1_220px] text-[15px]"><span className="block truncate">{s.title}</span><span className="block text-xs text-ink-muted">{s.domain}</span></span>
                <span className="min-w-0 flex-[0_1_240px] text-[13px]">{to ? <>→ <strong className="font-medium">{to}</strong>{!picked[s.id] && s.suggest && <span className="block text-xs text-ink-muted">{s.suggest.why}</span>}</> : <span className="text-ink-muted">No clear match — pick a folder</span>}</span>
                <span className="flex gap-2">
                  {to && <button type="button" disabled={busy} onClick={() => acceptOne(s)} className={solid}>Accept</button>}
                  <button type="button" disabled={busy} onClick={() => change(s)} className={btn}>Change</button>
                </span>
              </div>
            );
          })}
          {data.unsortedTotal > data.unsorted.length && <p className="border-t border-ink/15 pt-3 text-[13px] text-ink-muted">Showing {data.unsorted.length} of {data.unsortedTotal}. Accept these and the next ones appear.</p>}
        </section>
      )}

      {!(data && data.unsortedTotal === 0 && data.merges.length === 0) && <p className="text-[13px] text-ink-muted">Undo reverses your last tidy-up for 30 days on this device.</p>}
    </div>
  );
}
