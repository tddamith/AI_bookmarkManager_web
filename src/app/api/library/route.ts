import { getSource } from "@/lib/library";
import { listLibrary } from "@/lib/library-store";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;

/** GET /api/library?view=all|later|fav&folder=<id>&q=<text> — bookmarks, folders and sidebar counts. */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const p = new URL(req.url).searchParams;
  try {
    const src = await getSource(auth.ctx);
    return json(listLibrary(src, { view: p.get("view") ?? undefined, folderId: p.get("folder") ?? undefined, q: (p.get("q") ?? "").slice(0, 200), site: p.get("site") ?? undefined, tag: p.get("tag") ?? undefined, folderName: p.get("folderName") ?? undefined, fav: p.get("fav") === "1", later: p.get("later") === "1" }));
  } catch {
    return json({ message: "We couldn't load your bookmarks." }, 502);
  }
}
