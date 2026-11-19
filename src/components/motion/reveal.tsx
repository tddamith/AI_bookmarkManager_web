"use client";

import { motion } from "motion/react";
import type { CSSProperties, ReactNode } from "react";
import { parallax as cfg } from "@/lib/parallax-config";
import { useMotionPrefs } from "./use-motion-prefs";

const tags = { div: motion.div, li: motion.li, details: motion.details, h2: motion.h2, p: motion.p } as const;

type Props = {
  as?: keyof typeof tags;
  /** stagger index: delay = index × 80ms */
  index?: number;
  /** headings travel less and settle slower than body content → layered feel */
  variant?: "card" | "heading";
  className?: string;
  style?: CSSProperties;
  open?: boolean;
  children?: ReactNode;
};

/** Rise-in once at 20% in view. Reduced motion keeps only the opacity fade. */
export function Reveal({ as = "div", index = 0, variant = "card", className, style, open, children }: Props) {
  const { reduced } = useMotionPrefs();
  const Tag = tags[as] as typeof motion.div;
  const heading = variant === "heading";
  const y = reduced ? 0 : heading ? cfg.reveal.headingY : cfg.reveal.y;
  return (
    <Tag
      data-reveal=""
      className={className}
      style={style}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: cfg.reveal.amount }}
      transition={{
        duration: heading ? cfg.reveal.headingDuration : cfg.reveal.duration,
        delay: index * cfg.reveal.stagger,
        ease: [0.22, 1, 0.36, 1],
      }}
      {...(open !== undefined ? { open } : {})}
    >
      {children}
    </Tag>
  );
}
