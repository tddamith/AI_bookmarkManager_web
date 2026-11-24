import { getSource } from "@/lib/library";
import { sidebarData } from "@/lib/library-store";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;

/** GET /api/library/folders — just the sidebar: nav counts + folders (highest count first). Cheap to prefetch. */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  try {
    return json(sidebarData(await getSource(auth.ctx)));
  } catch {
    return json({ message: "We couldn't load your folders." }, 502);
  }
}
