"use client";

import { motion } from "motion/react";
import { useRef, type CSSProperties, type ReactNode } from "react";
import { useParallax } from "./use-parallax";

type Props = {
  speed?: number;
  axis?: "x" | "y";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/** Wrapper that moves its children with scroll. Animates transform only (GPU), no layout shift. */
export function ParallaxLayer({ speed = 0.5, axis = "y", className, style, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const offset = useParallax(ref, speed, axis);
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...style, willChange: "transform", ...(axis === "x" ? { x: offset } : { y: offset }) }}
    >
      {children}
    </motion.div>
  );
}
