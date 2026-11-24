"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { fieldInput, fieldLabel, fieldWrap } from "@/components/auth/field-styles";
import { Logo } from "@/components/landing/header-hero";
import { ArrowRight } from "@/components/ui/icons";
import { links } from "@/lib/site";

type Step = "email" | "code" | "new" | "done";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const primary = "flex h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-pill bg-ink text-[17px] font-medium text-white transition-colors hover:bg-ink-muted disabled:cursor-not-allowed disabled:bg-[#D9D9D5] disabled:text-[#8A8A8A]";
const spinner = <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />;

const panels: Record<Step, { bg: string; fill: string; kicker: ReactNode; title: string; body: ReactNode; step: string }> = {
  email: { bg: "bg-sky", fill: "#A6C3DD", kicker: <>Forgot password —<br />It happens to everyone</>, title: "Let’s get you back in.", body: "Enter the email you signed up with. We’ll send a 6-digit code to reset your password.", step: "" },
  code: { bg: "bg-sand", fill: "#C9B597", kicker: <>Reset password —<br />Step 2 of 3</>, title: "Check your inbox.", body: "", step: "Reset password · step 2 of 3" },
  new: { bg: "bg-sky", fill: "#A6C3DD", kicker: <>Reset password —<br />Step 3 of 3</>, title: "Choose a new password.", body: "Make it one you don’t use anywhere else. Your bookmarks and folders stay exactly as they are.", step: "Reset password · step 3 of 3" },
  done: { bg: "bg-lime", fill: "#D4FA1E", kicker: <>All done —<br />You’re signed in</>, title: "You’re back in.", body: "Use your new password next time you sign in, on the web, in the popup or in the side panel.", step: "Reset password · done" },
};

function Tick() {
  return (
    <svg width="96" height="96" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#111111" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#D4FA1E" strokeWidth="1.6" />
    </svg>
  );
}

function ErrorLine({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-center gap-2 text-sm text-[#C92A2A]">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#C92A2A" /><path d="M12 6v8M12 17v1" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" /></svg>
      {children}
    </p>
  );
}

async function post<T extends object>(url: string, body: object): Promise<{ ok: boolean; data: T & { message?: string } }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, data: (await res.json().catch(() => ({}))) as T & { message?: string } };
  } catch {
    return { ok: false, data: { message: "We couldn't reach the server. Check your connection and try again." } as T & { message?: string } };
  }
}

