"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type SyncStatus = {
  status: "idle" | "importing" | "done";
  stage: 0 | 1 | 2 | 3;
  processed: number;
  total: number;
  percent: number;
  stats: { bookmarks: number; folders: number; duplicates: number; dead: number };
  folders: { id: string; name: string; count: number }[];
};

/** Polls the library sync status written by the extension side panel. Stops once the import is done. */
export function useSyncStatus(intervalMs = 2000) {
  const router = useRouter();
  const [data, setData] = useState<SyncStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        const res = await fetch("/api/sync/status", { cache: "no-store" });
        if (res.status === 401) {
          router.push("/signin?next=/import");
          return;
        }
        const next = (await res.json()) as SyncStatus;
        if (stop) return;
        if (!res.ok || typeof next.percent !== "number") throw new Error("bad status");
        setData(next);
        setError(false);
        if (next.status === "done") return;
      } catch {
        if (!stop) setError(true);
      }
      if (!stop) timer = setTimeout(tick, intervalMs);
    }
    void tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [intervalMs, router]);

  return { data, error };
}

export const folderTones = ["bg-ink", "bg-lime", "bg-white", "bg-sand", "bg-paper"];
export const nf = (n: number) => n.toLocaleString("en-US");
