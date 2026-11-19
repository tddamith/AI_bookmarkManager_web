import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { safeNext } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Logo } from "@/components/landing/header-hero";
import { links } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Tidypin library.",
  alternates: { canonical: "/signin" },
  robots: { index: false, follow: true },
};

async function Form({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  // Already signed in (e.g. "Keep me signed in" from a previous visit): skip the form.
  if (await getSession()) redirect(safeNext(next ?? null));
  return <SignInForm unavailable={error === "unavailable"} />;
}

export default function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-6 py-4">
        <Logo />
        <div className="flex items-center gap-4 text-sm">
          <span className="text-ink-muted">New here?</span>
          <a
            href={links.signup}
            className="inline-flex h-10 items-center rounded-pill border-[1.5px] border-ink px-[18px] font-medium no-underline hover:bg-white"
          >
            Sign up
          </a>
        </div>
      </header>

      <div className="flex grow flex-wrap">
        <section className="relative flex min-w-0 flex-[1_1_480px] flex-col gap-6 overflow-hidden border-r border-ink bg-sky px-6 py-16 sm:px-14">
          <svg width="300" height="150" viewBox="0 0 300 150" className="absolute right-10 top-12 hidden sm:block" aria-hidden="true">
            <path d="M0 0H200V110" fill="none" stroke="#111111" strokeWidth="1" />
            <path d="M220 0L300 100" fill="none" stroke="#111111" strokeWidth="1" />
          </svg>
          <p className="text-sm text-[#1F1F1F]">Sign in —<br />Your library, everywhere</p>
          <h1 className="max-w-[520px] text-[clamp(44px,6vw,64px)] font-normal leading-[0.98] tracking-[-0.045em]">Welcome back.</h1>
          <p className="max-w-[420px] text-lg leading-normal text-[#1F1F1F]">
            Your bookmarks, summaries and AI suggestions are waiting — on the web, in the popup and in the side panel.
          </p>
          <div className="mt-auto flex items-end gap-4">
            <svg width="96" height="116" viewBox="0 0 24 29" aria-hidden="true">
              <path d="M2 1h20v27l-10-7-10 7z" fill="#111111" />
              <path d="M12 1v14" stroke="#A6C3DD" strokeWidth="0.5" />
            </svg>
            <p className="pb-2 text-[13px] text-[#1F1F1F]">Synced across Chrome,<br />Edge and Brave</p>
          </div>
        </section>

        <main id="main" className="flex min-w-0 flex-[1_1_440px] justify-center px-6 py-16">
          <div className="flex w-full max-w-[440px] flex-col gap-[18px]">
            <h2 className="text-4xl font-normal leading-[1.04] tracking-[-0.035em]">Sign in to Tidypin</h2>
            <a
              href="/api/auth/google"
              className="flex h-[52px] items-center justify-center rounded-pill border-[1.5px] border-ink text-base no-underline hover:bg-white"
            >
              Continue with Google
            </a>
            <div className="flex items-center gap-3 text-xs text-ink-muted" aria-hidden="true">
              <span className="h-px grow bg-ink" />or<span className="h-px grow bg-ink" />
            </div>
            <Suspense fallback={<SignInFormFallback />}>
              <Form searchParams={searchParams} />
            </Suspense>
            <p className="border-t border-ink pt-4 text-[15px] text-ink-muted">
              New to Tidypin?{" "}
              <Link href={links.signup} className="font-medium">Create an account</Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function SignInFormFallback() {
  return <div className="h-[330px]" aria-hidden="true" />;
}
