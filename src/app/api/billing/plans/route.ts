import { getCatalog } from "@/lib/billing";
import { ok } from "@/lib/billing-http";

/** GET — public plan catalog (prices, limits, features) from the API. */
export async function GET() {
  return ok(await getCatalog());
}
