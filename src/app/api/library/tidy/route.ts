import { getSource } from "@/lib/library";
import { tidyData } from "@/lib/tidy";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;

/** GET /api/library/tidy — suggestions only (loose bookmarks → folder, folders to merge, import duplicate/dead counts). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  try {
    return json(tidyData(await getSource(auth.ctx)));
  } catch {
    return json({ message: "We couldn't check your library." }, 502);
  }
}
