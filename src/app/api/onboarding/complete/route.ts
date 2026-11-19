import { NextResponse } from "next/server";
import { ONBOARDED_COOKIE } from "@/lib/auth";
import { markOnboarded } from "@/lib/auth-store";
import { getSession } from "@/lib/session";

/** Records that the user has seen the Get started screen, so it is never shown again. */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  await markOnboarded(session.userId);
  const res = NextResponse.json({ ok: true });
  // Per-browser fallback for external backends that don't store the flag.
  res.cookies.set(ONBOARDED_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
  return res;
}
