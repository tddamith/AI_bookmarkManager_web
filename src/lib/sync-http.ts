import "server-only";
import { NextResponse } from "next/server";

/** The extension calls these routes from its own origin with a Bearer token (no cookies), so open CORS is safe. */
export const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,PUT,POST,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
  "access-control-max-age": "86400",
};
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { ...cors, "cache-control": "no-store" } });
export const preflight = () => new NextResponse(null, { status: 204, headers: cors });

import { getSession } from "@/lib/session";

/**
 * Shared guard for library routes. Returns the user id, or a ready 401 response.
 */
export async function requireUser() {
  const session = await getSession();
  return session ? { ctx: { userId: session.userId, token: session.token } } : { error: json({ message: "Please sign in." }, 401) };
}
