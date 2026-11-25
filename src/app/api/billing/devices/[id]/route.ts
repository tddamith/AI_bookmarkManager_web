import { jsonError, unreachable } from "@/lib/backend";
import { removeDevice } from "@/lib/billing";
import { billingAuth, fromBackend, ok } from "@/lib/billing-http";

/** DELETE — frees a device slot (that device can sync again later if the plan allows). */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return jsonError("Device not found.", 404);
  const auth = await billingAuth();
  if ("error" in auth) return auth.error;
  try {
    const r = await removeDevice({ token: auth.token, request }, id);
    return r.ok ? ok({ ok: true }) : fromBackend(r, "Device not found.");
  } catch {
    return unreachable();
  }
}
