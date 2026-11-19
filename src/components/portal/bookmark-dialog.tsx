"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { fieldInput, fieldLabel, fieldWrap } from "@/components/auth/field-styles";
import type { Bookmark } from "@/components/portal/types";

export type DialogState = { mode: "add" } | { mode: "edit"; mark: Bookmark } | null;

export function BookmarkDialog({ state, folders, onClose, onSaved }: {
  state: DialogState; folders: string[]; onClose: () => void; onSaved: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (state && !d.open) d.showModal();
    if (!state && d.open) d.close();
  }, [state]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !state) return;
    const f = new FormData(e.currentTarget);
    const body = {
      title: String(f.get("title") ?? ""),
      folderName: String(f.get("folder") ?? "").trim() || null,
      ...(state.mode === "add" ? { url: String(f.get("url") ?? "") } : { fav: f.get("fav") === "on", later: f.get("later") === "on" }),
    };
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(state.mode === "add" ? "/api/library/bookmarks" : `/api/library/bookmarks/${state.mark.id}`, {
        method: state.mode === "add" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(((await res.json().catch(() => ({}))) as { message?: string }).message ?? "Something went wrong. Please try again.");
        setBusy(false);
        return;
      }
      setBusy(false);
      onSaved();
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  const mark = state?.mode === "edit" ? state.mark : null;
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby={`${id}-t`} className="m-auto w-[min(440px,calc(100%-32px))] rounded-card border-[1.5px] border-ink bg-paper p-0 text-ink backdrop:bg-ink/40">
      {/* key resets the uncontrolled fields each time the dialog opens */}
      <form key={mark?.id ?? state?.mode ?? "closed"} onSubmit={submit} noValidate className="flex flex-col gap-[18px] p-7">
        <h2 id={`${id}-t`} className="text-3xl font-normal tracking-[-0.03em]">{mark ? "Edit bookmark" : "Add bookmark"}</h2>
        {!mark && (
          <div className={fieldWrap}>
            <label htmlFor={`${id}-url`} className={fieldLabel}>Web address —</label>
            <input id={`${id}-url`} name="url" type="text" inputMode="url" placeholder="example.com/page" autoFocus className={fieldInput} />
          </div>
        )}
        <div className={fieldWrap}>
          <label htmlFor={`${id}-title`} className={fieldLabel}>Title —</label>
          <input id={`${id}-title`} name="title" type="text" defaultValue={mark?.title ?? ""} placeholder={mark ? "" : "Optional"} className={fieldInput} />
        </div>
        <div className={fieldWrap}>
          <label htmlFor={`${id}-folder`} className={fieldLabel}>Folder —</label>
          <input id={`${id}-folder`} name="folder" list={`${id}-folders`} type="text" defaultValue={mark && mark.folder !== "Unsorted" ? mark.folder : ""} placeholder="Pick one or type a new name" className={fieldInput} />
          <datalist id={`${id}-folders`}>{folders.map((f) => <option key={f} value={f} />)}</datalist>
        </div>
        {mark && (
          <div className="flex gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="fav" defaultChecked={mark.fav} className="size-[18px] accent-ink" />Favorite</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="later" defaultChecked={mark.later} className="size-[18px] accent-ink" />Read later</label>
          </div>
        )}
        {error && <p role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={busy} className="h-12 flex-1 cursor-pointer rounded-pill bg-ink text-base font-medium text-white hover:bg-ink-muted disabled:cursor-not-allowed disabled:bg-disabled">
            {busy ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="h-12 cursor-pointer rounded-pill border-[1.5px] border-ink px-6 text-base hover:bg-white">Cancel</button>
        </div>
      </form>
    </dialog>
  );
}
