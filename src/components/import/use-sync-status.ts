"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export type SyncStatus = {
  status: "idle" | "importing" | "done" | "error";
  stage: 0 | 1 | 2 | 3;
  /** progress of the stage being worked on */
  processed: number;
  total: number;
  percent: number;
  source: "extension" | "server";
  error: string | null;
  /** seconds since the status last changed (null if unknown) */
  ageSec: number | null;
  /** bookmarks currently in the library */
  library: number;
  stats: { bookmarks: number; folders: number; duplicates: number; dead: number };
  folders: { id: string; name: string; count: number }[];
};

/** Console log for every hop of the import pipeline (extension → API → this page). Filter the console by "[tidypin-import]". */
export const importLog = (...args: unknown[]) => console.log("[tidypin-import]", ...args);

// One status request at a time, shared by everything on the page. React StrictMode (dev) mounts effects twice; without this the
// first request would be fired twice.
let inflight: Promise<{ status: number; body: unknown }> | null = null;
function fetchStatus() {
  if (!inflight) {
    inflight = fetch("/api/sync/status", { cache: "no-store" })
      .then(async (res) => ({ status: res.status, body: await res.json().catch(() => null) }))
      .finally(() => { inflight = null; });
  }
  return inflight;
}

async function startPipeline(why: string) {
  importLog(`starting the background pipeline (${why})`);
  try {
    const res = await fetch("/api/sync/pipeline", { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as { started?: boolean; reason?: string };
    importLog("pipeline start →", res.status, body.started ? "started" : `not started (${body.reason ?? "?"})`);
    return res.ok;
  } catch (e) {
    importLog("pipeline start failed:", e instanceof Error ? e.message : e);
    return false;
  }
}

/**
 * Follows the import. The side panel (or this app's own pipeline) reports progress to the API; this page cannot be messaged by the
 * extension directly, so it asks the API for the current status as soon as it mounts (catching up if the import started earlier),
 * then polls until the import is done or has failed. It refreshes immediately when the tab becomes visible again.
 *
 * Catch-up: bookmarks are in the library but nobody is sorting them (status "idle") → start the background pipeline.
 * Resume: the pipeline says "importing" but its status has not changed for a while (server restarted) → start it again.
 * `retry()` is for the error state.
 */
export function useSyncStatus(intervalMs = 1500) {
  const router = useRouter();
  const [data, setData] = useState<SyncStatus | null>(null);
  const [error, setError] = useState(false);
  const [run, setRun] = useState(0);   // bump to (re)start polling
  const graceUntil = useRef(0);        // after Retry: the old "error" may still be what the API reports for a moment

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let busy = false;
    let last = "";
    let first = true;
    let lastStart = 0;

    async function tick() {
      if (busy || stop) return;
      busy = true;
      clearTimeout(timer);
      let finished = false;
      try {
        if (first) importLog("mount: asking the API for the current import status");
        console.debug("[tidypin-import] GET /api/sync/status");
        const { status, body } = await fetchStatus();
        if (status === 401) {
          importLog("not signed in (401) → /signin");
          router.push("/signin?next=/import");
          return;
        }
        const next = body as SyncStatus | null;
        if (stop) return;
        if (status !== 200 || !next || typeof next.percent !== "number") throw new Error(`bad status (${status})`);
        const sig = `${next.status}/${next.stage}/${next.processed}/${next.total}`;
        if (first || sig !== last) {
          importLog(first ? "status received (catch-up):" : "progress received:", `${next.status}, stage ${next.stage}, ${next.processed}/${next.total} (${next.percent}%)${next.error ? ` — ${next.error}` : ""}`);
          importLog("state updated");
        }
        last = sig;
        first = false;
        setData(next);
        setError(false);

        if (next.status === "done") { importLog("import finished"); finished = true; }
        else if (next.status === "error" && Date.now() < graceUntil.current) importLog("retry: waiting for the new job to report in");
        else if (next.status === "error") { importLog("import failed:", next.error); finished = true; }   // stop polling; the page offers Retry
        else if (Date.now() - lastStart > 10_000) {
          const idleWithBookmarks = next.status === "idle" && next.library > 0;
          const stalled = next.status === "importing" && next.source === "server" && (next.ageSec ?? 0) > 15;
          if (idleWithBookmarks || stalled) { lastStart = Date.now(); void startPipeline(idleWithBookmarks ? "catch-up" : "resume"); }
        }
      } catch (e) {
        importLog("status request failed:", e instanceof Error ? e.message : e);
        if (!stop) setError(true);
      } finally {
        busy = false;
      }
      if (!stop && !finished) timer = setTimeout(tick, intervalMs);
    }

    const onVisible = () => { if (document.visibilityState === "visible" && !stop) void tick(); };
    document.addEventListener("visibilitychange", onVisible);
    void tick();
    return () => {
      stop = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs, router, run]);

  /** Error state → start the pipeline again and resume polling. */
  const retry = useCallback(async () => {
    importLog("retry requested");
    setError(false);
    graceUntil.current = Date.now() + 8000;
    setData((d) => (d ? { ...d, status: "importing", error: null } : d));   // show progress at once instead of the old error
    await startPipeline("retry");
    setRun((n) => n + 1);
  }, []);

  return { data, error, retry };
}

export const folderTones = ["bg-ink", "bg-lime", "bg-white", "bg-sand", "bg-paper"];
export const nf = (n: number) => n.toLocaleString("en-US");
