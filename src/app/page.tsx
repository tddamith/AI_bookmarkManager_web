import type { Metadata } from "next";
import { Features } from "@/components/landing/features";
import { HeaderHero } from "@/components/landing/header-hero";
import { HowItWorks, Surfaces } from "@/components/landing/how-and-surfaces";
import { CtaFooter, Faq, faqs, Pricing, Trust } from "@/components/landing/pricing-trust-faq";
import { Portal } from "@/components/landing/portal";
import { SaveFlow } from "@/components/landing/save-section";
import { Summary } from "@/components/landing/summary";
import { JsonLd } from "@/components/json-ld";
import { absoluteUrl, siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — AI bookmark manager that organizes itself` },
  alternates: { canonical: "/" },
};

const pageJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: siteConfig.name,
      url: absoluteUrl("/"),
      applicationCategory: "BrowserApplication",
      operatingSystem: "Chrome, Edge, Brave",
      description: siteConfig.description,
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map(([q, a]) => ({
        "@type": "Question",
        name: q,
        acceptedAnswer: { "@type": "Answer", text: a },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <HeaderHero />
      <main id="main">
        <Features />
        <Summary />
        <SaveFlow />
        <HowItWorks />
        <Surfaces />
        <Portal />
        <Pricing />
        <Trust />
        <Faq />
      </main>
      <CtaFooter />
      <JsonLd data={pageJsonLd} />
    </>
  );
}
