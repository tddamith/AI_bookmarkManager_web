import { jsonError, unreachable } from "@/lib/backend";
import { changeBilling, siteOrigin } from "@/lib/billing";
import { billingAuth, fromBackend, ok, readPeriod } from "@/lib/billing-http";

/** POST { period } — switch an active subscription between monthly and yearly. Returns { url } for PayPal approval. */
export async function POST(request: Request) {
  const auth = await billingAuth();
  if ("error" in auth) return auth.error;
  const period = await readPeriod(request);
  if (!period) return jsonError("Choose monthly or yearly billing.", 422);
  const origin = siteOrigin(request);
  try {
    const r = await changeBilling({ token: auth.token, request }, period, `${origin}/billing/return?change=1`, `${origin}/billing/return?cancelled=1`);
    const url = r.data.approveUrl;
    if (r.ok && typeof url === "string" && url.startsWith("https://")) return ok({ ok: true, url });
    return fromBackend(r, "We couldn't change your plan. Please try again.");
  } catch {
    return unreachable();
  }
}
