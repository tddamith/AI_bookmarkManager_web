---
name: tidypin-design-system
description: Apply the Tidypin design system (lime #D4FA1E + ink #111 on paper #F4F4F1, Inter Tight light headlines, pill buttons, hairline rules, flat color bands) when building or reviewing any page, component or style in this Next.js project.
---

# Tidypin design system

Full spec: `DESIGN.md` at the repo root — read it first. Tokens: `src/app/globals.css` (`@theme`). Shared UI: `src/components/ui/`.

## Rules

1. **Use tokens, not hex.** `bg-lime`, `bg-paper`, `bg-sky`, `bg-sand`, `bg-ink`, `text-ink-soft`, `text-ink-muted`, `border-ink`, `rounded-pill`, `rounded-card`. Add a token to `globals.css` before using a new color.
2. **Type:** Inter Tight (`font-sans`). Headlines `font-normal` with tight negative tracking (-0.035 to -0.045em) and `leading-[0.98–1.04]`; never bold. Use `clamp()` for H1/H2.
3. **Shape:** everything interactive is a pill. Cards 28px. No shadows, no gradients, no emoji, no dark mode. Separate regions with 1px `border-ink` rules or flat full-bleed color bands.
4. **Buttons:** use `ButtonLink` (`primary` | `secondary` | `accent`; `md` 44 / `lg` 54 / `xl` 56). Accent (lime) only on `ink` backgrounds. Do not hand-roll button styles.
5. **Section header:** `SectionHeading` (title left, `Eyebrow —<br/>detail` right, rule below). Container: `container` from `section-heading.tsx`.
6. **Text color:** ink family only; white text only on `ink`. Never white on lime/sky/sand.
7. **Focus:** global 2px black ring (`:focus-visible` in globals.css). Never remove outlines without replacing them.
8. **Icons:** inline flat SVG from `ui/icons.tsx`; decorative `aria-hidden`, informative `role="img"` + `aria-label`.
9. **Copy:** short, plain, em-dash separators, no invented stats. Unknown values stay placeholders in `src/lib/site.ts`.
10. **Responsive:** flex-wrap and `grid-cols-[repeat(auto-fit,minmax(Npx,1fr))]` first; touch targets ≥ 44px; verify at 375px.

## Checklist before finishing

- No raw hex values or arbitrary colors in JSX (except one-off mock-UI grays inside illustrations).
- One `<h1>` per page; sections have `aria-labelledby`.
- Contrast ≥ 4.5:1 for text.
- `npm run build` and `npm run lint` pass.
