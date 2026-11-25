import { parallax as cfg } from "@/lib/parallax-config";
import { BandDecor } from "@/components/motion/band-decor";
import { ParallaxLayer } from "@/components/motion/parallax-layer";
import { Reveal } from "@/components/motion/reveal";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { BookmarkIcon } from "@/components/ui/icons";
import { container, SectionHeading } from "@/components/ui/section-heading";
import { PayNote, ProPrice } from "@/components/plans/pro-price";
import { formatPrice, PRICING } from "@/config/pricing";
import { links } from "@/lib/site";

export const faqs = [
  [
    "Is Tidypin really free?",
    "Yes. The Free plan keeps unlimited bookmarks forever. Pro adds unlimited AI, tidy-up and sync.",
  ],
  [
    "Which browsers does it work in?",
    "Chrome, Edge and Brave today. Firefox is planned.",
  ],
  [
    "Does Tidypin read the pages I visit?",
    "Only the title and URL by default. Page summaries need your opt-in.",
  ],
  [
    "Can I bring my existing bookmarks?",
    "Yes, in one click during setup. AI sorts them for you.",
  ],
  [
    "How do I cancel Pro?",
    "Any time from Plan & billing in your account. Auto-renew stops right away and you keep Pro until the end of the period you paid for.",
  ],
] as const;

function Row({
  children,
  last = false,
}: {
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li
      className={`flex h-[46px] items-center border-t border-ink ${last ? "border-b" : ""}`}
    >
      {children}
    </li>
  );
}

export function Pricing() {
  return (
    <section
      id="pricing"
      aria-labelledby="pricing-title"
      className={`${container} flex flex-col gap-10 py-24`}
    >
      <SectionHeading
        id="pricing-title"
        title="Start free. Go Pro when it clicks."
        eyebrow={
          <>
            Pricing —<br />
            Cancel any time
          </>
        }
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
        <Reveal className="lift flex flex-col gap-4 rounded-card bg-white p-8">
          <div className="flex items-baseline justify-between">
            <h3 className="text-[26px] font-normal">Free —</h3>
            <p className="text-[44px] tracking-[-0.03em]">
              {formatPrice(PRICING.free.price)}
            </p>
          </div>
          <ul className="m-0 flex list-none flex-col p-0 text-base">
            <Row>Unlimited bookmarks</Row>
            <Row>
              {PRICING.free.aiSuggestionsPerMonth} AI suggestions a month
            </Row>
            <Row>Popup and side panel</Row>
            <Row last>
              {PRICING.free.devices}{" "}
              {PRICING.free.devices === 1 ? "device" : "devices"}
            </Row>
          </ul>
          <ButtonLink
            href={links.install}
            variant="secondary"
            size="lg"
            className="mt-auto"
          >
            Add to browser — free
          </ButtonLink>
        </Reveal>
        <Reveal
          index={1}
          className="lift flex flex-col gap-4 rounded-card border-[1.5px] border-ink bg-lime p-8"
        >
          <div className="flex items-baseline justify-between">
            <h3 className="text-[26px] font-normal">Pro —</h3>

            <ProPrice />
          </div>
          <ul className="m-0 flex list-none flex-col p-0 text-base">
            <Row>Unlimited AI suggestions and summaries</Row>
            <Row>One-tap tidy-up</Row>
            <Row>For you picks on every site</Row>
            <Row last>Sync on all devices</Row>
          </ul>
          <ButtonLink href={links.signup} size="lg" className="mt-auto">
            Get Pro
          </ButtonLink>
          <p className="text-center text-[13px] text-ink-soft">
            <PayNote />
          </p>
        </Reveal>
      </div>
    </section>
  );
}

const trust = [
  [
    "Nothing moves without you",
    "Every tidy-up is a suggestion first, and you can undo it.",
  ],
  ["Title and URL by default", "Reading page content for summaries is opt-in."],
  [
    "Your originals stay put",
    "Importing never changes your browser's own bookmarks.",
  ],
  [
    "Export any time",
    "Download everything as HTML or JSON, whenever you like.",
  ],
];

