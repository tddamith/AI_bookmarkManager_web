---
name: tidypin-seo
description: Keep every page in this Next.js app SEO-complete (metadata, canonical, Open Graph, JSON-LD, sitemap, robots, semantic HTML, performance). Use when adding or changing any route or page content.
---

# Tidypin SEO checklist

Next.js here is a newer version than most docs — check `node_modules/next/dist/docs/01-app/` before using an API.

## Per page

1. Export `metadata` (or `generateMetadata`) with a unique `title` (≤ 60 chars), `description` (120–160 chars) and `alternates.canonical`. Root template is `%s | Tidypin`; use `title: { absolute }` for the home page.
2. Exactly one `<h1>`; headings descend in order; landmarks `header` / `main#main` / `footer` / `nav[aria-label]`.
3. Add the route to `src/app/sitemap.ts`. Private areas (`/api`, `/dashboard`) are disallowed in `src/app/robots.ts`; private pages also need `robots: { index: false }`.
4. Structured data via `<JsonLd data={...} />` (`src/components/json-ld.tsx`, escapes `<`). Root layout has Organization + WebSite; home has SoftwareApplication + FAQPage (built from the same `faqs` array as the visible FAQ — keep them in sync). Never mark up content that isn't visible.
5. Images: `next/image` with width/height, `alt`, `priority` only for the LCP image. Fonts: `next/font` only (`display: swap`).
6. Internal links use `next/link`; avoid `href="#"` placeholders in production — set real targets in `src/lib/site.ts › links`.

## Site-wide

- `NEXT_PUBLIC_SITE_URL` must be the production origin (see `.env.example`) — it drives canonical, sitemap, robots and OG URLs.
- `src/app/opengraph-image.tsx` is the default social card; add per-route ones next to the route if needed.
- Add Search Console / Bing verification tokens in `layout.tsx › metadata.verification`.
- Server-render content; do not hide primary copy behind client-only state.
- No `new Date()` in server components (cacheComponents prerender error).

## Verify

`npm run build`; `npx next start`; check `/robots.txt`, `/sitemap.xml`, `<title>`, canonical, `og:*`, JSON-LD in view-source; run Lighthouse (SEO, Accessibility ≥ 95) and the Rich Results Test on FAQ.
