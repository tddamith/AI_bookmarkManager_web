"use client";

import { useId, useState } from "react";
import { parseBookmarksHtml } from "@/lib/bookmarks-file";

const BATCH = 500;

async function put(body: unknown) {
  const res = await fetch("/api/sync/library", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { message?: string }).message ?? "Upload failed.");
}

/** Reads an exported bookmarks file in the browser and sends it to the sync API in batches. */
export function UploadBookmarks() {
  const id = useId();
  const [state, setState] = useState<{ busy: boolean; message?: string }>({ busy: false });

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) return setState({ busy: false, message: "That file is too large (25 MB max)." });
    setState({ busy: true });
    try {
      const { folders, bookmarks } = parseBookmarksHtml(await file.text());
      if (!bookmarks.length) return setState({ busy: false, message: "We couldn't find any bookmarks in that file. Export them as HTML and try again." });
      await put({ folders, import: { total: bookmarks.length, stage: 0, status: "importing" } });
      const names = new Map(folders.map((f) => [f.id, f.name]));
      for (let i = 0; i < bookmarks.length; i += BATCH) {
        await put({ bookmarks: bookmarks.slice(i, i + BATCH).map((b) => ({ ...b, folderName: b.folderId ? names.get(b.folderId) : null })), import: { stage: i + BATCH >= bookmarks.length ? 1 : 0 } });
      }
      await put({ import: { stage: 3, status: "done" } });
      // The polling screen picks this up and moves on to "All sorted".
      setState({ busy: false });
    } catch (e) {
      setState({ busy: false, message: e instanceof Error ? e.message : "Upload failed." });
    }
  }

  return (
    <div className="flex flex-col gap-2 border border-ink p-5">
      <label htmlFor={id} className="text-[17px]">Or upload a bookmarks file</label>
      <p className="text-sm text-ink-muted">Exported from Chrome, Edge, Brave, Firefox or Safari as HTML.</p>
      <input
        id={id}
        type="file"
        accept=".html,.htm,text/html"
        disabled={state.busy}
        onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }}
        className="text-sm file:mr-3 file:h-10 file:cursor-pointer file:rounded-pill file:border-[1.5px] file:border-ink file:bg-transparent file:px-5 file:text-sm hover:file:bg-white disabled:opacity-50"
      />
      {state.busy && <p className="text-sm" role="status">Uploading…</p>}
      {state.message && <p role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm">{state.message}</p>}
    </div>
  );
}
