"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import {
  fieldInput,
  fieldLabel,
  fieldWrap,
} from "@/components/auth/field-styles";
import { RateLimitNotice } from "@/components/auth/rate-limit-notice";
import { formatWait, useRateLimit } from "@/components/auth/use-rate-limit";
import { links } from "@/lib/site";
import { safeNext, validateSignIn } from "@/lib/auth";

export function SignInForm({
  initialError = null,
}: {
  initialError?: string | null;
}) {
  const router = useRouter();
  const id = useId();
  const [error, setError] = useState<{
    field?: "email" | "password";
    message: string;
  } | null>(initialError ? { message: initialError } : null);
  const [loading, setLoading] = useState(false);
  const limit = useRateLimit("tidypin.rateLimit.v2.signin");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || limit.locked) return;
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const remember = form.get("remember") === "on";

    const invalid = validateSignIn({ email, password });
    if (invalid) {
      setError(invalid);
      document.getElementById(`${id}-${invalid.field}`)?.focus();
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        field?: "email" | "password";
        code?: string;
        retryIn?: number;
        verified?: boolean;
      };
      if (res.status === 429 && data.retryIn) {
        limit.lock(data.retryIn);
        setError(null);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        setError({
          message: data.message ?? "Something went wrong. Please try again.",
          field: data.field,
        });
        setLoading(false);
        return;
      }
      const next = safeNext(
        new URLSearchParams(window.location.search).get("next"),
      );
      // Email not verified yet → finish that first, then continue to where they were going.
      router.push(
        data.verified === false
          ? `/verify?next=${encodeURIComponent(next)}`
          : next,
      );
      router.refresh();
    } catch {
      setError({
        message:
          "We couldn't reach the server. Check your connection and try again.",
      });
      setLoading(false);
    }
  }

  const emailErr = error?.field === "email";
  const pwErr = error?.field === "password";

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-[18px]"
      aria-busy={loading}
    >
      <div className={`${fieldWrap} ${emailErr ? "border-b-2" : ""}`}>
        <label htmlFor={`${id}-email`} className={fieldLabel}>
          Email —
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          aria-invalid={emailErr}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={loading}
          className={fieldInput}
        />
      </div>

      <div className={`${fieldWrap} ${pwErr ? "border-b-2" : ""}`}>
        <div className="flex items-baseline justify-between">
          <label htmlFor={`${id}-password`} className={fieldLabel}>
            Password —
          </label>
          <Link href={links.forgot} className="text-xs">
            Forgot password?
          </Link>
        </div>
        <input
          id={`${id}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={pwErr}
          aria-describedby={error ? `${id}-error` : undefined}
          disabled={loading}
          className={fieldInput}
        />
      </div>

      <label className="flex items-center gap-2.5 text-sm text-ink-muted">
        <input
          type="checkbox"
          name="remember"
          defaultChecked
          className="m-0 size-[18px] accent-ink"
        />
        Keep me signed in
      </label>

      {limit.locked && <RateLimitNotice left={limit.left} id={`${id}-limit`} />}

      {error && !limit.locked && (
        <p
          id={`${id}-error`}
          role="alert"
          className="border-l-2 border-ink bg-white px-3 py-2 text-sm text-ink"
        >
          {error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || limit.locked}
        aria-describedby={limit.locked ? `${id}-limit` : undefined}
        className="flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-pill bg-ink text-[17px] font-medium text-white transition-colors hover:bg-ink-muted disabled:cursor-not-allowed disabled:bg-disabled"
      >
        {loading ? (
          <>
            <span
              className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              aria-hidden="true"
            />
            Signing in…
          </>
        ) : limit.locked ? (
          <span className="tabular-nums">
            Try again in {formatWait(limit.left)}
          </span>
        ) : (
          <>
            Sign in
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
