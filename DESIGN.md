# Tidypin Design System

Source: Claude design canvas "AI Bookmark Manager" → artboard **Website · Landing page** (plus the Buttons / Text fields component sheets). Tokens live in `src/app/globals.css` (`@theme`). Brand data lives in `src/lib/site.ts`.

**Personality:** editorial, flat, high-contrast. Big light-weight type, hairline black rules, pill shapes, one lime accent. No gradients, no shadows, no emoji, no dark mode.

## Color

| Token (Tailwind) | Hex | Use |
|---|---|---|
| `ink` | `#111111` | Text, borders, rules, primary buttons, dark CTA band |
| `ink-soft` | `#2A2A2A` | Body text on lime / paper |
| `ink-muted` | `#3A3A3A` | Secondary text on white/paper, primary hover |
| `paper` | `#F4F4F1` | Page background |
| `white` | `#FFFFFF` | Cards, trust band, hero mock |
| `lime` | `#D4FA1E` | Signature accent: header, highlight cards, accent button, focus glow |
| `lime-deep` | `#C2E80C` | Accent button hover |
| `sky` | `#A6C3DD` | Feature card + AI-summary band |
| `sand` | `#C9B597` | Feature card + popup/side-panel band |
| `footer-text` | `#D0D0D0` | Text on ink |
| `line-dark` | `#3A3A3A` | Rules on ink |
| `disabled` | `#A3A3A3` | Disabled text/outline |

Rules: text is always `ink` family (never white on lime/sky/sand). White text only on `ink`. Each full-width band is one flat color separated by `border-y border-ink`.

## Typography

Font: **Inter Tight** (300–600) via `next/font`, exposed as `--font-inter-tight` → `font-sans`.

| Role | Size | Weight | Tracking | Leading |
|---|---|---|---|---|
| H1 hero | `clamp(48px, 7vw, 88px)` | 400 | -0.045em | 0.98 |
| H2 section | `clamp(36px, 4.5vw, 56px)` | 400 | -0.035em | 1.02 |
| H2 CTA | `clamp(44px, 6vw, 80px)` | 400 | -0.045em | 0.98 |
| H3 card | 26–30px | 400 | -0.02em | — |
| Lead | 18–19px | 400 | — | 1.5 |
| Body | 15–16px | 400 | — | 1.5 |
| Eyebrow | 13–14px | 400 | — | — |
| Wordmark | 14px caps `TIDYPIN` | 600 | +0.06em | — |

Headlines are **regular weight**, not bold. Eyebrows use an em dash and a line break: `Features —<br/>01 to 04`. Card labels: `01 —`.

## Shape, borders, spacing

- Pills for every button and input: `rounded-pill`. Cards `rounded-card` (28px). Mock panels `rounded-panel` (18px), small tiles 14–20px.
- Rules: 1px `ink` between sections/rows; 2px `ink` on top of step/trust items; 1.5px `ink` outline on buttons and highlighted cards.
- Container: `max-w-[1200px]`, `px-6`. Section padding `py-24` (96px); hero `pt-[72px] pb-[88px]`; CTA `py-[104px]`.
- Grids: `repeat(auto-fit, minmax(240–300px, 1fr))`; gaps 16–32px. Mobile = natural wrap, no breakpoints needed.
- Touch targets ≥ 44px (nav `h-11`, large `h-[54px]`, hero `h-14`).

## Buttons (`ButtonLink` in `src/components/ui/button.tsx`)

| Variant | Look | Hover |
|---|---|---|
| `primary` | `ink` fill, white text | `ink-muted` |
| `secondary` | 1.5px `ink` outline, transparent | white fill |
| `accent` | `lime` fill, ink text (use on ink bg) | `lime-deep` |

Sizes `md` 44 · `lg` 54 · `xl` 56. States: **focus** = 2px black ring 3px out (global `:focus-visible`); **loading** = three dots/spinner, label hidden, width kept; **disabled** = gray fill or dashed gray outline, no hover.

Text fields (when needed): underline, pill, search+action, leading icon, password, textarea, tags, select. Focus = 2px black border + 4px lime glow, label turns black; AI work shows lime dots; disabled = dashed gray.

## Icons & imagery

Inline SVG only, flat, `ink` on colored bg or `lime` on `ink`: bookmark (`M6 3h12v18l-6-4-6 4z`), 4-point spark, circle-check, circle-plus, compass circle, arrow-down in 28px black circle. Decorative → `aria-hidden`; mockups → `role="img"` + `aria-label`. Hero is a CSS-built browser + side-panel mock, not a screenshot.

## Page anatomy (order matters)

1. **Header + hero** on `lime` — nav (Logo, anchors, Sign in, Sign up outline, Add to browser) → H1 + CTAs + mock with floating ink "Filed to…" chip.
2. **Features** — 4 cards: lime / white / sky / sand.
3. **AI summary** — full-bleed `sky`, copy + checklist left, lime summary card right.
4. **How it works** — 3 numbered steps with 2px top rule.
5. **Popup vs side panel** — full-bleed `sand`, two `paper` cards.
6. **Web portal** — full-bleed `ink` band: copy + checklist (lime checks) left, `paper` dashboard mock right, accent + white-outline buttons.
7. **Pricing** — Free (white) vs Pro (lime, outlined).
8. **Trust** — white band, "AI suggests. You decide." + 4 points.
9. **FAQ** — `<details>` list, first open.
10. **CTA + footer** — `ink` band, accent button, wordmark + legal links.

## Copy voice

Short, plain, second person. Verbs as titles (Save, Find, Tidy). Em dash as a separator. No hype, no invented stats. Unknown facts stay as placeholders (`[N]`, `[PRICE]`, `[X]`) in `site.ts › pricing` until real values exist.

## Accessibility

Real `<a>`/`<button>`/`<details>`; one `<h1>`; each section `aria-labelledby`; skip link; all text ≥ 4.5:1 (ink on lime/sky/sand/paper passes; `#A3A3A3` is for disabled only); reduced-motion respected.