export function ForgotFlow() {
  const router = useRouter();
  const id = useId();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [others, setOthers] = useState(true);
  const [focus, setFocus] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);
  const [secs, setSecs] = useState(0);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (secs <= 0) return;
    const t = setTimeout(() => setSecs((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secs]);

  async function sendCode(resend = false) {
    if (busy) return false;
    if (!EMAIL.test(email.trim())) { setError(email.trim() ? "Enter a valid email address." : "Enter your email."); return false; }
    setBusy(true); setError(null); setNote(null);
    const { ok, data } = await post<{ retryIn?: number }>("/api/auth/forgot", { email: email.trim() });
    setBusy(false);
    if (!ok) { setError(data.message ?? "We couldn't send the email. Try again."); return false; }
    setSecs(data.retryIn ?? 45);
    if (resend) { setNote("A new code is on its way."); setCode(""); setLocked(false); }
    return true;
  }

  async function onEmail(e: FormEvent) {
    e.preventDefault();
    if (await sendCode()) { setStep("code"); setError(null); }
  }

  async function onCode(e: FormEvent) {
    e.preventDefault();
    if (busy || locked || code.length !== 6) return;
    setBusy(true); setError(null);
    const { ok, data } = await post<{ code?: string; triesLeft?: number | null }>("/api/auth/forgot/verify", { email: email.trim(), code });
    setBusy(false);
    if (ok) { setStep("new"); return; }
    setError(data.message ?? "Something went wrong. Please try again.");
    if (data.triesLeft === 0 || data.code === "expired" || data.code === "locked") setLocked(true);
  }

  const rules = [
    { t: "At least 8 characters", ok: pw.length >= 8 },
    { t: "One number", ok: /\d/.test(pw) },
    { t: "Both passwords match", ok: pw.length > 0 && pw === pw2 },
  ];
  const ready = rules.every((r) => r.ok);

  async function onNew(e: FormEvent) {
    e.preventDefault();
    if (busy || !ready) return;
    setBusy(true); setError(null);
    const { ok, data } = await post<{ code?: string; signedIn?: boolean }>("/api/auth/reset", { email: email.trim(), code, password: pw, signOutOthers: others });
    setBusy(false);
    if (ok) { setSignedIn(Boolean(data.signedIn)); setStep("done"); return; }
    if (data.code === "expired" || data.code === "locked" || data.code === "wrong_code") {
      setCode(""); setLocked(false); setStep("code");
    }
    setError(data.message ?? "Something went wrong. Please try again.");
  }

  const p = panels[step];
  const digits = code.split("");
  const m = Math.floor(secs / 60), s = secs % 60;

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-6 py-4">
        <Logo />
        {step === "email" ? (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-ink-muted">Remembered it?</span>
            <Link href={links.signin} className="inline-flex h-10 items-center rounded-pill border-[1.5px] border-ink px-[18px] font-medium no-underline hover:bg-white">Sign in</Link>
          </div>
        ) : <span className="text-sm text-ink-muted">{p.step}</span>}
      </header>

      <div className="flex grow flex-wrap">
        <section className={`relative flex min-w-0 flex-[1_1_480px] flex-col gap-6 overflow-hidden border-r border-ink px-6 py-16 sm:px-14 ${p.bg}`}>
          <svg width="300" height="150" viewBox="0 0 300 150" className="absolute right-10 top-12 hidden sm:block" aria-hidden="true">
            <path d="M0 0H200V110" fill="none" stroke="#111111" strokeWidth="1" />
            <path d="M220 0L300 100" fill="none" stroke="#111111" strokeWidth="1" />
          </svg>
          <p className="text-sm text-[#1F1F1F]">{p.kicker}</p>
          <h1 className="max-w-[520px] text-[clamp(44px,6vw,64px)] font-normal leading-[0.98] tracking-[-0.045em]">{p.title}</h1>
          <p className="max-w-[420px] text-lg leading-normal text-[#1F1F1F]">
            {step === "code" ? <>We sent a 6-digit code to <strong className="font-medium text-ink">{email.trim()}</strong>. It works for 10 minutes.</> : step === "done" && !signedIn ? "Sign in with your new password to open your library." : p.body}
          </p>
          <div aria-hidden="true" className="relative -mx-6 mt-2 min-h-24 grow overflow-hidden border-t border-ink sm:-mx-14">
            <svg className="absolute inset-0 size-full" aria-hidden="true">
              <defs>
                <pattern id={`${id}-pat`} width="176" height="90" patternUnits="userSpaceOnUse">
                  <path d="M16 16H116V71" fill="none" stroke="#111111" strokeWidth="1" strokeLinecap="square" />
                  <path d="M126 16L166 66" fill="none" stroke="#111111" strokeWidth="1" strokeLinecap="square" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={p.fill} />
              <rect width="100%" height="100%" fill={`url(#${id}-pat)`} />
            </svg>
          </div>
          {step === "code" && (
            <svg width="150" height="110" viewBox="0 0 150 110" className="mt-auto" aria-hidden="true">
              <rect x="0" y="10" width="150" height="100" rx="14" fill="#111111" />
              <path d="M8 22l67 48 67-48" fill="none" stroke="#C9B597" strokeWidth="2" />
              <circle cx="136" cy="14" r="14" fill="#D4FA1E" stroke="#111111" strokeWidth="1.5" />
            </svg>
          )}
        </section>

        <main id="main" className="flex min-w-0 flex-[1_1_440px] justify-center px-6 py-16">
          <div className="w-full max-w-[440px]">
            {step === "email" && (
              <form onSubmit={onEmail} noValidate className="flex flex-col gap-[18px]" aria-busy={busy}>
                <h2 className="text-4xl font-normal leading-[1.04] tracking-[-0.035em]">Reset your password</h2>
                <div className={fieldWrap}>
                  <label htmlFor={`${id}-em`} className={fieldLabel}>Email —</label>
                  <input id={`${id}-em`} type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" autoFocus value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }} disabled={busy} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined} className={fieldInput} />
                </div>
                {error && <ErrorLine id={`${id}-err`}>{error}</ErrorLine>}
                <button type="submit" disabled={busy} className={primary}>
                  {busy ? <>{spinner}Sending…</> : <>Send code<ArrowRight stroke="#FFFFFF" /></>}
                </button>
                <p className="border-t border-ink pt-4 text-[15px] text-ink-muted">
                  Signed up with Google? <Link href={links.signin} className="font-medium">Continue with Google</Link> instead — there’s no password to reset.
                </p>
              </form>
            )}

            {step === "code" && (
              <form onSubmit={onCode} noValidate className="flex flex-col gap-[18px]" aria-busy={busy}>
                <h2 className="text-4xl font-normal leading-[1.04] tracking-[-0.035em]">Enter your code</h2>
                <div className="flex flex-col gap-2.5">
                  <label htmlFor={`${id}-otp`} className="text-xs text-ink-muted">6-digit code —</label>
                  <div className="relative grid grid-cols-6 gap-2.5">
                    {Array.from({ length: 6 }, (_, i) => {
                      const active = focus && i === Math.min(digits.length, 5) && !error;
                      return (
                        <div key={i} aria-hidden="true" className={`flex h-16 items-center justify-center rounded-2xl bg-white text-[28px] tracking-[-0.02em] max-sm:h-14 ${error ? "border-2 border-[#C92A2A]" : active ? "border-2 border-ink shadow-[0_0_0_4px_#D4FA1E]" : "border-[1.5px] border-ink"}`}>{digits[i] ?? ""}</div>
                      );
                    })}
                    <input id={`${id}-otp`} value={code} inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus disabled={busy}
                      onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); setNote(null); }}
                      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-err` : undefined}
                      className="absolute inset-0 size-full cursor-text border-0 bg-transparent text-base text-transparent opacity-0" />
                  </div>
                  {error && <ErrorLine id={`${id}-err`}>{error}</ErrorLine>}
                  {note && <p role="status" className="text-sm text-ink-muted">{note}</p>}
                </div>
                <button type="submit" disabled={code.length !== 6 || busy || locked} className={primary}>
                  {busy ? <>{spinner}Checking…</> : "Continue"}
                </button>
                <div className="flex flex-wrap justify-between gap-2 text-sm text-ink-muted">
                  <span>
                    Didn’t get it?{" "}
                    {secs === 0 ? (
                      <button type="button" onClick={() => void sendCode(true)} className="cursor-pointer bg-transparent p-0 font-medium text-ink underline">Resend code</button>
                    ) : <span>Resend in {m}:{s < 10 ? "0" : ""}{s}</span>}
                  </span>
                  <button type="button" onClick={() => { setStep("email"); setCode(""); setError(null); setNote(null); setLocked(false); }} className="cursor-pointer bg-transparent p-0 text-ink underline">Change email</button>
                </div>
                <p className="text-xs text-[#6B6B6B]">Check spam if it’s not in your inbox.</p>
              </form>
            )}

            {step === "new" && (
              <form onSubmit={onNew} noValidate className="flex flex-col gap-[18px]" aria-busy={busy}>
                <h2 className="text-4xl font-normal leading-[1.04] tracking-[-0.035em]">New password</h2>
                <div className={fieldWrap}>
                  <div className="flex items-baseline justify-between">
                    <label htmlFor={`${id}-p1`} className={fieldLabel}>New password —</label>
                    <button type="button" onClick={() => setShow((v) => !v)} aria-pressed={show} className="cursor-pointer bg-transparent p-0 text-xs underline">{show ? "Hide" : "Show"}</button>
                  </div>
                  <input id={`${id}-p1`} type={show ? "text" : "password"} autoComplete="new-password" placeholder="At least 8 characters" autoFocus value={pw}
                    onChange={(e) => { setPw(e.target.value); setError(null); }} disabled={busy} className={fieldInput} />
                </div>
                <div className={fieldWrap}>
                  <label htmlFor={`${id}-p2`} className={fieldLabel}>Confirm password —</label>
                  <input id={`${id}-p2`} type={show ? "text" : "password"} autoComplete="new-password" placeholder="Type it again" value={pw2}
                    onChange={(e) => { setPw2(e.target.value); setError(null); }} disabled={busy} className={fieldInput} />
                </div>
                <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-label="Password requirements">
                  {rules.map((r) => (
                    <li key={r.t} className={`flex items-center gap-2.5 text-sm ${r.ok ? "text-ink" : "text-[#6B6B6B]"}`}>
                      <span className={`size-4 shrink-0 rounded-full ${r.ok ? "bg-ink" : "border-[1.5px] border-[#8A8A8A]"}`} aria-hidden="true" />
                      {r.t}<span className="sr-only">{r.ok ? " — done" : " — not yet"}</span>
                    </li>
                  ))}
                </ul>
                <label className="flex items-center gap-2.5 text-sm text-ink-muted">
                  <input type="checkbox" checked={others} onChange={(e) => setOthers(e.target.checked)} className="m-0 size-[18px] accent-ink" />
                  Sign me out on other devices
                </label>
                {error && <ErrorLine>{error}</ErrorLine>}
                <button type="submit" disabled={!ready || busy} className={primary}>
                  {busy ? <>{spinner}Saving…</> : "Save new password"}
                </button>
              </form>
            )}

            {step === "done" && (
              <div className="flex flex-col gap-[18px]" role="status">
                <Tick />
                <h2 className="text-[44px] font-normal leading-[1.02] tracking-[-0.035em]">Password updated.</h2>
                <p className="text-[17px] leading-normal text-ink-muted">Use your new password next time you sign in, on the web, in the popup or in the side panel.</p>
                <button type="button" autoFocus className={primary} onClick={() => { router.push(signedIn ? links.app : links.signin); router.refresh(); }}>
                  {signedIn ? "Go to my library" : "Sign in"} <ArrowRight stroke="#FFFFFF" />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
