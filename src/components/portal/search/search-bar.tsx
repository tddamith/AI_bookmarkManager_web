"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { SearchDropdown } from "@/components/portal/search/search-dropdown";
import { emptySections, operatorSection, typedSections, type Row, type Section } from "@/components/portal/search/rows";
import { useRecentSearches } from "@/components/portal/search/use-recent-searches";
import { useSearchSuggestions } from "@/components/portal/search/use-search-suggestions";
import { extractChips, filterLabel, isEmpty, partialOperator, type Filter, type FolderInfo } from "@/lib/search";

const EASE = [0.22, 1, 0.36, 1] as const;

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => { const mq = window.matchMedia(query); mq.addEventListener("change", cb); return () => mq.removeEventListener("change", cb); },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
const useIsMac = () => useSyncExternalStore(() => () => undefined, () => /Mac|iPhone|iPad/.test(navigator.platform), () => false);

const sameFilter = (a: Filter, b: Filter) => a.k === b.k && a.v.toLowerCase() === b.v.toLowerCase();

export function SearchBar({ value, onValue, filters, onFilters, onCommit, searching, version, onOpenBookmark, onShowDetails, onView, onFolder }: {
  value: string;
  onValue: (v: string) => void;
  filters: Filter[];
  onFilters: (f: Filter[]) => void;
  /** run the full search (Enter / "Search all" / button) */
  onCommit: (text: string) => void;
  searching: boolean;
  /** bump to refresh the preloaded index after the library changes */
  version: number;
  onOpenBookmark: (id: string) => void;
  onShowDetails: (id: string, title: string) => void;
  onView: (view: "later" | "fav") => void;
  onFolder: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const mobile = useMedia("(max-width: 639px)");
  const isMac = useIsMac();
  const sheet = mobile && open;

  const { recent, add: addRecent, clear: clearRecent } = useRecentSearches();
  const partial = partialOperator(value);
  const text = partial ? value.slice(0, value.length - (`${partial.op}:${partial.value}`).length).trim() : value;
  const { index, data, loading, initial } = useSearchSuggestions(partial ? partial.value : text, filters, version);
  const folders: FolderInfo[] = useMemo(() => index?.folders ?? [], [index]);

  const typing = value.trim().length > 0 || filters.length > 0;
  const query = partial ? partial.value : value.trim();

  const sections: Section[] = useMemo(() => {
    if (partial) return [operatorSection(partial.op, partial.value, data, folders)].filter((s) => s.rows.length);
    if (!typing) return emptySections(recent, folders);
    return typedSections(data, folders);
  }, [partial, typing, recent, folders, data]);

  const footerText = typing && !partial ? value.trim() : "";
  const footer: Row | null = useMemo(() => (footerText ? { kind: "all", key: "all", text: footerText } : null), [footerText]);
  const flat: Row[] = useMemo(() => [...sections.flatMap((s) => s.rows), ...(footer ? [footer] : [])], [sections, footer]);
  const noMatch = typing && !initial && !loading && isEmpty(data) && sections.every((s) => !s.rows.length) && !partial;

  // Inline completion: top tag/site that starts with the last typed word.
  const ghost = useMemo(() => {
    if (!value || partial || !open) return "";
    const last = value.split(/\s+/).pop() ?? "";
    if (!last) return "";
    const cands = [...data.tags.map((t) => t.tag), ...data.sites.map((s) => s.domain)];
    const hit = cands.find((c) => c.toLowerCase().startsWith(last.toLowerCase()) && c.length > last.length);
    return hit ? hit.slice(last.length) : "";
  }, [value, partial, open, data]);

  const close = useCallback(() => { setOpen(false); setActive(-1); }, []);

  // Shortcuts: ⌘K / Ctrl+K anywhere, "/" when not typing elsewhere.
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const el = document.activeElement as HTMLElement | null;
      const typingElsewhere = el && el !== inputRef.current && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); inputRef.current?.focus(); inputRef.current?.select(); }
      else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !typingElsewhere && el !== inputRef.current) { e.preventDefault(); inputRef.current?.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => { if (!rootRef.current?.contains(e.target as Node)) close(); };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  }, [open, close]);

  function change(raw: string) {
    const { text: rest, chips } = extractChips(raw);
    if (chips.length) {
      const next = [...filters];
      for (const c of chips) if (!next.some((f) => sameFilter(f, c))) next.push(c);
      onFilters(next);
      onValue(rest);
    } else onValue(raw);
    setActive(-1);
    setOpen(true);
  }

  function commit(t: string) {
    if (!t.trim() && !filters.length) return;
    addRecent(t);
    onCommit(t.trim());
    close();
    inputRef.current?.blur();
  }

  function addFilter(f: Filter, removeTyped: boolean) {
    if (!filters.some((x) => sameFilter(x, f))) onFilters([...filters, f]);
    onValue(removeTyped && partial ? text : "");
    setActive(-1);
    if (!removeTyped) close();
  }

  function choose(row: Row, alt: boolean) {
    switch (row.kind) {
      case "bookmark":
        if (value.trim()) addRecent(value);
        if (alt) onShowDetails(row.doc.id, row.doc.title); else onOpenBookmark(row.doc.id);
        close(); inputRef.current?.blur();
        break;
      case "site": addFilter({ k: "site", v: row.domain }, false); break;
      case "tag": addFilter({ k: "tag", v: row.tag }, false); break;
      case "folder": onValue(""); onFolder(row.folder.id); close(); inputRef.current?.blur(); break;
      case "recent": onValue(row.text); commit(row.text); break;
      case "quick":
        onValue("");
        if ("view" in row.to) onView(row.to.view); else onFolder(row.to.folder.id);
        close(); inputRef.current?.blur();
        break;
      case "operator": addFilter(row.filter, true); inputRef.current?.focus(); break;
      case "all": commit(row.text); break;
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const n = flat.length;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      if (!n) return;
      setActive((a) => (e.key === "ArrowDown" ? (a + 1) % n : a <= 0 ? n - 1 : a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = open && active >= 0 ? flat[active] : null;
      if (row) choose(row, e.shiftKey || e.metaKey || e.ctrlKey); else commit(value);
    } else if (e.key === "Escape") {
      if (value) { e.preventDefault(); onValue(""); setActive(-1); }
      else { close(); inputRef.current?.blur(); }
    } else if (e.key === "Tab" && ghost && !e.shiftKey) {
      e.preventDefault();
      change(value + ghost);
    } else if (e.key === "Backspace" && !value && filters.length) {
      onFilters(filters.slice(0, -1));
    }
  }

  const activeId = open && active >= 0 && active < flat.length ? `${listId}-opt-${active}` : undefined;

  const hint = isMac ? "⌘K" : "Ctrl K";
  const showSkeleton = open && initial && sections.length === 0;
  const dim = loading && !initial && typing;

  return (
    <div ref={rootRef} className={sheet ? "fixed inset-0 z-50 flex flex-col gap-3 bg-paper p-4" : "relative min-w-0 max-w-[560px] flex-[1_1_320px]"}>
      <form role="search" onSubmit={(e: FormEvent) => { e.preventDefault(); commit(value); }}
        className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-ink bg-white pl-[18px] pr-[5px] transition-shadow focus-within:shadow-[0_0_0_4px_rgba(0,0,0,0.06)]">
        {filters.map((f) => (
          <span key={`${f.k}:${f.v}`} className="inline-flex h-7 max-w-[160px] shrink-0 items-center gap-1 rounded-full bg-lime pl-2.5 pr-1 text-xs">
            <span className="truncate">{filterLabel(f)}</span>
            <button type="button" aria-label={`Remove filter ${filterLabel(f)}`} onClick={() => onFilters(filters.filter((x) => x !== f))}
              className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 hover:bg-black/10">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </span>
        ))}
        <div className="relative flex h-full min-w-0 grow items-center">
          <label htmlFor={`${id}-input`} className="sr-only">Search bookmarks</label>
          {ghost && (
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 flex items-center whitespace-pre text-[15px]">
              <span className="invisible">{value}</span><span className="text-[#8A8A8A]">{ghost}</span>
            </span>
          )}
          <input
            ref={inputRef} id={`${id}-input`} type="text" value={value} autoComplete="off" autoCapitalize="off" spellCheck={false}
            role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list" aria-haspopup="listbox" aria-activedescendant={activeId}
            placeholder={filters.length ? "Add words…" : "Search titles, sites, tags or summaries…"}
            onChange={(e) => change(e.target.value)} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
            className="tp-bare-focus relative h-full min-w-0 grow appearance-none border-0 bg-transparent p-0 text-[15px] shadow-none outline-none focus:shadow-none focus:outline-none focus-visible:shadow-none focus-visible:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        {value ? (
          <button type="button" aria-label="Clear search" onClick={() => { onValue(""); inputRef.current?.focus(); }}
            className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent p-0 hover:bg-paper">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        ) : (
          <kbd aria-hidden="true" className="hidden shrink-0 rounded-md border border-[#D9D9D5] bg-paper px-1.5 py-0.5 font-sans text-[11px] text-ink-muted sm:block">{hint}</kbd>
        )}
        <button type="submit" aria-label="Search" className="flex size-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-ink p-0">
          {searching ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          )}
        </button>
        {sheet && <button type="button" onClick={() => { close(); inputRef.current?.blur(); }} className="ml-1 shrink-0 cursor-pointer border-0 bg-transparent px-2 text-sm text-ink">Cancel</button>}
      </form>

      <span className="sr-only" role="status" aria-live="polite">
        {open && typing && !initial ? (noMatch ? `No matches for ${query}` : `${flat.length} suggestions`) : ""}
      </span>

      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            className={sheet ? "flex min-h-0 grow flex-col" : "absolute inset-x-0 top-full z-30 mt-2"}
            initial={{ opacity: 0, y: reduced ? 0 : -4, scale: reduced ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: reduced ? 0.12 : 0.18, ease: EASE } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            style={{ transformOrigin: "top center" }}
          >
            <SearchDropdown
              listId={listId} sections={sections} footer={footer} query={query} activeIndex={active} dim={dim} skeleton={showSkeleton}
              noMatch={noMatch} sheet={sheet} onChoose={choose} onHover={setActive} onClearRecent={clearRecent}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

