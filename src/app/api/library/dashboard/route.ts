import { getSource } from "@/lib/library";
import { dashboardData } from "@/lib/library-store";
import { json, preflight, requireUser } from "@/lib/sync-http";

export const OPTIONS = preflight;

/** GET /api/library/dashboard?range=week|month&tz=<minutes, as JS getTimezoneOffset()> */
export async function GET(req: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  const p = new URL(req.url).searchParams;
  const tz = Number(p.get("tz"));
  try {
    const src = await getSource(auth.ctx);
    return json(dashboardData(src, p.get("range") === "month" ? "month" : "week", Number.isFinite(tz) && Math.abs(tz) <= 840 ? tz : 0));
  } catch {
    return json({ message: "We couldn't load your dashboard." }, 502);
  }
}
