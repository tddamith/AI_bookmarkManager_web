import { importSummary } from "@/lib/library";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;

/** Import progress + folders for the signed-in user (polled by the web Importing screen). */
export async function GET() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  try {
    return json(await importSummary(auth.ctx));
  } catch {
    return json({ message: "We couldn't load your import." }, 502);
  }
}
