import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/landing/header-hero";
import { SkipButton, WelcomeChoices } from "@/components/welcome/choices";
import { getSession } from "@/lib/session";
import { links } from "@/lib/site";

export const metadata: Metadata = {
  title: "Get started",
  description: "Set up Tidypin in about 30 seconds.",
  alternates: { canonical: "/welcome" },
  robots: { index: false, follow: false },
};

const steps = ["01 — Get started", "02 — Import", "03 — All sorted"];

async function Content() {
  const session = await getSession();
  if (!session) redirect(`/signin?next=${links.welcome}`);
  if (!session.verified) redirect("/verify");
  if (session.onboarded) redirect(links.app); // shown once per user
  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="max-w-[520px] text-[clamp(40px,6vw,56px)] font-normal leading-[0.98] tracking-[-0.045em]">
          {session.name ? `Hi ${session.name.split(" ")[0]}, let’s set up Tidypin.` : "Let’s set up Tidypin."}
        </h1>
        <p className="text-lg leading-normal text-ink-soft">It takes about 30 seconds. Your browser’s own bookmarks are never changed.</p>
      </div>
      <WelcomeChoices />
    </>
  );
}

export default function WelcomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-6 py-4">
        <Logo />
        <SkipButton />
      </header>
      <main id="main" className="flex grow justify-center bg-lime px-6 py-12">
        <div className="flex w-full max-w-[760px] flex-col gap-7">
          <ol aria-label="Step 1 of 3" className="m-0 grid list-none grid-cols-3 gap-2.5 p-0">
            {steps.map((s, i) => (
              <li key={s} aria-current={i === 0 ? "step" : undefined} className="flex flex-col gap-1.5">
                <span className={`block bg-ink ${i === 0 ? "h-0.5" : "h-px opacity-35"}`} />
                <span className={`text-xs ${i === 0 ? "text-ink" : "text-ink-muted"}`}>{s}</span>
              </li>
            ))}
          </ol>
          <Suspense fallback={<div className="h-[420px]" aria-hidden="true" />}>
            <Content />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
