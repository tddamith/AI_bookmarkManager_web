"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { fieldInput, fieldLabel, fieldWrap } from "@/components/auth/field-styles";
import { validateForgot, validateReset, type ResetField } from "@/lib/auth";
import { links } from "@/lib/site";

type Err = { field?: ResetField; message: string } | null;

const primary =
  "flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-pill bg-ink text-[17px] font-medium text-white transition-colors hover:bg-ink-muted disabled:cursor-not-allowed disabled:bg-disabled";

function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />;
}

/** Step 1: email → we send a code. Step 2: code + new password → signed in. */
export function ForgotPasswordForm() {
  const router = useRouter();
  const id = useId();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<Err>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  const focus = (field?: ResetField) => field && document.getElementById(`${id}-${field}`)?.focus();

  async function sendCode(address: string, isResend: boolean) {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: address }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; retryIn?: number; field?: ResetField };
      if (!res.ok) {
        setError({ message: data.message ?? "Something went wrong. Please try again.", field: data.field });
        if (res.status === 429) setSecs(data.retryIn ?? 60);
        return false;
      }
      setSecs(data.retryIn ?? 45);
      setLocked(false);
      if (isResend) setNote("A new code is on its way.");
      return true;
    } catch {
      setError({ message: "We couldn't reach the server. Check your connection and try again." });
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function onEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const address = String(new FormData(e.currentTarget).get("email") ?? "").trim();
    const invalid = validateForgot({ email: address });
    if (invalid) {
      setError(invalid);
      focus(invalid.field);
      return;
    }
    if (await sendCode(address, false)) {
      setEmail(address);
      setStep("reset");
    }
  }

  async function onReset(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || locked) return;
    const form = new FormData(e.currentTarget);
    const payload = {
      email,
      code: String(form.get("code") ?? "").replace(/\D/g, ""),
      password: String(form.get("password") ?? ""),
      confirm: String(form.get("confirm") ?? ""),
    };
    const invalid = validateReset(payload);
    if (invalid) {
      setError(invalid);
      focus(invalid.field);
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: payload.email, code: payload.code, password: payload.password }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; field?: ResetField; code?: string; triesLeft?: number | null };
      if (!res.ok) {
        setError({ message: data.message ?? "Something went wrong. Please try again.", field: data.field });
        if (data.code === "expired" || data.code === "locked" || data.triesLeft === 0) setLocked(true);
        setBusy(false);
        focus(data.field);
        return;
      }
      router.push(links.app);
      router.refresh();
    } catch {
      setError({ message: "We couldn't reach the server. Check your connection and try again." });
      setBusy(false);
    }
  }

  const describe = error ? `${id}-error` : undefined;
  const bad = (f: ResetField) => error?.field === f;
  const errorBox = error && (
    <p id={`${id}-error`} role="alert" className="border-l-2 border-ink bg-white px-3 py-2 text-sm text-ink">
      {error.message}
    </p>
  );

  if (step === "email") {
    return (
      <form onSubmit={onEmail} noValidate className="flex flex-col gap-[18px]" aria-busy={busy}>
        <h2 className="text-4xl font-normal leading-[1.04] tracking-[-0.035em]">Reset your password</h2>
        <p className="text-[15px] leading-normal text-ink-muted">Enter the email you signed up with and we’ll send you a 6-digit code.</p>
        <div className={`${fieldWrap} ${bad("email") ? "border-b-2" : ""}`}>
          <label htmlFor={`${id}-email`} className={fieldLabel}>Email —</label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@example.com"
            defaultValue={email} autoFocus aria-invalid={bad("email")} aria-describedby={describe} disabled={busy} className={fieldInput} />
        </div>
        {errorBox}
        <button type="submit" disabled={busy || secs > 0} className={primary}>
          {busy ? (<><Spinner />Sending…</>) : secs > 0 ? `Try again in ${secs}s` : "Send code"}
        </button>
        <p className="border-t border-ink pt-4 text-[15px] text-ink-muted">
          Remembered it? <Link href={links.signin} className="font-medium">Sign in</Link>
        </p>
      </form>
    );
  }

  const m = Math.floor(secs / 60), s = secs % 60;
  return (
    <form onSubmit={onReset} noValidate className="flex flex-col gap-[18px]" aria-busy={busy}>
      <h2 className="text-4xl font-normal leading-[1.04] tracking-[-0.035em]">Choose a new password</h2>
      <p className="text-[15px] leading-normal text-ink-muted" role="status">
        If there’s an account for <strong className="font-medium text-ink">{email}</strong>, we’ve sent it a code. It works for 15 minutes.
      </p>

      <div className={`${fieldWrap} ${bad("code") ? "border-b-2" : ""}`}>
        <label htmlFor={`${id}-code`} className={fieldLabel}>6-digit code —</label>
        <input id={`${id}-code`} name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6}
          placeholder="123456" autoFocus aria-invalid={bad("code")} aria-describedby={describe} disabled={busy}
          onChange={(e) => { e.currentTarget.value = e.currentTarget.value.replace(/\D/g, "").slice(0, 6); }}
          className={`${fieldInput} tracking-[0.2em]`} />
      </div>

      {/* Hidden username field lets password managers save the new password against the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div className={`${fieldWrap} ${bad("password") ? "border-b-2" : ""}`}>
        <label htmlFor={`${id}-password`} className={fieldLabel}>New password —</label>
        <input id={`${id}-password`} name="password" type="password" autoComplete="new-password" placeholder="At least 8 characters"
          aria-invalid={bad("password")} aria-describedby={describe} disabled={busy} className={fieldInput} />
      </div>
      <div className={fieldWrap}>
        <label htmlFor={`${id}-confirm`} className={fieldLabel}>Confirm new password —</label>
        <input id={`${id}-confirm`} name="confirm" type="password" autoComplete="new-password" placeholder="Type it again"
          aria-describedby={describe} disabled={busy} className={fieldInput} />
      </div>

      {errorBox}
      {note && <p role="status" className="text-sm text-ink-muted">{note}</p>}

      <button type="submit" disabled={busy || locked} className={primary}>
        {busy ? (<><Spinner />Saving…</>) : "Reset password and sign in"}
      </button>

      <div className="flex flex-wrap justify-between gap-2 text-sm text-ink-muted">
        <span>
          Didn’t get it?{" "}
          {secs === 0 ? (
            <button type="button" disabled={busy} onClick={() => void sendCode(email, true)} className="cursor-pointer bg-transparent p-0 font-medium text-ink underline">
              Resend code
            </button>
          ) : (
            <span>Resend in {m}:{s < 10 ? "0" : ""}{s}</span>
          )}
        </span>
        <button type="button" onClick={() => { setStep("email"); setError(null); setNote(null); }} className="cursor-pointer bg-transparent p-0 text-ink underline">
          Use a different email
        </button>
      </div>
      <p className="text-xs text-[#6B6B6B]">Resetting signs you out on every other device. Check spam if the email isn’t in your inbox.</p>
    </form>
  );
}
