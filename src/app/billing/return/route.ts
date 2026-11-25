import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { PLAN_COOKIE, SESSION_COOKIE, isSecureRequest } from "@/lib/auth";
import { confirmSubscription, siteOrigin } from "@/lib/billing";

/**
 * PayPal sends the buyer here after approving (?subscription_id=…) or abandoning (?cancelled=1) checkout.
 * The query string is only a hint: the API fetches the subscription from PayPal and checks it belongs to this account
 * before Pro is granted. Then the buyer lands on Plan & billing with the outcome.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = siteOrigin(request);
  const to = (outcome: string) => {
    const res = NextResponse.redirect(new URL(`/account/billing?checkout=${outcome}`, origin), 303);
    res.headers.set("cache-control", "no-store");
    return res;
  };

  if (url.searchParams.get("cancelled") === "1") return to("cancelled");
  const sid = url.searchParams.get("subscription_id") ?? "";
  if (!/^[A-Za-z0-9-]{5,64}$/.test(sid)) return to("failed");
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL(`/signin?next=${encodeURIComponent("/account/billing?checkout=pending")}`, origin), 303);

  try {
    const r = await confirmSubscription({ token, request }, sid);
    if (r.status === 401) return NextResponse.redirect(new URL(`/signin?next=${encodeURIComponent("/account/billing?checkout=pending")}`, origin), 303);
    if (!r.ok) return to(r.data.error === "not_yours" ? "mismatch" : "pending");
    const pro = r.data.subscription?.pro === true && r.data.paypalStatus === "ACTIVE";
    const res = to(pro ? (url.searchParams.get("change") === "1" ? "changed" : "success") : "pending");
    if (pro) res.cookies.set(PLAN_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: isSecureRequest(request), path: "/", maxAge: 60 * 60 * 24 * 365 });
    return res;
  } catch {
    return to("pending");
  }
}
