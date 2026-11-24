"use client";

import { useEffect } from "react";
import { SearchResultRow } from "@/components/portal/search/search-result-row";
import { SearchSkeleton } from "@/components/portal/search/search-skeleton";
import type { Row, Section } from "@/components/portal/search/rows";

export function SearchDropdown({ listId, sections, footer, query, activeIndex, dim, skeleton, noMatch, sheet, onChoose, onHover, onClearRecent }: {
  listId: string;
  sections: Section[];
  footer: Row | null;
  query: string;
  activeIndex: number;
  dim: boolean;
  skeleton: boolean;
  noMatch: boolean;
  sheet: boolean;
  onChoose: (row: Row, alt: boolean) => void;
  onHover: (i: number) => void;
  onClearRecent: () => void;
}) {
  const optId = (i: number) => `${listId}-opt-${i}`;
  useEffect(() => {
    if (activeIndex >= 0) document.getElementById(optId(activeIndex))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  let n = 0;
  return (
    <div
      id={listId} role="listbox" aria-label="Search suggestions"
      className={`overflow-y-auto overscroll-contain bg-white p-2 ${skeleton ? "min-h-[220px]" : ""} ${sheet ? "min-h-0 grow rounded-2xl border border-[#E6E5E0]" : "max-h-[420px] rounded-[20px] border border-[#E6E5E0] shadow-[0_12px_32px_rgba(0,0,0,0.08)]"}`}
    >
      {skeleton ? <SearchSkeleton /> : (
        <div className={`transition-opacity duration-150 ${dim ? "opacity-50" : "opacity-100"}`}>
          {sections.map((sec) => (
            <div key={sec.id} role="group" aria-labelledby={`${listId}-g-${sec.id}`} className="pb-1">
              <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <span id={`${listId}-g-${sec.id}`} className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-muted">{sec.label}</span>
                {sec.id === "recent" && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClearRecent} className="cursor-pointer bg-transparent p-0 text-[11px] text-ink-muted underline">Clear</button>}
              </div>
              {sec.rows.map((row) => {
                const i = n++;
                return <SearchResultRow key={row.key} row={row} id={optId(i)} query={query} active={i === activeIndex} index={i} onChoose={onChoose} onHover={() => onHover(i)} />;
              })}
            </div>
          ))}

          {noMatch && (
            <div className="px-3 py-5 text-center">
              <p className="text-sm">No matches for “{query}”</p>
              <p className="mt-1 text-xs text-ink-muted">Try a site name, tag or keyword</p>
            </div>
          )}

          {footer && (
            <div className="mt-1 border-t border-[#E6E5E0] pt-1">
              <SearchResultRow row={footer} id={optId(n)} query={query} active={n === activeIndex} index={n} onChoose={onChoose} onHover={() => onHover(n)} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
