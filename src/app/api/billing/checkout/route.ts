import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, authApiUrl } from "@/lib/auth";
import { verifyToken } from "@/lib/auth-store";
import { getProPlanId, getProPrice, PRICING } from "@/config/pricing";

/**
 * Starts a PayPal checkout for the Pro plan.
 * Backend: POST {AUTH_API_URL}/paypal/create  { billing: "monthly"|"yearly" }  → PayPal approval URL (`approveUrl`; `url`, `approval_url` and `approvalUrl` are accepted too)
 * with `Authorization: Bearer <session token>`. The browser is then sent to `url` (PayPal approval page).
 *
 * The amount comes from src/config/pricing.ts (getProPrice), the same source as the price shown on /plans. It is sent along as
 * `expectedAmount` (and the matching PayPal plan as `planId`) so the API can refuse to start a checkout whose plan charges something else.
 */
export async function POST(req: Request) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const base = authApiUrl();
  if (!token || (!base && !verifyToken(token))) {
    return NextResponse.json({ message: "Please sign in to upgrade." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { period?: unknown } | null;
  const period = body?.period === "monthly" ? "monthly" : body?.period === "yearly" ? "yearly" : null;
  if (!period) return NextResponse.json({ message: "Choose monthly or yearly billing." }, { status: 422 });

  const monthly = period === "monthly";
  if (monthly && PRICING.pro.monthlyPrice == null) return NextResponse.json({ message: "Pro is billed yearly." }, { status: 422 });
  const price = getProPrice(new Date());
  const amount = monthly ? PRICING.pro.monthlyPrice : price.current;
  const planId = monthly ? "" : getProPlanId(price);

  if (!base) return NextResponse.json({ message: "Payments aren't available yet. Continue with Free for now." }, { status: 503 });

  try {
    const res = await fetch(`${base}/paypal/create`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ billing: period, plan: "pro", period, expectedAmount: amount, currency: PRICING.currency, ...(planId ? { planId } : {}) }),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string; approval_url?: string; approvalUrl?: string; approveUrl?: string; message?: string; error?: string };
    const url = data.approveUrl ?? data.url ?? data.approval_url ?? data.approvalUrl;
    if (res.ok && typeof url === "string" && /^https:\/\//.test(url)) {
      return NextResponse.json({ ok: true, url });
    }
    if (data.error === "price_mismatch") return NextResponse.json({ message: "The price changed. Reload the page to see the current price." }, { status: 409 });
    if (data.error === "paypal_not_configured") return NextResponse.json({ message: "Payments aren't available yet. Continue with Free for now." }, { status: 503 });
    if (res.status === 401) return NextResponse.json({ message: "Your session expired. Please sign in again." }, { status: 401 });
    return NextResponse.json({ message: data.message ?? "We couldn't start checkout. Please try again." }, { status: 502 });
  } catch {
    return NextResponse.json({ message: "We couldn't reach the payment service. Please try again." }, { status: 502 });
  }
}
