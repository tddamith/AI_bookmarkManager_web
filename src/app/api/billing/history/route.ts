import { unreachable } from "@/lib/backend";
import { paymentHistory } from "@/lib/billing";
import { billingAuth, fromBackend, ok } from "@/lib/billing-http";

/** GET — PayPal payments for this account's subscriptions, newest first. */
export async function GET(request: Request) {
  const auth = await billingAuth();
  if ("error" in auth) return auth.error;
  try {
    const r = await paymentHistory({ token: auth.token, request });
    return r.ok ? ok({ payments: r.data.payments ?? [] }) : fromBackend(r, "We couldn't load your payments.");
  } catch {
    return unreachable();
  }
}
