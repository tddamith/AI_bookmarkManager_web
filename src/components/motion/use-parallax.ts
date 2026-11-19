"use client";

import { useScroll, useTransform, type MotionValue } from "motion/react";
import type { RefObject } from "react";
import { parallax } from "@/lib/parallax-config";
import { useMotionPrefs } from "./use-motion-prefs";

/**
 * Scroll parallax for one element. Returns a MotionValue (px) to use as `y` or `x`.
 * speed 0.5  → element drifts at half the page's scroll speed (appears slower)
 * speed -0.5 → drifts the other way (appears faster)
 * Max offset = |speed| × parallax.distance / 2, scaled down on mobile, 0 for reduced motion.
 */
// `axis` is informational: the returned value is applied to x or y by the caller (see ParallaxLayer).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useParallax(ref: RefObject<HTMLElement | null>, speed: number, _axis: "x" | "y" = "y"): MotionValue<number> {
  const { factor } = useMotionPrefs();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const max = (speed * parallax.distance * factor) / 2;
  return useTransform(scrollYProgress, [0, 1], [-max, max]);
}
