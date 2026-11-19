import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { safeNext } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { Logo } from "@/components/landing/header-hero";
import { CheckCircle } from "@/components/ui/icons";
import { links } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your free Tidypin account. No card needed.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: true },
};

const perks = ["AI files every save for you", "Summaries of every page you keep", "One-tap tidy-up, undo any time"];

async function Form({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  // Already signed in (e.g. "Keep me signed in" from a previous visit): skip the form.
  if (await getSession()) redirect(safeNext(next ?? null));
  return <SignUpForm unavailable={error === "unavailable"} />;
}

export default function SignUpPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-6 py-4">
        <Logo />
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink-muted">Have an account?</span>
          <Link href={links.signin} className="font-medium">Sign in</Link>
        </div>
      </header>

      <div className="flex grow flex-wrap">
        <section className="relative flex min-w-0 flex-[1_1_480px] flex-col gap-6 overflow-hidden border-r border-ink bg-lime px-6 py-16 sm:px-14">
          <svg width="300" height="150" viewBox="0 0 300 150" className="absolute right-10 top-12 hidden sm:block" aria-hidden="true">
            <path d="M0 0H200V110" fill="none" stroke="#111111" strokeWidth="1" />
            <path d="M220 0L300 100" fill="none" stroke="#111111" strokeWidth="1" />
          </svg>
          <p className="text-sm text-ink-soft">Sign up —<br />Free forever, no card</p>
          <h1 className="max-w-[520px] text-[clamp(44px,6vw,64px)] font-normal leading-[0.98] tracking-[-0.045em]">
            Ready to tidy your bookmarks?
          </h1>
          <ul className="m-0 flex max-w-[440px] list-none flex-col border-b border-ink p-0">
            {perks.map((p) => (
              <li key={p} className="flex h-12 items-center gap-3 border-t border-ink text-[17px]">
                <CheckCircle size={18} />
                {p}
              </li>
            ))}
          </ul>
        </section>

        <main id="main" className="flex min-w-0 flex-[1_1_440px] justify-center px-6 py-16">
          <div className="flex w-full max-w-[440px] flex-col gap-[18px]">
            <h2 className="text-4xl font-normal leading-[1.04] tracking-[-0.035em]">Create your account</h2>
            <a
              href="/api/auth/google"
              className="flex h-[52px] items-center justify-center rounded-pill border-[1.5px] border-ink text-base no-underline hover:bg-white"
            >
              Sign up with Google
            </a>
            <div className="flex items-center gap-3 text-xs text-ink-muted" aria-hidden="true">
              <span className="h-px grow bg-ink" />or<span className="h-px grow bg-ink" />
            </div>
            <Suspense fallback={<div className="h-[420px]" aria-hidden="true" />}>
              <Form searchParams={searchParams} />
            </Suspense>
            <p className="border-t border-ink pt-4 text-[15px] text-ink-muted">
              Have an account? <Link href={links.signin} className="font-medium">Sign in</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
