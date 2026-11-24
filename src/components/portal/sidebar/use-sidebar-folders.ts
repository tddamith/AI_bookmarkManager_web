"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { SidebarData } from "@/components/portal/types";
import { FOLDERS_KEY, libraryKey, load, peek, seed } from "@/lib/portal-cache";

const LS_KEY = "tidypin.sidebar.foldersExpanded";
export const OPEN_COOKIE = "tidypin_folders_open";
export const ENTERED_COOKIE = "tidypin_sidebar_entered";
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type FoldersStatus = "loading" | "ready" | "error";

/**
 * Sidebar folders + nav counts. Starts from server-provided data (or the in-memory cache, so coming back to the dashboard is
 * instant), then revalidates in the background whenever `tick` changes.
 */
export function useSidebarFolders(initial: SidebarData | null, tick: number) {
  const [data, setData] = useState<SidebarData | null>(() => {
    if (initial) seed(FOLDERS_KEY, initial);
    return peek<SidebarData>(FOLDERS_KEY) ?? initial;
  });
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    void load<SidebarData>(FOLDERS_KEY).then((d) => {
      if (!live) return;
      if (d) { setData(d); setFailed(false); } else setFailed(true);
    });
    return () => { live = false; };
  }, [tick, attempt]);

  const retry = useCallback(() => { setFailed(false); setAttempt((a) => a + 1); }, []);
  const status: FoldersStatus = data ? "ready" : failed ? "error" : "loading";
  return { data, status, retry };
}

/**
 * Expanded/collapsed state, persisted in localStorage (with a mirrored cookie so the server renders the right height first time).
 * `forceOpenFor`: when the active folder is one of the hidden ones the list opens so it is visible.
 */
export function useFoldersExpanded(initial: boolean, activeHidden: boolean, activeId: string | null) {
  const [expanded, setExpanded] = useState(initial || activeHidden);
  const [seenActive, setSeenActive] = useState(activeId);
  // Adjust state when the active folder changes (React-approved "derive from props" pattern; no effect needed).
  if (seenActive !== activeId) {
    setSeenActive(activeId);
    if (activeHidden && !expanded) setExpanded(true);
  }

  // localStorage is the source of truth; reconcile with what the server guessed before the first paint.
  useIsoLayoutEffect(() => {
    try {
      const v = localStorage.getItem(LS_KEY);
      if (v === "1" || v === "0") setExpanded((cur) => (v === "1" ? true : activeHidden ? cur : false));
    } catch { /* storage unavailable */ }
  }, []);

  const toggle = useCallback(() => {
    setExpanded((cur) => {
      const next = !cur;
      try { localStorage.setItem(LS_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      try { document.cookie = `${OPEN_COOKIE}=${next ? 1 : 0}; path=/; max-age=31536000; samesite=lax`; } catch { /* ignore */ }
      return next;
    });
  }, []);
  return { expanded, toggle };
}

/** Warm the cache for a folder's bookmarks (debounced by the caller). */
export function prefetchFolder(folderId: string) {
  void load(libraryKey("all", folderId, ""));
}

/** Marks the entrance animation as played for this browser session (session cookie). */
export function markEntered() {
  try { document.cookie = `${ENTERED_COOKIE}=1; path=/; samesite=lax`; } catch { /* ignore */ }
}

export function usePrefetchOnHover(folderId: string) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useCallback(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => prefetchFolder(folderId), 100);
  }, [folderId]);
  const stop = useCallback(() => { if (t.current) clearTimeout(t.current); }, []);
  useEffect(() => stop, [stop]);
  return { onMouseEnter: start, onFocus: start, onMouseLeave: stop, onBlur: stop };
}
