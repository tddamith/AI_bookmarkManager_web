import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Logo } from "@/components/landing/header-hero";
import { getSession } from "@/lib/session";

const steps = ["01 — Get started", "02 — Import", "03 — All sorted"];

async function Gate({ from, children }: { from: string; children: ReactNode }) {
  if (!(await getSession())) redirect(`/signin?next=${from}`);
  return <>{children}</>;
}

/** Shared frame for onboarding steps 2 and 3. `step` is 1-based. */
export function OnboardingShell({ step, bg, from, children }: { step: 2 | 3; bg: string; from: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-6 py-4">
        <Logo />
      </header>
      <main id="main" className={`flex grow justify-center px-6 py-12 ${bg}`}>
        <div className="flex w-full max-w-[760px] flex-col gap-7">
          <ol aria-label={`Step ${step} of 3`} className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
            {steps.map((s, i) => (
              <li key={s} aria-current={i + 1 === step ? "step" : undefined} className="flex flex-col gap-1.5">
                <span className={`block bg-ink ${i + 1 === step ? "h-0.5" : i + 1 < step ? "h-px" : "h-px opacity-35"}`} />
                <span className={`text-xs ${i + 1 <= step ? "text-ink" : "text-ink-muted"}`}>{s}</span>
              </li>
            ))}
          </ol>
          <Suspense fallback={<div className="h-[420px]" aria-hidden="true" />}>
            <Gate from={from}>{children}</Gate>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
