import { getSource } from "@/lib/library";
import { searchDocs, sidebarData } from "@/lib/library-store";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;
const MAX = 5000;

/** GET /api/library/index — a light search index (titles, domains, tags, folders; no summaries) for instant client-side suggestions. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  try {
    const src = await getSource(auth.ctx);
    const docs = searchDocs(src).slice(0, MAX).map((d) => ({ ...d, summary: "" }));
    return json({ docs, folders: sidebarData(src).folders });
  } catch {
    return json({ message: "We couldn't load the search index." }, 502);
  }
}
