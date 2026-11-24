"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { BookmarkDialog, type DialogState } from "@/components/portal/bookmark-dialog";
import { BookmarksView } from "@/components/portal/bookmarks-view";
import { DashboardView } from "@/components/portal/dashboard-view";
import { TidyView } from "@/components/portal/tidy-view";
import { FavoritesView } from "@/components/portal/favorites-view";
import { ReadLaterView } from "@/components/portal/read-later-view";
import { SiteIcon } from "@/components/portal/site-icon";
import { ago, type Bookmark, type DashboardData, type LibraryData, type SidebarData, type View } from "@/components/portal/types";
import { Logo } from "@/components/landing/header-hero";
import { SparkIcon } from "@/components/ui/icons";
import { PortalSidebar } from "@/components/portal/sidebar/sidebar";
import { SearchBar } from "@/components/portal/search/search-bar";
import { libraryKey, load, peekAt } from "@/lib/portal-cache";
import type { Filter } from "@/lib/search";

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

export function PortalApp({ name, fresh = false, sidebar = null, foldersOpen = false, enter = false }: { name: string | null; fresh?: boolean; sidebar?: SidebarData | null; foldersOpen?: boolean; enter?: boolean }) {
  const router = useRouter();
  const [view, setView] = useState<View>("dash");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [range, setRange] = useState<"week" | "month">("week");
  const [dialog, setDialog] = useState<DialogState>(fresh ? { mode: "add" } : null);
  const [libState, setLib] = useState<LibraryData | null>(null);
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const out = () => router.push("/signin?next=/dashboard");
    window.addEventListener("tidypin:unauth", out);
    return () => window.removeEventListener("tidypin:unauth", out);
  }, [router]);

  const libKey = libraryKey(view, folderId, q, filters);
  const [libFor, setLibFor] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void load<Omit<LibraryData, "fetchedAt">>(libKey).then((d) => {
      if (!live) return;
      setFailed(!d);
      if (d) { setLib({ ...d, fetchedAt: Date.now() }); setLibFor(libKey); }
    });
    return () => { live = false; };
  }, [libKey, tick]);
  // While the fresh copy loads, show what's cached (e.g. prefetched when hovering a folder) instead of the previous view's rows.
  const cached = libFor === libKey ? undefined : peekAt<Omit<LibraryData, "fetchedAt">>(libKey);
  const lib: LibraryData | null = cached ? { ...cached.data, fetchedAt: cached.at } : libFor !== libKey && folderId ? null : libState;

  useEffect(() => {
    let live = true;
    void api<DashboardData>(`/api/library/dashboard?range=${range}&tz=${new Date().getTimezoneOffset()}`).then((d) => {
      if (live && d) setDash(d);
    });
    return () => { live = false; };
  }, [range, tick]);

  const searchActive = Boolean(q) || filters.length > 0;
  const isDash = view === "dash" && !folderId && !searchActive;
  const rows = lib?.bookmarks ?? [];
  const selected: Bookmark | null = rows.find((b) => b.id === sel) ?? null;
  const heading = folderId ? (lib?.folders.find((f) => f.id === folderId)?.name ?? "Folder") : searchActive ? "Search" : view === "later" ? "Read later" : view === "fav" ? "Favorites" : "All bookmarks";

  function go(next: View, folder: string | null = null) {
    setView(next); setFolderId(folder); setSel(null);
    if (!folder && next === "dash") { setInput(""); setQ(""); setFilters([]); }
    else if (next !== "dash" || folder) { setQ(""); setInput(""); setFilters([]); }
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
        <SearchBar
          value={input} onValue={setInput}
          filters={filters} onFilters={(f) => { setFilters(f); setFolderId(null); setSel(null); if (f.length && view !== "all") setView("all"); }}
          onCommit={(t) => { setQ(t); setFolderId(null); setSel(null); if (view === "dash" || view === "tidy") setView("all"); }}
          searching={searchActive && libFor !== libKey} version={tick}
          onOpenBookmark={(id) => void openMark(id)}
          onShowDetails={(id, title) => { setFilters([]); setFolderId(null); setView("all"); setInput(title); setQ(title); setSel(id); }}
          onView={(v) => go(v)} onFolder={(id) => go("all", id)}
        />
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
        <PortalSidebar
          initial={sidebar} initialExpanded={foldersOpen} enter={enter} tick={tick}
          isDash={isDash} view={view} folderId={folderId}
          loadingFolderId={folderId && libFor !== libKey ? folderId : null}
          filedLeft={dash?.filedLeft ?? 0} onGo={go}
        />

        <main id="main" className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 border-l border-ink px-8 py-6 max-md:border-l-0 max-md:px-6">
          {failed && <p role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm">We couldn&apos;t load your library. <button type="button" onClick={reload} className="cursor-pointer underline">Try again</button></p>}
          {isDash ? (
            <DashboardView
              data={dash}
              onRange={setRange}
              onOpen={openMark}
              onTip={(to) => (to.open ? void openMark(to.open) : go((to.view as View) ?? "all"))}
            />
          ) : view === "later" && !folderId && !searchActive ? (
            <ReadLaterView lib={lib} rows={rows} activeId={sel} onActive={setSel} onOpen={openMark} onChanged={reload} onBrowse={() => go("all")} />
          ) : view === "tidy" && !folderId && !searchActive ? (
            <TidyView onChanged={reload} onBrowse={() => go("all")} />
          ) : view === "fav" && !folderId && !searchActive ? (
            <FavoritesView lib={lib} rows={rows} activeId={sel} onActive={setSel} onOpen={openMark} onChanged={reload} onBrowse={() => go("all")} />
          ) : (
            <BookmarksView lib={lib} rows={rows} heading={heading} searching={searchActive} activeId={sel} onActive={setSel} onChanged={reload} onTidy={() => go("tidy")} onAdd={() => setDialog({ mode: "add" })} />
          )}
        </main>

        {!isDash && selected && lib && (
          <aside aria-label="Bookmark details" className="flex max-w-[380px] flex-[1_1_320px] flex-col gap-4 border-l border-ink bg-white p-6 max-md:max-w-none max-md:border-l-0 max-md:border-t">
            <div className="flex items-center justify-between">
              {(() => { return (
                <span className="flex size-11 items-center justify-center rounded-xl border border-[#D9D9D5] bg-white"><SiteIcon domain={selected.domain} size={24} /></span>
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
