import { openBookmark } from "@/lib/library";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;

/** POST — records an open (feeds the dashboard) and returns the page URL. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const url = await openBookmark(auth.ctx, id);
  return url ? json({ ok: true, url }) : json({ message: "Bookmark not found." }, 404);
}
