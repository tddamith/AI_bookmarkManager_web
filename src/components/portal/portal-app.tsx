"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BookmarkDialog, type DialogState } from "@/components/portal/bookmark-dialog";
import { DashboardView } from "@/components/portal/dashboard-view";
import { ago, siteIcon, type Bookmark, type DashboardData, type LibraryData, type View } from "@/components/portal/types";
import { Logo } from "@/components/landing/header-hero";
import { SparkIcon } from "@/components/ui/icons";
import { folderTones } from "@/components/import/use-sync-status";

async function api<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (res.status === 401) {
      window.dispatchEvent(new Event("tidypin:unauth"));
      return null;
    }
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const nav = (on: boolean) =>
  `flex h-10 w-full cursor-pointer items-center justify-between rounded-full border-0 px-2.5 text-left text-sm ${on ? "bg-ink text-white" : "bg-transparent text-ink hover:bg-white"}`;

export function PortalApp({ name }: { name: string | null }) {
  const router = useRouter();
  const [view, setView] = useState<View>("dash");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [range, setRange] = useState<"week" | "month">("week");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [lib, setLib] = useState<LibraryData | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const out = () => router.push("/signin?next=/dashboard");
    window.addEventListener("tidypin:unauth", out);
    return () => window.removeEventListener("tidypin:unauth", out);
  }, [router]);

  useEffect(() => {
    const t = setTimeout(() => setQ(input), 250);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    let live = true;
    const p = new URLSearchParams();
    if (folderId) p.set("folder", folderId);
    else if (view !== "dash") p.set("view", view);
    if (q) p.set("q", q);
    void api<Omit<LibraryData, "fetchedAt">>(`/api/library?${p}`).then((d) => {
      if (!live) return;
      setFailed(!d);
      if (d) setLib({ ...d, fetchedAt: Date.now() });
    });
    return () => { live = false; };
  }, [view, folderId, q, tick]);

  useEffect(() => {
    let live = true;
    void api<DashboardData>(`/api/library/dashboard?range=${range}&tz=${new Date().getTimezoneOffset()}`).then((d) => {
      if (live && d) setDash(d);
    });
    return () => { live = false; };
  }, [range, tick]);

  const isDash = view === "dash" && !folderId && !q;
  const rows = lib?.bookmarks ?? [];
  const selected: Bookmark | null = rows.find((b) => b.id === sel) ?? null;
  const heading = folderId ? (lib?.folders.find((f) => f.id === folderId)?.name ?? "Folder") : q ? "Search" : view === "later" ? "Read later" : view === "fav" ? "Favorites" : "All bookmarks";

  function go(next: View, folder: string | null = null) {
    setView(next); setFolderId(folder); setSel(null);
    if (!folder && next === "dash") { setInput(""); setQ(""); }
  }

  /** Opens synchronously (pop-up safe), then fills in the URL once the open is recorded. */
  async function openMark(id: string) {
    const w = window.open("about:blank", "_blank");
    if (w) w.opener = null;
    try {
      const res = await fetch(`/api/library/bookmarks/${id}/open`, { method: "POST" });
      const d = (await res.json()) as { url?: string };
      if (res.ok && d.url) { if (w) w.location.href = d.url; else window.open(d.url, "_blank", "noopener"); }
      else w?.close();
    } catch { w?.close(); }
    reload();
  }

  async function remove(b: Bookmark) {
    if (!window.confirm(`Delete “${b.title}”? This can't be undone.`)) return;
    const res = await fetch(`/api/library/bookmarks/${b.id}`, { method: "DELETE" });
    if (res.ok) { setSel(null); reload(); }
  }

  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const folderNames = (lib?.folders ?? []).map((f) => f.name);

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center gap-4 border-b border-ink px-6 py-3.5">
        <div className="w-[216px] max-sm:w-auto"><Logo /></div>
        <form role="search" onSubmit={(e) => e.preventDefault()} className="flex h-11 max-w-[560px] min-w-0 flex-[1_1_320px] items-center gap-2 rounded-full border-[1.5px] border-ink bg-white pl-[18px] pr-[5px]">
          <label htmlFor="q" className="sr-only">Search bookmarks</label>
          <input id="q" type="search" value={input} onChange={(e) => { setInput(e.target.value); if (view === "dash" && e.target.value) setView("all"); }} placeholder="Search your bookmarks…" className="min-w-0 grow border-0 bg-transparent text-[15px] outline-none" />
          <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-ink" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D4FA1E" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          </span>
        </form>
        <div className="ml-auto flex items-center gap-2.5">
          <button type="button" onClick={() => setDialog({ mode: "add" })} className="h-10 cursor-pointer rounded-full bg-ink px-[18px] text-sm font-medium text-white hover:bg-ink-muted">+ Add bookmark</button>
          <details className="relative">
            <summary aria-label="Account" className="flex size-10 cursor-pointer list-none items-center justify-center rounded-full bg-sand text-sm font-semibold [&::-webkit-details-marker]:hidden">{initial}</summary>
            <div className="absolute right-0 z-20 mt-2 flex w-56 flex-col gap-3 rounded-[18px] border-[1.5px] border-ink bg-paper p-4">
              <p className="truncate text-sm">{name ?? "Signed in"}</p>
              <Link href="/plans" className="text-sm">Plans</Link>
              <SignOutButton />
            </div>
          </details>
        </div>
      </header>

      <div className="flex min-h-0 grow flex-wrap">
        <nav aria-label="Library" className="flex max-w-[240px] flex-[1_1_200px] flex-col gap-5 p-6 pr-4 max-md:max-w-none">
          <div className="flex flex-col gap-0.5">
            <button type="button" className={nav(isDash)} aria-current={isDash ? "page" : undefined} onClick={() => go("dash")}><span>Dashboard</span></button>
            {([["all", "All bookmarks", lib?.counts.all], ["later", "Read later", lib?.counts.later], ["fav", "Favorites", lib?.counts.fav]] as const).map(([id, label, n]) => (
              <button key={id} type="button" className={nav(!folderId && !isDash && view === id)} onClick={() => go(id)}><span>{label}</span><span className="text-xs">{n ?? ""}</span></button>
            ))}
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="px-2.5 pb-1.5 text-xs text-ink-muted">Folders —</p>
            {(lib?.folders ?? []).map((f, i) => (
              <button key={f.id} type="button" className={nav(folderId === f.id)} onClick={() => go("all", f.id)}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className={`size-3.5 shrink-0 rounded-full border border-ink ${folderTones[i % folderTones.length]}`} aria-hidden="true" />
                  <span className="truncate">{f.name}</span>
                </span>
                <span className="text-xs">{f.count}</span>
              </button>
            ))}
            {lib && lib.folders.length === 0 && <p className="px-2.5 text-xs text-ink-muted">No folders yet.</p>}
          </div>
          <button type="button" onClick={() => go("dash")} className="mt-auto flex cursor-pointer items-center gap-2 rounded-[18px] border-0 bg-lime px-3.5 py-3 text-left text-[13px] hover:bg-lime-deep">
            <SparkIcon size={14} /><span className="grow">AI tidy-up</span>{dash && dash.filedLeft > 0 && <span>{dash.filedLeft} →</span>}
          </button>
        </nav>

        <main id="main" className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 border-l border-ink px-8 py-6 max-md:border-l-0 max-md:px-6">
          {failed && <p role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm">We couldn&apos;t load your library. <button type="button" onClick={reload} className="cursor-pointer underline">Try again</button></p>}
          {isDash ? (
            <DashboardView
              data={dash}
              onRange={setRange}
              onOpen={openMark}
              onAdd={() => setDialog({ mode: "add" })}
              onTip={(to) => (to.open ? void openMark(to.open) : go((to.view as View) ?? "all"))}
            />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-[40px] font-normal leading-[1.02] tracking-[-0.035em]">{heading}</h1>
                  <p className="mt-1 text-[13px] text-ink-muted">{rows.length} {rows.length === 1 ? "bookmark" : "bookmarks"}</p>
                </div>
                <p className="text-[13px] text-ink-muted">Sort — Recent</p>
              </div>
              <ul className="m-0 flex list-none flex-col border-t border-ink p-0">
                {rows.map((b) => {
                  const ic = siteIcon(b.domain);
                  const on = b.id === sel;
                  return (
                    <li key={b.id}>
                      <button type="button" onClick={() => setSel(b.id)} aria-pressed={on}
                        className={`flex min-h-[60px] w-full cursor-pointer items-center gap-3.5 border-0 border-b border-ink/15 px-3 text-ink ${on ? "bg-white shadow-[inset_3px_0_0_#111]" : "bg-transparent hover:bg-white/60"}`}>
                        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border border-[#D9D9D5] bg-white"><span className="flex size-[18px] items-center justify-center rounded-[5px] text-[11px] font-bold" style={{ background: ic.bg, color: ic.fg }}>{ic.letter}</span></span>
                        <span className="flex min-w-0 grow flex-col gap-0.5 text-left"><span className="truncate text-[15px]">{b.title}</span><span className="text-xs text-ink-muted">{b.domain}</span></span>
                        <span className="w-[120px] shrink-0 truncate text-left text-xs text-ink-muted max-sm:hidden">{b.folder}</span>
                        <span className="w-12 shrink-0 text-right text-xs text-ink-muted">{lib ? ago(b.savedAt, lib.fetchedAt) : ""}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {lib && rows.length === 0 && (
                <p className="py-8 text-[15px] text-ink-muted">{q ? <>No bookmarks match “{q}”.</> : "Nothing here yet."}</p>
              )}
            </div>
          )}
        </main>

        {!isDash && selected && lib && (
          <aside aria-label="Bookmark details" className="flex max-w-[380px] flex-[1_1_320px] flex-col gap-4 border-l border-ink bg-white p-6 max-md:max-w-none max-md:border-l-0 max-md:border-t">
            <div className="flex items-center justify-between">
              {(() => { const ic = siteIcon(selected.domain); return (
                <span className="flex size-11 items-center justify-center rounded-xl border border-[#D9D9D5] bg-white"><span className="flex size-6 items-center justify-center rounded-md text-[13px] font-bold" style={{ background: ic.bg, color: ic.fg }}>{ic.letter}</span></span>
              ); })()}
              <button type="button" aria-label="Close details" onClick={() => setSel(null)} className="flex size-9 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-ink bg-transparent hover:bg-paper">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div>
              <h2 className="text-2xl font-normal leading-[1.1] tracking-[-0.02em]">{selected.title}</h2>
              <a href={selected.url} target="_blank" rel="noopener noreferrer" onClick={() => void fetch(`/api/library/bookmarks/${selected.id}/open`, { method: "POST", keepalive: true }).then(reload)} className="mt-1.5 inline-block break-all text-[13px]">{selected.domain} ↗</a>
            </div>
            <div className="flex flex-col gap-1.5 rounded-[18px] bg-lime p-3.5">
              <p className="flex items-center gap-1.5 text-xs font-medium"><SparkIcon size={12} />AI summary</p>
              <p className="text-sm leading-[1.45]">{selected.summary || "No summary yet. Summaries appear once Tidypin AI has read this page."}</p>
            </div>
            <dl className="m-0 flex flex-col border-b border-ink text-sm">
              {([["Folder", selected.folder], ["Tags", selected.tags.length ? selected.tags.map((t) => `#${t}`).join(" ") : "—"], ["Saved", `${ago(selected.savedAt, lib.fetchedAt)} ago`]] as const).map(([k, v]) => (
                <div key={k} className="flex h-11 items-center justify-between border-t border-ink"><dt className="text-ink-muted">{k}</dt><dd className="m-0">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-auto flex gap-2">
              <button type="button" onClick={() => void openMark(selected.id)} className="flex h-[46px] grow cursor-pointer items-center justify-center rounded-full bg-ink text-[15px] font-medium text-white hover:bg-ink-muted">Open page</button>
              <button type="button" onClick={() => setDialog({ mode: "edit", mark: selected })} className="h-[46px] cursor-pointer rounded-full border-[1.5px] border-ink px-4 text-sm hover:bg-paper">Edit</button>
              <button type="button" aria-label="Delete bookmark" onClick={() => void remove(selected)} className="flex size-[46px] cursor-pointer items-center justify-center rounded-full border-[1.5px] border-ink bg-transparent hover:bg-paper">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
              </button>
            </div>
          </aside>
        )}
      </div>

      <BookmarkDialog state={dialog} folders={folderNames} onClose={() => setDialog(null)} onSaved={() => { setDialog(null); reload(); }} />
    </div>
  );
}
