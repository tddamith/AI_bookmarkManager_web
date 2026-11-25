import { readJson, unreachable } from "@/lib/backend";
import { cancelSubscription } from "@/lib/billing";
import { billingAuth, fromBackend, ok } from "@/lib/billing-http";

/** POST { reason? } — stops renewal at PayPal. Pro stays until the end of the period already paid for. */
export async function POST(request: Request) {
  const auth = await billingAuth();
  if ("error" in auth) return auth.error;
  const body = await readJson<{ reason?: unknown }>(request);
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 120) : "";
  try {
    const r = await cancelSubscription({ token: auth.token, request }, reason);
    return r.ok ? ok({ ok: true, subscription: r.data.subscription }) : fromBackend(r, "We couldn't cancel your subscription. Please try again.");
  } catch {
    return unreachable();
  }
}
