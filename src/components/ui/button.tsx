import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "accent";
type Size = "md" | "lg" | "xl";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-pill font-medium no-underline transition-colors";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-muted",
  secondary: "border-[1.5px] border-ink text-ink hover:bg-white",
  accent: "bg-lime text-ink hover:bg-lime-deep",
};

const sizes: Record<Size, string> = {
  md: "h-11 px-5 text-[15px]",
  lg: "h-[54px] px-7 text-base",
  xl: "h-14 px-7 text-[17px]",
};

type Props = ComponentProps<"a"> & { variant?: Variant; size?: Size };

/** Pill link-button. Hover = one step lighter black, or white fill on outlines. */
export function ButtonLink({ variant = "primary", size = "md", className = "", ...rest }: Props) {
  return <a className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...rest} />;
}
