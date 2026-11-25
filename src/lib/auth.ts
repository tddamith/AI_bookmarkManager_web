export const SESSION_COOKIE = "tidypin_session";
export const THIRTY_DAYS = 60 * 60 * 24 * 30;
export const ONBOARDED_COOKIE = "tidypin_onboarded";
export const PLAN_COOKIE = "tidypin_plan"; // set once the user has picked (or skipped) a plan
export const OAUTH_COOKIE = "tidypin_oauth"; // short-lived Google sign-in state (state, PKCE verifier, nonce)
export const GSI_NONCE_COOKIE = "tidypin_gnonce"; // nonce for the Sign in with Google button / One Tap

/** Backend base URL, e.g. https://api.tidypin.com — set AUTH_API_URL in .env.local */
export const authApiUrl = () => (process.env.AUTH_API_URL ?? "").replace(/\/$/, "");

/**
 * Only allow same-site relative redirects (blocks open-redirects like //evil.com, https://evil.com, /\evil.com and
 * "/\t/evil.com" — browsers strip tabs/newlines, which would turn it into //evil.com).
 */
export function safeNext(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || value.length > 512 || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

/** Friendly text for the ?error= codes the auth routes redirect with. */
export function authErrorMessage(code: string | null | undefined): string | null {
  switch (code) {
    case "unavailable":
    case "google_unavailable":
      return "Google sign-in isn't available right now. Use your email and password.";
    case "google_cancelled":
      return "Google sign-in was cancelled.";
    case "google_expired":
      return "Your Google sign-in timed out or was interrupted. Please try again.";
    case "google_unverified":
      return "Your Google account's email isn't verified. Verify it with Google, or use your email and password.";
    case "google_conflict":
      return "This email is already linked to a different Google account. Sign in with your password instead.";
    case "rate_limited":
      return "Too many attempts. Wait a few minutes and try again.";
    case "google_failed":
      return "We couldn't sign you in with Google. Please try again.";
    default:
      return null;
  }
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
  if (password.length > 200) return { field: "password" as const, message: "Password is too long." };
  if (input.terms !== true) return { field: "terms" as const, message: "Accept the Terms and Privacy Policy to continue." };
  return null;
}

export type ResetField = "email" | "code" | "password";

/** Shared by the forgot-password form and its API routes. */
export function validateForgot(input: { email?: unknown }) {
  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (!email) return { field: "email" as const, message: "Enter your email." };
  if (!EMAIL.test(email) || email.length > 254) return { field: "email" as const, message: "Enter a valid email address." };
  return null;
}

export function validateReset(input: { email?: unknown; code?: unknown; password?: unknown; confirm?: unknown }) {
  const bad = validateForgot(input);
  if (bad) return bad;
  const code = typeof input.code === "string" ? input.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return { field: "code" as const, message: "Enter the 6-digit code from your email." };
  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < 8) return { field: "password" as const, message: "Use at least 8 characters." };
  if (password.length > 200) return { field: "password" as const, message: "Password is too long." };
  if (input.confirm !== undefined && input.confirm !== password) return { field: "password" as const, message: "The passwords don't match." };
  return null;
}

/** Mark cookies Secure only when the request really is HTTPS (so http://localhost keeps working in Safari). */
export const isSecureRequest = (req: Request) =>
  (req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "")) === "https";
