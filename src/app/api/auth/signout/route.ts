import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authApiUrl, SESSION_COOKIE } from "@/lib/auth";

/** Revokes the token on the backend (so it stops working everywhere), then clears the cookie. */
export async function POST() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const base = authApiUrl();
  let revoked = true;
  if (token && base) {
    try {
      const r = await fetch(`${base}/auth/logout`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      revoked = r.ok || r.status === 401;     // 401 = already invalid, fine
    } catch {
      revoked = false;
    }
  }
  const res = NextResponse.json({ ok: true, revoked });
  res.cookies.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
