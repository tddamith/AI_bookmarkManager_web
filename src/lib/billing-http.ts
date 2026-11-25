import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { jsonError, readJson, type BackendResult } from "@/lib/backend";
import { billingEnabled } from "@/lib/billing";
import { billingErrorMessage, type Billing } from "@/lib/plans";

const noStore = { "cache-control": "no-store" };
export const ok = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

/** The session token for billing calls, or a ready error response. */
export async function billingAuth(): Promise<{ token: string } | { error: NextResponse }> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return { error: jsonError("Please sign in.", 401) };
  if (!billingEnabled()) return { error: jsonError(billingErrorMessage("paypal_not_configured"), 503, { code: "paypal_not_configured" }) };
  return { token };
}

export async function readPeriod(request: Request): Promise<Billing | null> {
  const body = await readJson<{ period?: unknown; billing?: unknown }>(request);
  const v = body?.period ?? body?.billing;
  return v === "monthly" || v === "yearly" ? v : null;
}

/** Maps an API failure to { message, code } with a sensible status. */
export function fromBackend(r: BackendResult, fallback?: string) {
  const code = r.data.error;
  const status = r.status === 401 ? 401 : r.status >= 500 ? 502 : r.status || 502;
  return jsonError(billingErrorMessage(code, fallback), status, code ? { code } : {});
}
