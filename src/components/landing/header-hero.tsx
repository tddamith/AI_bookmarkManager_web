import Link from "next/link";
import { HeroBanner } from "@/components/landing/hero-banner";
import { ButtonLink } from "@/components/ui/button";
import { BookmarkIcon } from "@/components/ui/icons";
import { container } from "@/components/ui/section-heading";
import { links, siteConfig } from "@/lib/site";

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 no-underline" aria-label={`${siteConfig.name} home`}>
      <span
        className={`flex size-8 items-center justify-center rounded-full ${dark ? "bg-lime" : "bg-ink"}`}
      >
        <BookmarkIcon size={13} fill={dark ? "#111111" : "#D4FA1E"} />
      </span>
      <span className={`text-sm font-semibold tracking-[0.06em] ${dark ? "text-white" : "text-ink"}`}>
        TIDYPIN
      </span>
    </Link>
  );
}

export function HeaderHero() {
  return (
    <header className="overflow-x-clip border-b border-ink bg-lime">
      <nav aria-label="Main" className={`${container} flex flex-wrap items-center justify-between gap-4 py-[18px]`}>
        <Logo />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[15px]">
          <a href="#features" className="no-underline">Features</a>
          <a href="#how" className="no-underline">How it works</a>
          <a href="#pricing" className="no-underline">Pricing</a>
          <a href="#faq" className="no-underline">FAQ</a>
          <span className="hidden h-6 w-px bg-ink sm:block" aria-hidden="true" />
          <a href={links.signin} className="font-medium no-underline">Sign in</a>
          <a
            href={links.signup}
            className="inline-flex h-11 items-center rounded-pill border-[1.5px] border-ink px-5 font-medium no-underline hover:bg-white"
          >
            Sign up
          </a>
          <ButtonLink href={links.install}>Add to browser — free</ButtonLink>
        </div>
      </nav>

      <HeroBanner />
    </header>
  );
}
