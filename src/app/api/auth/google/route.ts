import { NextResponse } from "next/server";
import { authApiUrl } from "@/lib/auth";

/** Starts Google sign-in on the backend: GET `${AUTH_API_URL}/auth/google` (it should redirect back to /dashboard). */
export function GET(request: Request) {
  const base = authApiUrl();
  const url = new URL(request.url);
  if (!base) return NextResponse.redirect(new URL("/signin?error=unavailable", url.origin));
  return NextResponse.redirect(`${base}/auth/google?redirect=${encodeURIComponent(`${url.origin}/dashboard`)}`);
}
