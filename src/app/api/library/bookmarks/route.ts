import { addBookmark } from "@/lib/library";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;

/** POST { url, title?, folderName? } — save a bookmark from the web portal. */
export async function POST(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const body = (await req.json().catch(() => null)) as { url?: unknown; title?: unknown; folderName?: unknown } | null;
  let url = typeof body?.url === "string" ? body.url.trim() : "";
  if (url && !/^[a-z][a-z0-9+.-]*:/i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || url.length > 2048) throw new Error();
  } catch {
    return json({ message: "Enter a valid web address, like example.com/page.", field: "url" }, 422);
  }
  let res;
  try {
    res = await addBookmark(auth.ctx, {
    url,
    title: typeof body?.title === "string" ? body.title.slice(0, 500) : undefined,
    folderName: typeof body?.folderName === "string" ? body.folderName : null,
  });
  } catch {
    return json({ message: "We couldn't reach the server. Please try again." }, 502);
  }
  if (!res.ok) return res.reason === "exists" ? json({ message: "You've already saved this page.", field: "url" }, 409) : json({ message: "We couldn't save that bookmark. Check the address and try again.", field: "url" }, 422);
  return json({ ok: true, id: res.id }, 201);
}
