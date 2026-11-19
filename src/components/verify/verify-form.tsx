"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "@/components/ui/icons";

type Phase = "enter" | "ok";

/** 6-digit email code entry. A hidden input holds the value; the boxes are display only (as in the design). */
export function VerifyForm({ name, next }: { name: string | null; next: string }) {
  const router = useRouter();
  const id = useId();
  const sentOnce = useRef(false);
  const [code, setCode] = useState("");
  const [focus, setFocus] = useState(true);
  const [phase, setPhase] = useState<Phase>("enter");
  const [error, setError] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);

  async function send(isResend: boolean) {
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/auth/verify/send", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { message?: string; retryIn?: number; rateLimited?: boolean; verified?: boolean };
      if (data.verified) { router.replace(next); return; }
      if (res.ok || data.rateLimited) {
        setSecs(data.retryIn ?? 45);
        if (isResend && res.ok) { setNote("A new code is on its way."); setCode(""); setLocked(false); }
        return;
      }
      setSecs(0);
      setError(data.message ?? "We couldn't send the email. Try again.");
    } catch {
      setSecs(0);
      setError("We couldn't reach the server. Try again.");
    }
  }

  // Send once on arrival (rate-limited sends just start the countdown — sign-up may already have sent one).
  useEffect(() => {
    if (sentOnce.current) return;
    sentOnce.current = true;
    void send(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (busy || locked || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      const data = (await res.json().catch(() => ({}))) as { message?: string; triesLeft?: number | null; code?: string };
      if (res.ok) { setPhase("ok"); setBusy(false); return; }
      setError(data.message ?? "Something went wrong. Please try again.");
      if (data.triesLeft === 0 || data.code === "expired" || data.code === "locked") setLocked(true);
      setBusy(false);
    } catch {
      setError("We couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  async function changeEmail() {
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => undefined);
    router.push("/signup");
    router.refresh();
  }

  if (phase === "ok") {
    return (
      <div className="flex flex-col gap-[18px]" role="status">
        <svg width="96" height="96" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="#111111" />
          <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#D4FA1E" strokeWidth="1.6" />
        </svg>
        <h2 className="text-[44px] font-normal leading-[1.02] tracking-[-0.035em]">Email verified.</h2>
        <p className="text-[17px] leading-normal text-ink-muted">You’re all set{name ? `, ${name.split(" ")[0]}` : ""}. Your account is ready.</p>
        <button
          type="button"
          autoFocus
          onClick={() => { router.push(next); router.refresh(); }}
          className="flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-pill bg-ink text-[17px] font-medium text-white transition-colors hover:bg-ink-muted"
        >
          Continue <ArrowRight stroke="#FFFFFF" />
        </button>
      </div>
    );
  }

  const digits = code.split("");
  const full = code.length === 6;
  const m = Math.floor(secs / 60), s = secs % 60;
  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[18px]" aria-busy={busy}>
      <h2 className="text-4xl font-normal leading-[1.04] tracking-[-0.035em]">Enter your code</h2>
      <div className="flex flex-col gap-2.5">
        <label htmlFor={id} className="text-xs text-ink-muted">6-digit code —</label>
        <div className="relative grid grid-cols-6 gap-2.5">
          {Array.from({ length: 6 }, (_, i) => {
            const active = focus && i === Math.min(digits.length, 5) && !error;
            return (
              <div key={i} aria-hidden="true"
                className={`flex h-16 items-center justify-center rounded-2xl bg-white text-[28px] tracking-[-0.02em] max-sm:h-14 ${
                  error ? "border-2 border-[#C92A2A]" : active ? "border-2 border-ink shadow-[0_0_0_4px_#D4FA1E]" : "border-[1.5px] border-ink"}`}>
                {digits[i] ?? ""}
              </div>
            );
          })}
          <input
            id={id}
            value={code}
            onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); setNote(null); }}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            autoFocus
            disabled={busy}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${id}-err` : undefined}
            className="absolute inset-0 size-full cursor-text border-0 bg-transparent text-base text-transparent opacity-0"
          />
        </div>
        {error && (
          <p id={`${id}-err`} role="alert" className="flex items-center gap-2 text-sm text-[#C92A2A]">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#C92A2A" /><path d="M12 6v8M12 17v1" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" /></svg>
            {error}
          </p>
        )}
        {note && <p role="status" className="text-sm text-ink-muted">{note}</p>}
      </div>

      <button type="submit" disabled={!full || busy || locked}
        className="flex h-14 cursor-pointer items-center justify-center gap-2.5 rounded-pill bg-ink text-[17px] font-medium text-white transition-colors hover:bg-ink-muted disabled:cursor-not-allowed disabled:bg-[#D9D9D5] disabled:text-[#8A8A8A]">
        {busy ? (<><span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />Verifying…</>) : "Verify email"}
      </button>

      <div className="flex flex-wrap justify-between gap-2 text-sm text-ink-muted">
        <span>
          Didn’t get it?{" "}
          {secs === 0 ? (
            <button type="button" onClick={() => void send(true)} className="cursor-pointer bg-transparent p-0 font-medium text-ink underline">Resend code</button>
          ) : (
            <span>Resend in {m}:{s < 10 ? "0" : ""}{s}</span>
          )}
        </span>
        <button type="button" onClick={() => void changeEmail()} className="cursor-pointer bg-transparent p-0 text-ink underline">Change email</button>
      </div>
      <p className="text-xs text-[#6B6B6B]">Check spam if it’s not in your inbox.</p>
    </form>
  );
}