export function Trust() {
  return (
    <section
      aria-labelledby="trust-title"
      className="relative overflow-x-clip border-y border-ink bg-white"
    >
      <BandDecor tone="ink" preset="a" />
      <div
        className={`${container} relative flex flex-wrap items-start gap-12 py-20`}
      >
        <div className="flex flex-[1_1_360px] flex-col gap-4">
          <svg width="64" height="76" viewBox="0 0 24 29" aria-hidden="true">
            <path d="M2 1h20v27l-10-7-10 7z" fill="#111111" />
            <path d="M12 1v14" stroke="#FFFFFF" strokeWidth="0.6" />
          </svg>
          <h2
            id="trust-title"
            className="text-[clamp(32px,4vw,48px)] font-normal leading-[1.04] tracking-[-0.035em]"
          >
            AI suggests. You decide.
          </h2>
        </div>
        <ul className="m-0 grid flex-[2_1_480px] list-none grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-7 p-0">
          {trust.map(([t, b], i) => (
            <Reveal
              as="li"
              key={t}
              index={i}
              className="flex flex-col gap-2 border-t-2 border-ink pt-4"
            >
              <h3 className="text-xl font-medium">{t}</h3>
              <p className="text-[15px] leading-normal text-ink-muted">{b}</p>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-title"
      className={`${container} flex flex-wrap gap-12 py-24`}
    >
      <h2
        id="faq-title"
        className="flex-[1_1_300px] text-[clamp(36px,4.5vw,56px)] font-normal leading-[1.02] tracking-[-0.035em]"
      >
        Questions —
      </h2>
      <div className="flex flex-[2_1_520px] flex-col border-b border-ink">
        {faqs.map(([q, a], i) => (
          <Reveal
            as="details"
            key={q}
            index={i}
            open={i === 0}
            className="border-t border-ink py-5"
          >
            <summary className="cursor-pointer text-xl">{q}</summary>
            <p className="mt-3 text-base leading-normal text-ink-muted">{a}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function CtaFooter() {
  return (
    <section className="relative overflow-x-clip bg-ink text-white">
      <BandDecor tone="lime" preset="a" />
      <div
        className={`${container} relative flex flex-col items-start gap-7 py-[104px]`}
      >
        <ParallaxLayer
          speed={cfg.decorSpeed}
          className="absolute right-6 top-12 hidden lg:block"
        >
          <svg
            width="420"
            height="200"
            viewBox="0 0 420 200"
            aria-hidden="true"
          >
            <path
              d="M0 0H280V150"
              fill="none"
              stroke="#D4FA1E"
              strokeWidth="1"
            />
            <path
              d="M300 0L420 140"
              fill="none"
              stroke="#D4FA1E"
              strokeWidth="1"
            />
          </svg>
        </ParallaxLayer>
        <Reveal
          as="h2"
          variant="heading"
          className="max-w-[760px] text-[clamp(44px,6vw,80px)] font-normal leading-[0.98] tracking-[-0.045em]"
        >
          Ready to tidy your bookmarks?
        </Reveal>
        <p className="text-lg text-footer-text">
          Free forever. Set up in 30 seconds.
        </p>
        <ButtonLink
          href={links.install}
          variant="accent"
          size="xl"
          className="h-[58px]"
        >
          Add to browser — it&apos;s free
        </ButtonLink>
      </div>
      <footer className="border-t border-line-dark">
        <div
          className={`${container} flex flex-wrap items-center justify-between gap-4 py-7 text-sm text-footer-text`}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 no-underline"
            aria-label="Tidypin home"
          >
            <span className="flex size-7 items-center justify-center rounded-full bg-lime">
              <BookmarkIcon size={12} fill="#111111" />
            </span>
            <span className="font-semibold tracking-[0.06em] text-white">
              TIDYPIN
            </span>
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap gap-6">
            <a
              href={links.privacy}
              className="text-footer-text underline-offset-4 hover:text-white"
            >
              Privacy
            </a>
            <a
              href={links.terms}
              className="text-footer-text underline-offset-4 hover:text-white"
            >
              Terms
            </a>
            <a
              href={links.contact}
              className="text-footer-text underline-offset-4 hover:text-white"
            >
              Contact
            </a>
            <span>© 2026 Tidypin</span>
          </nav>
        </div>
      </footer>
    </section>
  );
}
