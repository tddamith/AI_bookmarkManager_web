import { unreachable } from "@/lib/backend";
import { reactivateSubscription } from "@/lib/billing";
import { billingAuth, fromBackend, ok } from "@/lib/billing-http";

/** POST — resumes a subscription PayPal suspended after failed payments (once the payment method is fixed). */
export async function POST(request: Request) {
  const auth = await billingAuth();
  if ("error" in auth) return auth.error;
  try {
    const r = await reactivateSubscription({ token: auth.token, request });
    return r.ok ? ok({ ok: true, subscription: r.data.subscription }) : fromBackend(r, "We couldn't reactivate your subscription.");
  } catch {
    return unreachable();
  }
}
