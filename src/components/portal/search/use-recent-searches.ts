"use client";

import { useCallback, useState } from "react";

const KEY = "tidypin.recentSearches";
const MAX = 5;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch { return []; }
}

/** Last 5 committed searches, newest first, kept in localStorage. */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>(read);
  const write = useCallback((next: string[]) => {
    setRecent(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  }, []);
  const add = useCallback((q: string) => {
    const t = q.trim();
    if (!t) return;
    write([t, ...read().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX));
  }, [write]);
  const remove = useCallback((q: string) => write(read().filter((x) => x !== q)), [write]);
  const clear = useCallback(() => write([]), [write]);
  return { recent, add, remove, clear };
}
