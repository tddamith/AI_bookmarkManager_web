"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import { safeNext, validateSignUp, type SignUpField } from "@/lib/auth";
import { fieldInput, fieldLabel, fieldWrap } from "@/components/auth/field-styles";
import { links } from "@/lib/site";


export function SignUpForm({ unavailable = false }: { unavailable?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [error, setError] = useState<{ field?: SignUpField; message: string } | null>(
    unavailable ? { message: "Google sign-up isn't available yet. Use your email and password." } : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      terms: form.get("terms") === "on",
    };

    const invalid = validateSignUp(payload);
    if (invalid) {
      setError(invalid);
      document.getElementById(`${id}-${invalid.field}`)?.focus();
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; field?: SignUpField; signedIn?: boolean };
      if (!res.ok) {
        setError({ message: data.message ?? "Something went wrong. Please try again.", field: data.field });
        setLoading(false);
        if (data.field) document.getElementById(`${id}-${data.field}`)?.focus();
        return;
      }
      if (data.signedIn === false) {
        router.push("/signin");
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next");
      // The verify screen picks the destination: plan screen if none chosen yet, otherwise welcome.
      router.push(next ? `/verify?next=${encodeURIComponent(safeNext(next))}` : "/verify");
      router.refresh();
    } catch {
      setError({ message: "We couldn't reach the server. Check your connection and try again." });
      setLoading(false);
    }
  }

  const bad = (f: SignUpField) => error?.field === f;
  const describe = error ? `${id}-error` : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[18px]" aria-busy={loading}>
      <div className={`${fieldWrap} ${bad("name") ? "border-b-2" : ""}`}>
        <label htmlFor={`${id}-name`} className={fieldLabel}>Name —</label>
        <input id={`${id}-name`} name="name" type="text" autoComplete="name" placeholder="Your name" aria-invalid={bad("name")} aria-describedby={describe} disabled={loading} className={fieldInput} />
      </div>

      <div className={`${fieldWrap} ${bad("email") ? "border-b-2" : ""}`}>
        <label htmlFor={`${id}-email`} className={fieldLabel}>Email —</label>
        <input id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" aria-invalid={bad("email")} aria-describedby={describe} disabled={loading} className={fieldInput} />
      </div>

      <div className={`${fieldWrap} ${bad("password") ? "border-b-2" : ""}`}>
        <label htmlFor={`${id}-password`} className={fieldLabel}>Password —</label>
        <input id={`${id}-password`} name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters" aria-invalid={bad("password")} aria-describedby={describe} disabled={loading} className={fieldInput} />
      </div>

      <label className="flex items-start gap-2.5 text-sm leading-[1.45] text-ink-muted">
        <input id={`${id}-terms`} type="checkbox" name="terms" aria-invalid={bad("terms")} aria-describedby={describe} className="mt-0.5 size-[18px] shrink-0 accent-ink" />
        <span>
          I agree to the <Link href={links.terms}>Terms</Link> and <Link href={links.privacy}>Privacy Policy</Link>
        </span>
      </label>

      {error && (
        <p id={`${id}-error`} role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm text-ink">
          {error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-pill bg-ink text-[17px] font-medium text-white transition-colors hover:bg-ink-muted disabled:cursor-not-allowed disabled:bg-disabled"
      >
        {loading ? (
          <>
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            Creating account…
          </>
        ) : (
          <>
            Create account
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
}
