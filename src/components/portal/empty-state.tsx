import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/components/ui/icons";

export type EmptyKind = "library" | "all" | "later" | "favorites" | "tidy";

const S = { fill: "none", stroke: "#111111", strokeWidth: 1 } as const;
const squiggle = (d: string) => <path d={d} {...S} />;
const cross = (d: string) => <path d={d} stroke="#111111" strokeWidth="1" />;

const art: Record<EmptyKind, { label: string; svg: ReactNode }> = {
  library: {
    label: "Organize: three stacked folders",
    svg: (
      <>
        <rect width="320" height="240" rx="24" fill="#F4F4F1" />
        {squiggle("M36 40H206V156")}{squiggle("M220 36L290 128")}
        <path d="M98 112a8 8 0 0 1 8-8h28.8l12.2 12.2h39a8 8 0 0 1 8 8v60a8 8 0 0 1-8 8h-80a8 8 0 0 1-8-8z" fill="#FFFFFF" stroke="#111111" strokeWidth="1.5" />
        <path d="M118 92a8 8 0 0 1 8-8h28.8l12.2 12.2h39a8 8 0 0 1 8 8v60a8 8 0 0 1-8 8h-80a8 8 0 0 1-8-8z" fill="#A6C3DD" stroke="#111111" strokeWidth="1.5" />
        <path d="M138 72a8 8 0 0 1 8-8h28.8l12.2 12.2h39a8 8 0 0 1 8 8v60a8 8 0 0 1-8 8h-80a8 8 0 0 1-8-8z" fill="#111111" stroke="#111111" strokeWidth="1.5" />
        <path d="M138 88.2H234" stroke="#F4F4F1" strokeWidth="1" />
        <circle cx="246" cy="60" r="9" fill="#D4FA1E" stroke="#111111" strokeWidth="1.5" />
        <circle cx="64" cy="184" r="5" {...S} />{cross("M79 181L89 191M89 181L79 191")}
      </>
    ),
  },
  all: {
    label: "Save: a bookmark inside frame lines",
    svg: (
      <>
        <rect width="320" height="240" rx="24" fill="#D4FA1E" />
        {squiggle("M40 36H190V156")}{squiggle("M206 36L288 140")}
        <path d="M150 70h62v92l-31-20.2-31 20.2z" fill="#111111" />
        <path d="M181 70v46" stroke="#D4FA1E" strokeWidth="1" />
        <circle cx="214" cy="72" r="9" fill="#FFFFFF" stroke="#111111" strokeWidth="1.5" />
        {squiggle("M56 170c10-22 30-24 30-8 0 12-18 10-14-2 4-12 22-14 34-6")}{cross("M255 179L269 193M269 179L255 193")}
      </>
    ),
  },
  later: {
    label: "Empty state: a dashed empty folder",
    svg: (
      <>
        <rect width="320" height="240" rx="24" fill="#F4F4F1" />
        {squiggle("M44 40H194V148")}{squiggle("M208 40L284 136")}
        <path d="M110 108a8 8 0 0 1 8-8h30l12 12h44a8 8 0 0 1 8 8v52a8 8 0 0 1-8 8h-86a8 8 0 0 1-8-8z" fill="none" stroke="#111111" strokeWidth="1.5" strokeDasharray="5 5" />
        <circle cx="212" cy="96" r="9" fill="#D4FA1E" stroke="#111111" strokeWidth="1.5" />
        {squiggle("M220 170c10-22 30-24 30-8 0 12-18 10-14-2 4-12 22-14 34-6")}<circle cx="70" cy="184" r="5" {...S} />
      </>
    ),
  },
  favorites: {
    label: "Tidypin: a solid pin holding the frame",
    svg: (
      <>
        <rect width="320" height="240" rx="24" fill="#D4FA1E" />
        {squiggle("M40 32H180V152")}{squiggle("M196 32L286 140")}
        <path d="M124 64h72l-10 46 24 22h-100l24-22z" fill="#111111" />
        <path d="M160 132v56" stroke="#111111" strokeWidth="6" strokeLinecap="round" />
        <path d="M160 64v44" stroke="#D4FA1E" strokeWidth="1" />
        <circle cx="214" cy="62" r="9" fill="#FFFFFF" stroke="#111111" strokeWidth="1.5" />
        {cross("M63 179L77 193M77 179L63 193")}{squiggle("M232 178c10-22 30-24 30-8 0 12-18 10-14-2 4-12 22-14 34-6")}
      </>
    ),
  },
  tidy: {
    label: "Success: a check in a solid circle",
    svg: (
      <>
        <rect width="320" height="240" rx="24" fill="#A6C3DD" />
        {squiggle("M40 40H180V150")}{squiggle("M196 36L284 144")}
        <circle cx="160" cy="120" r="54" fill="#111111" />
        <path d="M134 122l18 18 36-38" fill="none" stroke="#D4FA1E" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        {squiggle("M60 176c10-22 30-24 30-8 0 12-18 10-14-2 4-12 22-14 34-6")}{cross("M255 55L269 69M269 55L255 69")}
      </>
    ),
  },
};

export type EmptyAction = { label: string; onClick?: () => void; href?: string; arrow?: boolean };

const primary = "inline-flex h-12 cursor-pointer items-center gap-2.5 rounded-pill border-0 bg-ink px-[22px] text-[15px] font-medium text-white no-underline hover:bg-ink-muted";
const secondary = "inline-flex h-12 cursor-pointer items-center rounded-pill border-[1.5px] border-ink bg-transparent px-[22px] text-[15px] font-medium text-ink no-underline hover:bg-paper";

function Action({ a, kind }: { a: EmptyAction; kind: "primary" | "secondary" }) {
  const cls = kind === "primary" ? primary : secondary;
  const body = <>{a.label}{a.arrow && <ArrowRight stroke="#FFFFFF" />}</>;
  if (a.href) return a.href.startsWith("/") ? <Link href={a.href} className={cls}>{body}</Link> : <a href={a.href} className={cls}>{body}</a>;
  return <button type="button" onClick={a.onClick} className={cls}>{body}</button>;
}

/** Empty screens for the web portal (Library, All bookmarks, Read later, Favorites, AI tidy-up "all tidy"). */
export function EmptyState({ kind, kicker, title, body, primary: p, secondary: s, footnote }: {
  kind: EmptyKind; kicker: string; title: string; body: string; primary: EmptyAction; secondary?: EmptyAction; footnote?: string;
}) {
  const { label, svg } = art[kind];
  return (
    <>
      <section className="flex grow items-center justify-center rounded-[28px] border border-ink bg-white px-8 py-14 max-sm:px-5">
        <div className="flex max-w-[480px] flex-col items-center gap-4 text-center">
          <svg width="320" height="240" viewBox="0 0 320 240" role="img" aria-label={label} className="block h-auto max-w-full">{svg}</svg>
          <p className="mt-2 text-[13px] text-ink-muted">{kicker} —</p>
          <h2 className="text-[40px] font-normal leading-[1.02] tracking-[-0.035em] max-sm:text-[32px]">{title}</h2>
          <p className="text-base leading-[1.55] text-ink-muted">{body}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2.5">
            <Action a={{ arrow: true, ...p }} kind="primary" />
            {s && <Action a={s} kind="secondary" />}
          </div>
        </div>
      </section>
      {footnote && <p className="text-[13px] text-ink-muted">{footnote}</p>}
    </>
  );
}
