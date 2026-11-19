import { NextResponse } from "next/server";
import { PLAN_COOKIE, isSecureRequest } from "@/lib/auth";
import { markPlanChosen } from "@/lib/auth-store";
import { getSession } from "@/lib/session";

/** Records that the user has picked the Free plan (or chosen to decide later), so verification no longer sends them to /plans. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  await markPlanChosen(session.userId);
  const res = NextResponse.json({ ok: true });
  // Per-browser fallback for external backends that don't store it.
  res.cookies.set(PLAN_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: isSecureRequest(request), path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
