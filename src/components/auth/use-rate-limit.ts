"use client";

import { useCallback, useEffect, useState } from "react";

const MAX = 24 * 3600;

/** "0:42", "12:05", "1:02:09" */
export function formatWait(secs: number) {
  const s = Math.max(0, Math.ceil(secs));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const ss = String(r).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** Plain-language version for screen readers, rounded so it isn't announced every second. */
export function spokenWait(secs: number) {
  const s = Math.max(1, Math.ceil(secs));
  if (s >= 3600) return `${Math.ceil(s / 3600)} hour${Math.ceil(s / 3600) === 1 ? "" : "s"}`;
  if (s >= 90) return `${Math.ceil(s / 60)} minutes`;
  if (s > 10) return `${Math.ceil(s / 10) * 10} seconds`;
  return "a few seconds";
}

/**
 * A "too many attempts" lock with a live countdown. The end time is remembered for the browser session, so reloading the page
 * doesn't make the wait look like it reset (the server keeps enforcing it either way).
 */
export function useRateLimit(storageKey: string) {
  const [until, setUntil] = useState(0);   // epoch ms; 0 = not locked
  const [now, setNow] = useState(0);

  useEffect(() => {
    void Promise.resolve().then(() => {
      try {
        const v = Number(sessionStorage.getItem(storageKey));
        if (v > Date.now()) { setUntil(v); setNow(Date.now()); }
      } catch { /* storage unavailable */ }
    });
  }, [storageKey]);

  useEffect(() => {
    if (!until) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= until) {
        setUntil(0);
        try { sessionStorage.removeItem(storageKey); } catch { /* ignore */ }
      }
    }, 250);
    return () => clearInterval(t);
  }, [until, storageKey]);

  const lock = useCallback((seconds: number) => {
    const end = Date.now() + Math.min(Math.max(1, seconds), MAX) * 1000;
    setUntil(end);
    setNow(Date.now());
    try { sessionStorage.setItem(storageKey, String(end)); } catch { /* ignore */ }
  }, [storageKey]);

  const left = until ? Math.max(0, (until - now) / 1000) : 0;
  return { locked: until > 0 && left > 0, left, lock };
}
