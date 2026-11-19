import { patchBookmark, removeBookmark } from "@/lib/library";
import type { MarkPatch } from "@/lib/library-store";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;
type Ctx = { params: Promise<{ id: string }> };

/** PATCH { title?, folderName?, later?, fav?, tags? } */
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return json({ message: "Invalid JSON body." }, 400);
  const patch: MarkPatch = {};
  if (typeof b.title === "string") patch.title = b.title;
  if (typeof b.later === "boolean") patch.later = b.later;
  if (typeof b.fav === "boolean") patch.fav = b.fav;
  if (typeof b.folderName === "string" || b.folderName === null) patch.folderName = b.folderName as string | null;
  if (Array.isArray(b.tags)) patch.tags = b.tags.filter((t): t is string => typeof t === "string");
  return (await patchBookmark(auth.ctx, id, patch)) ? json({ ok: true }) : json({ message: "Bookmark not found." }, 404);
}

export async function DELETE(req: Request, { params }: Ctx) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  return (await removeBookmark(auth.ctx, id)) ? json({ ok: true }) : json({ message: "Bookmark not found." }, 404);
}
