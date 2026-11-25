import { unreachable } from "@/lib/backend";
import { devices } from "@/lib/billing";
import { billingAuth, fromBackend, ok } from "@/lib/billing-http";

/** GET — devices that sync this library, and the plan's device limit. */
export async function GET(request: Request) {
  const auth = await billingAuth();
  if ("error" in auth) return auth.error;
  try {
    const r = await devices({ token: auth.token, request });
    return r.ok ? ok({ devices: r.data.devices ?? [], limit: r.data.limit ?? null }) : fromBackend(r, "We couldn't load your devices.");
  } catch {
    return unreachable();
  }
}
