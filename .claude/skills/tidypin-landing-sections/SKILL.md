---
name: tidypin-landing-sections
description: Add, edit or reorder sections of the Tidypin landing page (header/hero, features, AI summary, how it works, popup vs side panel, pricing, trust, FAQ, CTA/footer) while staying faithful to the design canvas and design system.
---

# Tidypin landing page sections

Design source: Claude design canvas, artboard **Website · Landing page**. Spec and anatomy: `DESIGN.md`. Also follow the `tidypin-design-system` and `tidypin-seo` skills.

## File map

| Section | File | Notes |
|---|---|---|
| Logo, nav, hero + CSS mock | `src/components/landing/header-hero.tsx` | Lives inside `<header>` on lime; `Logo` is reused |
| Features (4 cards) | `src/components/landing/features.tsx` | lime / white / sky / sand |
| AI summary band | `src/components/landing/summary.tsx` | full-bleed sky |
| How it works, Popup vs side panel | `src/components/landing/how-and-surfaces.tsx` | How it works embeds `<HowItWorksDemo />` |
| Animated how-it-works prototype | `src/components/landing/how-it-works-demo.tsx` | Framer Motion (`motion/react`); all copy/timing in the CONFIG block at the top; scenes are pure functions of the clock `t` |
| Save flow demo section | `src/components/landing/save-section.tsx` + `save-bookmark-demo.tsx` | 9s looping `<SaveBookmarkDemo />`; engine in `use-demo-timeline.ts` (clock, in-view/hover pause, scaling, cursor, reduced-motion frames) |
| Web portal (dark band) | `src/components/landing/portal.tsx` | after Surfaces, before Pricing |
| Pricing, Trust, FAQ, CTA + footer | `src/components/landing/pricing-trust-faq.tsx` | exports `faqs` used for FAQPage JSON-LD |
| Composition + page JSON-LD | `src/app/page.tsx` | order of sections |
| Links & placeholders | `src/lib/site.ts` (`links`, `pricing`) | replace `#` and `[PRICE]` here only |

## Adding a section

1. Create a component in `src/components/landing/` (server component by default; no `"use client"` unless interactivity is required).
2. Wrap in `<section aria-labelledby="x-title">` with `SectionHeading` or an `h2` carrying that id. Full-bleed bands use `border-y border-ink` + a flat color and an inner `container`.
3. Use `py-24`, grids with `auto-fit/minmax`, 16–32px gaps.
4. Add it in `src/app/page.tsx` inside `<main id="main">` (header and CTA/footer stay outside `main`).
5. If it has an anchor nav item, give the section an `id` and add the link in `header-hero.tsx`.
6. Alternate band colors so two bands of the same color never touch.

## Do not

- Do not use `new Date()` / `Date.now()` / `Math.random()` in server components — `cacheComponents` is on and the build fails. Year is static ("2026").
- Do not hard-code outbound URLs or prices in components; use `links` / `pricing`.
- Do not add images without `next/image`, explicit dimensions and meaningful `alt`.
- Do not invent testimonials, stats, logos or reviews.

## Verify

`npm run build`, then `npx next start` and check `/` at 375px, 768px and 1440px widths.
