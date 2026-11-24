"use client";

import { SparkIcon } from "@/components/ui/icons";
import { EmptyState } from "@/components/portal/empty-state";
import type { DashboardData } from "@/components/portal/types";
import { links } from "@/lib/site";

const card = "flex min-w-0 flex-col gap-3 rounded-[22px] p-5";

export function DashboardView({ data, onRange, onTip, onOpen }: {
  data: DashboardData | null;
  onRange: (r: "week" | "month") => void;
  onTip: (to: { view?: string; open?: string }) => void;
  onOpen: (id: string) => void;
}) {
  const range = data?.range ?? "week";
  const seg = (on: boolean) => `h-[30px] cursor-pointer rounded-full px-3.5 text-xs ${on ? "bg-ink text-white" : "text-ink"}`;
  const max = Math.max(1, ...(data?.days.map((d) => d.n) ?? [1]));
  const imax = Math.max(1, data?.interests[0]?.pct ?? 1);

  if (data?.empty) {
    return (
      <div className="flex grow flex-col gap-5">
        <div>
          <h1 className="text-[44px] font-normal leading-[1.02] tracking-[-0.035em]">Library</h1>
          <p className="mt-1 text-[13px] text-ink-muted">No bookmarks yet</p>
        </div>
        <EmptyState kind="library" kicker="Library" title="Your library is empty."
          body="Bring in the bookmarks you already have and Tidypin will sort them into folders for you. Or save your first page from the extension."
          primary={{ label: "Import bookmarks", href: "/import" }} secondary={{ label: "Get the extension", href: links.install }}
          footnote="Tip — press Alt + S on any page to save it. It shows up here in seconds." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[40px] font-normal leading-[1.02] tracking-[-0.035em]">Your {range} in bookmarks</h1>
          <p className="mt-1 text-[13px] text-ink-muted">What you saved, read and kept coming back to —</p>
        </div>
        <div role="group" aria-label="Time range" className="flex rounded-full border-[1.5px] border-ink p-[3px]">
          <button type="button" aria-pressed={range === "week"} onClick={() => onRange("week")} className={seg(range === "week")}>Week</button>
          <button type="button" aria-pressed={range === "month"} onClick={() => onRange("month")} className={seg(range === "month")}>Month</button>
        </div>
      </div>

      {!data ? (
        <p className="py-10 text-sm text-ink-muted" role="status">Loading your dashboard…</p>
      ) : (
        <>
          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] border-y border-ink">
            {data.kpis.map((k) => (
              <div key={k.label} className="flex flex-col gap-0.5 py-3.5 pr-4">
                <dd className="order-1 text-[40px] leading-none tracking-[-0.03em]">{k.value}</dd>
                <dt className="order-2 text-[13px]">{k.label}</dt>
                <dd className="order-3 text-xs text-ink-muted">{k.delta}</dd>
              </div>
            ))}
          </dl>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
            <section className={`${card} bg-white`} aria-label="What you're into">
              <div className="flex justify-between text-[13px]"><h2 className="font-medium">What you&apos;re into —</h2><span className="text-ink-muted">share of visits · change</span></div>
              {data.interests.map((i, idx) => (
                <div key={i.name} className="grid grid-cols-[76px_1fr_40px_46px] items-center gap-2.5 text-[13px]">
                  <span className="truncate">{i.name}</span>
                  <span className="h-3 rounded-md bg-ink/10"><span className={`block h-full rounded-md ${idx === 0 ? "bg-lime shadow-[inset_0_0_0_1px_#111]" : "bg-ink"}`} style={{ width: `${Math.round((i.pct / imax) * 100)}%` }} /></span>
                  <span className="text-right">{i.pct}%</span>
                  <span className="text-right text-ink-muted">{i.delta}</span>
                </div>
              ))}
            </section>
            <section className={`${card} bg-sky`} aria-label="Pages you opened">
              <div className="flex justify-between text-[13px]"><h2 className="font-medium">Pages you opened —</h2><span>{data.busiest}</span></div>
              <div className="grid h-[150px] items-end gap-2.5 border-b border-ink" style={{ gridTemplateColumns: `repeat(${data.days.length}, minmax(0, 1fr))` }}>
                {data.days.map((d) => (
                  <div key={d.day} className="flex h-full flex-col items-center justify-end gap-1">
                    <span className="text-[11px]">{d.n}</span>
                    <span className={`block w-full rounded-t-md ${d.n === max ? "bg-lime shadow-[inset_0_0_0_1px_#111]" : "bg-ink"}`} style={{ height: `${Math.max(2, Math.round((d.n / max) * 100))}px` }} />
                  </div>
                ))}
              </div>
              <div className="-mt-1 grid text-center text-xs" style={{ gridTemplateColumns: `repeat(${data.days.length}, minmax(0, 1fr))` }}>
                {data.days.map((d) => <span key={d.day}>{d.day}</span>)}
              </div>
              {data.peak && <p className="text-xs text-[#1F1F1F]">You read most between {data.peak}.</p>}
            </section>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
            <section className={`${card} bg-lime`}>
              <h2 className="flex items-center gap-1.5 text-[13px] font-medium"><SparkIcon size={14} />AI suggests for you —</h2>
              {data.tips.length === 0 && <p className="border-t border-ink pt-3 text-sm text-ink-soft">Nothing to suggest right now. You&apos;re all tidy.</p>}
              {data.tips.map((t) => (
                <div key={t.title} className="flex min-h-[54px] items-center gap-3 border-t border-ink">
                  <div className="min-w-0 grow"><p className="truncate text-sm">{t.title}</p><p className="text-xs text-ink-soft">{t.why}</p></div>
                  <button type="button" onClick={() => onTip(t.to)} className="h-[34px] shrink-0 cursor-pointer rounded-full bg-ink px-3.5 text-xs font-medium text-white hover:bg-ink-muted">{t.action}</button>
                </div>
              ))}
            </section>
            <section className={`${card} bg-white`}>
              <h2 className="text-[13px] font-medium">Rising interests —</h2>
              <div className="flex flex-wrap gap-1.5">
                {data.rising.length === 0 && <span className="text-sm text-ink-muted">Nothing rising yet.</span>}
                {data.rising.map((r) => (
                  <span key={r.name} className="inline-flex h-[30px] items-center gap-1.5 rounded-full border-[1.5px] border-ink px-3 text-[13px]">{r.name}<span className="text-[11px] text-ink-muted">{r.note}</span></span>
                ))}
              </div>
              <h2 className="mt-1.5 text-[13px] font-medium">Most opened —</h2>
              <ol className="m-0 flex list-none flex-col p-0">
                {data.top.length === 0 && <li className="border-t border-ink pt-3 text-sm text-ink-muted">Open a saved page to see it here.</li>}
                {data.top.map((p) => (
                  <li key={p.id} className="flex h-10 items-center gap-3 border-t border-ink text-sm">
                    <span className="w-5 text-xs">{p.rank}</span>
                    <button type="button" onClick={() => onOpen(p.id)} className="min-w-0 grow cursor-pointer truncate bg-transparent p-0 text-left hover:underline">{p.title}</button>
                    <span className="text-xs text-ink-muted">{p.n}×</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <section className={`${card} bg-sand`}>
            <div className="flex flex-wrap justify-between gap-2 text-[13px]"><h2 className="font-medium">Forgotten gems —</h2><span>Saved over a month ago, never opened, and they match what you read now</span></div>
            {data.gems.length === 0 ? (
              <p className="text-sm text-[#1F1F1F]">No forgotten gems yet. Older saves you never opened will show up here.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                {data.gems.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 rounded-full border-[1.5px] border-ink py-3 pl-4 pr-1.5">
                    <div className="min-w-0 grow"><p className="truncate text-sm">{g.title}</p><p className="text-xs text-[#1F1F1F]">{g.why}</p></div>
                    <button type="button" onClick={() => onOpen(g.id)} className="h-[34px] shrink-0 cursor-pointer rounded-full bg-ink px-3.5 text-xs text-white hover:bg-ink-muted">Open</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
