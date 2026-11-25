import { jsonError, unreachable } from "@/lib/backend";
import { siteOrigin, subscribe } from "@/lib/billing";
import { billingAuth, fromBackend, ok, readPeriod } from "@/lib/billing-http";
import { getProPlanId, getProPrice, PRICING } from "@/config/pricing";

/**
 * POST { period: "monthly" | "yearly" } — starts a PayPal subscription checkout and returns { url } (PayPal's approval page).
 *
 * The amount comes from src/config/pricing.ts (getProPrice), the same source as the price shown on /plans. It is sent along as
 * `expectedAmount` (and the matching PayPal plan as `planId`, e.g. during a promo) so the API refuses to start a checkout whose
 * PayPal plan charges something else (409 price_mismatch).
 * PayPal sends the buyer back to /billing/return, which verifies the payment with the API before anything changes.
 * Renewing after a cancellation: the first charge waits until the current paid period ends (the API handles that).
 */
export async function POST(request: Request) {
  const auth = await billingAuth();
  if ("error" in auth) return auth.error;
  const period = await readPeriod(request);
  if (!period) return jsonError("Choose monthly or yearly billing.", 422);

  const monthly = period === "monthly";
  if (monthly && PRICING.pro.monthlyPrice == null) return jsonError("Pro is billed yearly.", 422, { code: "monthly_unavailable" });
  const price = getProPrice(new Date());
  const amount = monthly ? PRICING.pro.monthlyPrice! : price.current;
  const planId = monthly ? "" : getProPlanId(price);

  const origin = siteOrigin(request);
  try {
    const r = await subscribe({ token: auth.token, request }, period, `${origin}/billing/return`, `${origin}/billing/return?cancelled=1`, {
      expectedAmount: amount,
      currency: PRICING.currency,
      ...(planId ? { planId } : {}),
    });
    const url = r.data.approveUrl;
    if (r.ok && typeof url === "string" && url.startsWith("https://")) return ok({ ok: true, url, startsAt: r.data.startsAt ?? null });
    return fromBackend(r, "We couldn't start checkout. Please try again.");
  } catch {
    return unreachable();
  }
}
