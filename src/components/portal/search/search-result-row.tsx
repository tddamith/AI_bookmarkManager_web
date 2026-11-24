"use client";

import { motion, useReducedMotion } from "motion/react";
import { Highlight } from "@/components/portal/search/highlight";
import type { Row } from "@/components/portal/search/rows";
import { SiteIcon } from "@/components/portal/site-icon";
import { folderTones } from "@/components/import/use-sync-status";
import { filterLabel } from "@/lib/search";
import { nf } from "@/components/import/use-sync-status";

const Dot = ({ tone }: { tone: number }) => (
  <span className={`size-3.5 shrink-0 rounded-full border border-ink ${folderTones[tone % folderTones.length]}`} aria-hidden="true" />
);
const Tile = ({ children }: { children: React.ReactNode }) => (
  <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] border border-[#E6E5E0] bg-white" aria-hidden="true">{children}</span>
);
const Count = ({ n }: { n: number }) => <span className="shrink-0 text-xs tabular-nums text-ink-muted">{nf(n)}</span>;

export function SearchResultRow({ row, id, query, active, index, onChoose, onHover }: {
  row: Row;
  id: string;
  query: string;
  active: boolean;
  index: number;
  onChoose: (row: Row, alt: boolean) => void;
  onHover: () => void;
}) {
  const reduced = useReducedMotion();
  let body: React.ReactNode;
  switch (row.kind) {
    case "bookmark": {
      const d = row.doc;
      body = (
        <>
          <Tile><SiteIcon domain={d.domain} size={20} /></Tile>
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="truncate text-sm"><Highlight text={d.title} query={query} /></span>
            <span className="truncate text-xs text-ink-muted"><Highlight text={d.domain} query={query} /> · {d.folder}</span>
            {d.summary && <span className="truncate text-xs text-ink-muted"><Highlight text={d.summary} query={query} /></span>}
          </span>
        </>
      );
      break;
    }
    case "site":
      body = (<><Tile><SiteIcon domain={row.domain} size={20} /></Tile><span className="min-w-0 grow truncate text-sm"><Highlight text={row.domain} query={query} /></span><Count n={row.count} /></>);
      break;
    case "tag":
      body = (<><span className="inline-flex h-6 items-center rounded-full border border-ink bg-white px-2.5 text-xs">#<Highlight text={row.tag} query={query} /></span><span className="grow" /><Count n={row.count} /></>);
      break;
    case "folder":
      body = (<><Dot tone={row.tone} /><span className="min-w-0 grow truncate text-sm"><Highlight text={row.folder.name} query={query} /></span><Count n={row.folder.count} /></>);
      break;
    case "recent":
      body = (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3A3A3A" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" className="shrink-0"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          <span className="min-w-0 grow truncate text-sm">{row.text}</span>
        </>
      );
      break;
    case "quick":
      body = "view" in row.to
        ? (<><span className="flex size-3.5 shrink-0 items-center justify-center" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill={row.to.view === "fav" ? "#111" : "none"} stroke="#111" strokeWidth="1.8" strokeLinejoin="round"><path d={row.to.view === "fav" ? "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" : "M6 3h12v18l-6-4-6 4z"} /></svg></span><span className="grow text-sm">{row.label}</span></>)
        : (<><Dot tone={row.to.tone} /><span className="min-w-0 grow truncate text-sm">{row.label}</span><Count n={row.to.folder.count} /></>);
      break;
    case "operator":
      body = (<><span className="inline-flex h-6 items-center rounded-full border border-ink bg-white px-2.5 text-xs">{filterLabel(row.filter)}</span><span className="grow" />{row.count !== undefined && <Count n={row.count} />}</>);
      break;
    case "all":
      body = (
        <>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="shrink-0"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <span className="min-w-0 grow truncate text-sm">Search all for “{row.text}”</span>
          <span className="shrink-0 text-xs text-ink-muted" aria-hidden="true">↵</span>
        </>
      );
      break;
  }
  return (
    <motion.div
      id={id} role="option" aria-selected={active}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      transition={{ duration: reduced ? 0.1 : 0.18, delay: reduced ? 0 : Math.min(index, 12) * 0.02 }}
      onMouseMove={onHover}
      onMouseDown={(e) => e.preventDefault() /* keep focus in the input */}
      onClick={(e) => onChoose(row, e.shiftKey || e.metaKey || e.ctrlKey)}
      className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${active ? "bg-[#F3F2EE]" : ""}`}
    >
      {body}
    </motion.div>
  );
}
