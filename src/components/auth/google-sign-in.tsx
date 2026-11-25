"use client";

import { useRouter } from "next/navigation";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";

/** The slice of Google Identity Services (https://accounts.google.com/gsi/client) we use. */
type CredentialResponse = { credential?: string };
type Gsi = {
  accounts: {
    id: {
      initialize(config: Record<string, unknown>): void;
      renderButton(el: HTMLElement, options: Record<string, unknown>): void;
      prompt(): void;
      cancel(): void;
    };
  };
};
declare global {
  interface Window {
    google?: Gsi;
  }
}

/**
 * "Sign in with Google" the way most sites do it: Google's own button opens a small popup (no page redirect), and
 * One Tap offers the signed-in Google account in the corner. Google returns a signed ID token to the callback below,
 * which our server verifies (signature, audience, nonce) before creating the session.
 *
 * Google Cloud Console → the OAuth client → "Authorized JavaScript origins" must list this site's origin
 * (for local development: http://localhost:3000 and http://localhost).
 */
export function GoogleSignIn({ clientId, from, next }: { clientId: string; from: "signin" | "signup"; next?: string | null }) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const rearm = useRef<() => void>(() => undefined);

  const setup = useCallback(async () => {
    const google = window.google;
    if (!google || !box.current) return;
    let nonce: string;
    try {
      const res = await fetch("/api/auth/google/nonce", { method: "POST" });
      nonce = ((await res.json()) as { nonce: string }).nonce;
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      return;
    }

    const onCredential = async ({ credential }: CredentialResponse) => {
      if (!credential) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/auth/google/token", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ credential, next }),
        });
        const data = (await res.json().catch(() => ({}))) as { redirect?: string; message?: string };
        if (res.ok && data.redirect) {
          router.push(data.redirect);
          router.refresh();
          return;
        }
        setError(data.message ?? "We couldn't sign you in with Google. Please try again.");
      } catch {
        setError("We couldn't reach the server. Check your connection and try again.");
      }
      setBusy(false);
      rearm.current(); // the nonce is single-use: arm the button again with a fresh one
    };

    google.accounts.id.initialize({
      client_id: clientId,
      nonce,
      callback: onCredential,
      ux_mode: "popup",
      context: from === "signup" ? "signup" : "signin",
      auto_select: false,
      cancel_on_tap_outside: true,
      itp_support: true,
      use_fedcm_for_prompt: true,
    });
    box.current.replaceChildren();
    google.accounts.id.renderButton(box.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text: from === "signup" ? "signup_with" : "continue_with",
      logo_alignment: "center",
      width: Math.min(400, Math.max(200, box.current.offsetWidth || 400)),
    });
    google.accounts.id.prompt(); // One Tap (Google decides when to show it)
    setReady(true);
  }, [clientId, from, next, router]);

  // <Script onReady> runs on first load AND on every later mount, so setup happens exactly once per mount.
  useEffect(() => () => window.google?.accounts.id.cancel(), []);
  useEffect(() => {
    rearm.current = () => void setup();
  }, [setup]);

  return (
    <div className="flex flex-col gap-2">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => void setup()}
        onError={() => setError("Google sign-in couldn't load. Check your connection or ad blocker, or use your email below.")}
      />
      <div className="relative flex min-h-11 justify-center" aria-busy={busy}>
        <div ref={box} className={`flex w-full justify-center ${busy ? "pointer-events-none opacity-40" : ""}`} />
        {!ready && !error && <div className="absolute inset-0 rounded-pill border-[1.5px] border-ink/30" aria-hidden="true" />}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center gap-2 text-sm" role="status">
            <span className="size-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" aria-hidden="true" />
            Signing you in…
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm text-ink">
          {error}
        </p>
      )}
    </div>
  );
}
