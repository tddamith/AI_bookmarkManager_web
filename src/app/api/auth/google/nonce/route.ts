import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { GSI_NONCE_COOKIE, isSecureRequest } from "@/lib/auth";

/**
 * POST /api/auth/google/nonce — a fresh nonce for the "Sign in with Google" button.
 * Google copies it into the ID token; /api/auth/google/token only accepts a token whose nonce matches this browser's
 * httpOnly cookie, so a leaked or intercepted token can't be replayed from anywhere else.
 */
export function POST(request: Request) {
  const nonce = randomBytes(24).toString("base64url");
  const res = NextResponse.json({ nonce }, { headers: { "cache-control": "no-store" } });
  res.cookies.set(GSI_NONCE_COOKIE, nonce, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "strict",
    path: "/api/auth/google",
    maxAge: 900,
  });
  return res;
}
