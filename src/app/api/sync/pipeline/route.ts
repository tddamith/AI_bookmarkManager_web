import { after } from "next/server";
import { startImportJob } from "@/lib/import-job";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;

/**
 * POST /api/sync/pipeline — start, retry or resume the background import pipeline (dedupe → folders → tags & summaries).
 * Safe to call repeatedly: it never starts a second job, and it never starts while the browser extension is importing.
 * → { started: boolean, reason?: "running" | "extension" | "nothing" | "done" }
 */
export async function POST() {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  try {
    const r = await startImportJob(auth.ctx);
    // after(): keeps the work alive past the response on platforms that would otherwise freeze it.
    if (r.started) after(async () => { await r.promise; });
    return json(r.started ? { started: true } : { started: false, reason: r.reason });
  } catch {
    return json({ message: "We couldn't start sorting your bookmarks." }, 502);
  }
}
