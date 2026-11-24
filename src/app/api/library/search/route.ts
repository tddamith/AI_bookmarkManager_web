import { getSource } from "@/lib/library";
import { searchDocs, sidebarData } from "@/lib/library-store";
import { suggest, type Filter } from "@/lib/search";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;

/** GET /api/library/search?q=<text>&f=<k:v>&f=<k:v> — grouped suggestions over everything, including AI summaries. */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const p = new URL(req.url).searchParams;
  const filters = p.getAll("f").slice(0, 6).flatMap((f): Filter[] => {
    const i = f.indexOf(":");
    const k = f.slice(0, i);
    return i > 0 && ["site", "tag", "folder", "is"].includes(k) ? [{ k: k as Filter["k"], v: f.slice(i + 1).slice(0, 200) }] : [];
  });
  try {
    const src = await getSource(auth.ctx);
    return json(suggest(searchDocs(src), (p.get("q") ?? "").slice(0, 200), filters, sidebarData(src).folders));
  } catch {
    return json({ message: "We couldn't search your library." }, 502);
  }
}
