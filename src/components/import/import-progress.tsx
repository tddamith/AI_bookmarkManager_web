"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FolderIcon } from "@/components/import/folder-icon";
import { UploadBookmarks } from "@/components/import/upload-bookmarks";
import { folderTones, nf, useSyncStatus } from "@/components/import/use-sync-status";

const steps = ["Imported all bookmarks", "Removed duplicates", "Putting them into folders", "Adding tags and summaries"];

function StepIcon({ state }: { state: "done" | "active" | "todo" }) {
  if (state === "done")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="11" fill="#111111" />
        <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
      </svg>
    );
  if (state === "active")
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" fill="#D4FA1E" stroke="#111111" strokeWidth="1" />
        <circle cx="12" cy="12" r="2.5" fill="#111111" />
      </svg>
    );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="#111111" strokeWidth="1" />
    </svg>
  );
}

export function ImportProgress() {
  const router = useRouter();
  const { data, error } = useSyncStatus();
  const done = data?.status === "done";
  const waiting = !data || (data.status === "idle" && data.processed === 0);

  // Everything finished in the side panel → move on to "All sorted".
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.push("/ready"), 1200);
    return () => clearTimeout(t);
  }, [done, router]);

  const percent = done ? 100 : (data?.percent ?? 0);
  const stage = done ? 4 : (data?.stage ?? 0);

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <p className="text-sm text-ink-muted">
          AI at work —<br />
          You can close this tab, we’ll keep going
        </p>
        <h1 className="max-w-[520px] text-[clamp(40px,6vw,56px)] font-normal leading-[0.98] tracking-[-0.045em]">
          {done ? "Sorted." : waiting ? "Waiting for your bookmarks…" : "Sorting your bookmarks…"}
        </h1>
      </div>

      <div className="flex flex-col gap-2" aria-live="polite">
        <div className="flex justify-between text-sm">
          <span>{waiting ? "Open the Tidypin side panel and start the import" : `${nf(data?.processed ?? 0)} of ${nf(data?.total ?? 0)}`}</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-[5px] border border-ink" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Import progress">
          <div className="h-full border-r border-ink bg-lime transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${percent}%` }} />
        </div>
      </div>

      <ul className="m-0 flex list-none flex-col border-b border-ink p-0">
        {steps.map((label, i) => {
          const state = waiting ? "todo" : i < stage ? "done" : i === stage ? "active" : "todo";
          return (
            <li key={label} aria-current={state === "active" ? "step" : undefined}
              className={`flex h-14 items-center gap-3.5 border-t border-ink text-[17px] ${state === "active" ? "font-medium" : ""} ${state === "todo" ? "text-ink-muted" : ""}`}>
              <StepIcon state={state} />
              {label}
            </li>
          );
        })}
      </ul>

      {data && data.folders.length > 0 && (
        <section aria-labelledby="folders-so-far" className="flex flex-col gap-3">
          <h2 id="folders-so-far" className="text-sm font-normal text-ink-muted">Folders so far —<br />{data.folders.length} created, {nf(data.processed)} bookmarks saved</h2>
          <ul className="m-0 flex list-none flex-col border-b border-ink p-0">
            {data.folders.map((f, i) => (
              <li key={f.id} className="flex h-[52px] items-center gap-3.5 border-t border-ink text-[17px]">
                <FolderIcon tone={folderTones[i % folderTones.length]} />
                <span className="grow truncate">{f.name}</span>
                <span className="text-ink-soft">{nf(f.count)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!done && (waiting || (data?.status === "idle")) && <UploadBookmarks />}

      {error && <p role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm">We lost connection. Retrying…</p>}

      {done && <Link href="/ready" className="text-sm font-medium">See what was sorted →</Link>}
    </>
  );
}
