/**
 * Single source of truth for every parallax / reveal value on the landing page.
 * Pixel values are for desktop; on <768px scroll offsets are multiplied by `mobileFactor`.
 */
export const parallax = {
  /** assumed scroll distance a layer is "in play" over; speed × distance / 2 = max offset */
  distance: 800,
  mobileFactor: 0.4,

  spring: { stiffness: 120, damping: 20 },

  /** hero mouse parallax — max px offsets (desktop, fine pointer, ≥1024px) */
  mouse: {
    perspective: 1200,
    blob: -6, // negative = moves opposite to the cursor
    window: 8,
    tilt: 3, // deg
    card: 14,
    floaters: 22, // toast + folder chips
  },

  /** hero scroll parallax: end values at scrollYProgress = 1 */
  heroScroll: {
    text: { y: -60, opacity: 0.4 },
    window: { y: -120, scale: 0.96 },
    toast: { y: -200 },
    chips: { y: -260, rotate: 8 },
    blob: { y: 80 },
  },

  /** decorative band shapes: 0.5 = they scroll at half speed */
  decorSpeed: 0.5,

  /** "Small popup or side panel": speeds are opposite so the mockups cross (±40px) */
  surfaces: { popup: -0.1, panel: 0.1 },

  /** light mockups (not text) */
  mockSpeed: 0.15,

  /** scroll-in reveals */
  reveal: { y: 40, headingY: 30, stagger: 0.08, amount: 0.2, duration: 0.6, headingDuration: 0.9 },

  /** pinned demo window tilt (deg): top → middle → bottom of the scroll track */
  demoTilt: 4,
} as const;
