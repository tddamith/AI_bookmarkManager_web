import { importBatch, type ImportInput } from "@/lib/library";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;

const MAX_ITEMS = 5000;
const str = (v: unknown, max: number) => (typeof v === "string" && v.length <= max ? v : null);

/**
 * Extension → web sync. Auth: `Authorization: Bearer <session token>`.
 * PUT { folders?: [{id,name}], bookmarks?: [{id?,url,title?,folderId?}], import?: {total?,stage?,status?,dead?} }
 * Send in batches (≤5000 items) while importing; finish with { import: { status: "done" } }.
 */
export async function PUT(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") return json({ message: "Invalid JSON body." }, 400);

  const input: ImportInput = {};
  if (Array.isArray(raw.folders)) {
    if (raw.folders.length > MAX_ITEMS) return json({ message: "Too many folders in one request." }, 413);
    input.folders = raw.folders.flatMap((f: { id?: unknown; name?: unknown }) => {
      const id = str(f?.id, 100), name = str(f?.name, 200);
      return id && name ? [{ id, name }] : [];
    });
  }
  if (Array.isArray(raw.bookmarks)) {
    if (raw.bookmarks.length > MAX_ITEMS) return json({ message: "Too many bookmarks in one request." }, 413);
    input.bookmarks = raw.bookmarks.flatMap((b: { id?: unknown; url?: unknown; title?: unknown; folderId?: unknown }) => {
      const url = str(b?.url, 2048);
      if (!url || !/^https?:\/\//i.test(url)) return [];
      const at = (b as { savedAt?: unknown }).savedAt;
      return [{ url, id: str(b.id, 100) ?? undefined, title: str(b.title, 500) ?? undefined, folderId: str(b.folderId, 100), folderName: str((b as { folderName?: unknown }).folderName, 200), savedAt: typeof at === "number" && at > 0 && at <= Date.now() ? at : undefined }];
    });
  }
  if (raw.import && typeof raw.import === "object") input.import = raw.import as ImportInput["import"];

  try {
    await importBatch(auth.ctx, input);
  } catch {
    return json({ message: "We couldn't save that batch. Please try again." }, 502);
  }
  return json({ ok: true });
}
