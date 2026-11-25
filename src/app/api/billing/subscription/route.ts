import { jsonError, unreachable } from "@/lib/backend";
import { getOverview } from "@/lib/billing";
import { billingAuth, ok } from "@/lib/billing-http";

/** GET [?refresh=1] — current subscription, plan limits + usage, and the catalog. refresh=1 re-checks PayPal now. */
export async function GET(request: Request) {
  const auth = await billingAuth();
  if ("error" in auth) return auth.error;
  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  try {
    const data = await getOverview(auth.token, refresh);
    return data ? ok(data) : jsonError("Your session expired. Please sign in again.", 401);
  } catch {
    return unreachable();
  }
}
