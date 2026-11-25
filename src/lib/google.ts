import "server-only";

/**
 * The OAuth callback URL. It must be registered on the Google client AND in the backend's GOOGLE_REDIRECT_URIS.
 * Set GOOGLE_REDIRECT_URI explicitly in production (behind a proxy the request URL may show an internal host).
 */
export function googleRedirectUri(request: Request) {
  return process.env.GOOGLE_REDIRECT_URI || new URL("/api/auth/google/callback", request.url).toString();
}
