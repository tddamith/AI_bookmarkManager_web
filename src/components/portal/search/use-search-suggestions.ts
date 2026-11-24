"use client";

import { useEffect, useMemo, useState } from "react";
import { load, peek } from "@/lib/portal-cache";
import { EMPTY_SUGGESTIONS, suggest, type Filter, type SearchIndex, type Suggestions } from "@/lib/search";

export const INDEX_KEY = "/api/library/index";
const results = new Map<string, Suggestions>(); // per query + filters, so backspacing is instant (browser only)

const cacheKey = (text: string, filters: Filter[]) => JSON.stringify([text.trim().toLowerCase(), filters]);

/**
 * Suggestions for the dropdown. The light index (loaded when the dashboard mounts) answers instantly on every keystroke;
 * the debounced server search (which also reads AI summaries) replaces it when it arrives. Stale requests are aborted.
 */
export function useSearchSuggestions(text: string, filters: Filter[], version: number) {
  const [index, setIndex] = useState<SearchIndex | null>(() => peek<SearchIndex>(INDEX_KEY) ?? null);
  const [, bump] = useState(0);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void load<SearchIndex>(INDEX_KEY).then((d) => { if (live && d) setIndex(d); });
    return () => { live = false; };
  }, [version]);

  const trimmed = text.trim();
  const key = cacheKey(text, filters);
  const active = trimmed.length > 0 || filters.length > 0;

  useEffect(() => {
    if (!active || results.has(key)) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setPending(key);
      const p = new URLSearchParams({ q: trimmed });
      for (const f of filters) p.append("f", `${f.k}:${f.v}`);
      fetch(`/api/library/search?${p}`, { signal: ctrl.signal, cache: "no-store" })
        .then((r) => (r.ok ? (r.json() as Promise<Suggestions>) : null))
        .then((d) => { if (d) { results.set(key, d); bump((n) => n + 1); } })
        .catch(() => undefined)
        .finally(() => { if (!ctrl.signal.aborted) setPending((cur) => (cur === key ? null : cur)); });
    }, 150);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active]);

  const local = useMemo(() => (index && active ? suggest(index.docs, trimmed, filters, index.folders) : null), [index, trimmed, filters, active]);
  const exact = results.get(key) ?? null;
  const data = exact ?? local;

  // Keep showing the last results (dimmed) until the first answer for a new query arrives, so the panel never jumps.
  const [last, setLast] = useState<Suggestions>(EMPTY_SUGGESTIONS);
  if (data && data !== last) setLast(data);

  return {
    index,
    data: data ?? last,
    /** a server answer for this exact query is still on its way */
    loading: active && !exact,
    /** nothing to show yet at all (index not loaded and no server answer) */
    initial: active && !data && last === EMPTY_SUGGESTIONS,
    pending: pending === key,
  };
}
