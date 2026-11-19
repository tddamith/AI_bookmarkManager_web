export const SESSION_COOKIE = "tidypin_session";
export const THIRTY_DAYS = 60 * 60 * 24 * 30;
export const ONBOARDED_COOKIE = "tidypin_onboarded";
export const PLAN_COOKIE = "tidypin_plan"; // set once the user has picked (or skipped) a plan

/** Backend base URL, e.g. https://api.tidypin.com — set AUTH_API_URL in .env.local */
export const authApiUrl = () => (process.env.AUTH_API_URL ?? "").replace(/\/$/, "");

/** Only allow same-site relative redirects (blocks open-redirects like //evil.com or https://evil.com). */
export function safeNext(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

export type SignInBody = { email: string; password: string; remember: boolean };
export type SignInResult = { ok: true; next?: string } | { ok: false; message: string; field?: "email" | "password" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Shared by the client form and the API route. */
export function validateSignIn(input: { email?: unknown; password?: unknown }) {
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!email) return { field: "email" as const, message: "Enter your email." };
  if (!EMAIL.test(email) || email.length > 254) return { field: "email" as const, message: "Enter a valid email address." };
  if (!password) return { field: "password" as const, message: "Enter your password." };
  if (password.length > 256) return { field: "password" as const, message: "Password is too long." };
  return null;
}

export type SignUpField = "name" | "email" | "password" | "terms";

/** Shared by the client form and the API route. */
export function validateSignUp(input: { name?: unknown; email?: unknown; password?: unknown; terms?: unknown }) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { field: "name" as const, message: "Enter your name." };
  if (name.length > 100) return { field: "name" as const, message: "Name is too long." };
  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (!email) return { field: "email" as const, message: "Enter your email." };
  if (!EMAIL.test(email) || email.length > 254) return { field: "email" as const, message: "Enter a valid email address." };
  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < 8) return { field: "password" as const, message: "Use at least 8 characters." };
  if (password.length > 256) return { field: "password" as const, message: "Password is too long." };
  if (input.terms !== true) return { field: "terms" as const, message: "Accept the Terms and Privacy Policy to continue." };
  return null;
}

/** Mark cookies Secure only when the request really is HTTPS (so http://localhost keeps working in Safari). */
export const isSecureRequest = (req: Request) =>
  (req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "")) === "https";
