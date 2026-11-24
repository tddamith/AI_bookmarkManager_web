"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";
import { EASE, Count, Enter } from "@/components/portal/sidebar/motion";
import { useFoldersExpanded, usePrefetchOnHover, type FoldersStatus } from "@/components/portal/sidebar/use-sidebar-folders";
import type { SidebarData } from "@/components/portal/types";
import { folderTones } from "@/components/import/use-sync-status";

export const VISIBLE = 4;
const ROW = "relative flex h-10 w-full items-center justify-between gap-2 rounded-full border-0 px-2.5 text-left text-sm";
const rowTone = (on: boolean) => (on ? "text-white" : "bg-transparent text-ink hover:bg-white");
const skeletonWidths = ["62%", "74%", "52%", "68%"];

export function ActivePill() {
  return <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-full bg-ink" transition={{ duration: 0.28, ease: EASE }} aria-hidden="true" />;
}

export function FolderRow({ folder, index, active, loading, countAnimate, onSelect }: {
  folder: SidebarData["folders"][number];
  index: number;
  active: boolean;
  loading: boolean;
  countAnimate: boolean;
  onSelect: () => void;
}) {
  const hover = usePrefetchOnHover(folder.id);
  return (
    <button type="button" onClick={onSelect} title={folder.name} aria-current={active ? "page" : undefined} aria-busy={loading || undefined}
      className={`${ROW} cursor-pointer ${rowTone(active)}`} {...hover}>
      {active && <ActivePill />}
      <span className="relative flex min-w-0 items-center gap-2.5">
        <span className={`size-3.5 shrink-0 rounded-full border ${active ? "border-white" : "border-ink"} ${folderTones[index % folderTones.length]} ${loading ? "animate-pulse" : ""}`} aria-hidden="true" />
        <span className="truncate">{folder.name}</span>
      </span>
      <span className="relative ml-2 min-w-7 shrink-0 text-right text-xs tabular-nums"><Count value={folder.count} animate={countAnimate} /></span>
    </button>
  );
}

export function FolderRowSkeleton({ i }: { i: number }) {
  return (
    <div className={`${ROW} cursor-default`} aria-hidden="true">
      <span className="flex min-w-0 grow items-center gap-2.5">
        <span className="tp-shimmer size-3.5 shrink-0 rounded-full" />
        <span className="tp-shimmer h-3 rounded" style={{ width: skeletonWidths[i % skeletonWidths.length] }} />
      </span>
      <span className="tp-shimmer ml-2 h-3 w-5 shrink-0 rounded" />
    </div>
  );
}

function Chevron({ up }: { up: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className={`shrink-0 transition-transform duration-[280ms] motion-reduce:transition-none ${up ? "rotate-180" : ""}`} style={{ transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function SidebarFolders({ data, status, retry, activeId, loadingId, enter, initialExpanded, countAnimate, onSelect }: {
  data: SidebarData | null;
  status: FoldersStatus;
  retry: () => void;
  activeId: string | null;
  loadingId: string | null;
  enter: boolean;
  initialExpanded: boolean;
  countAnimate: boolean;
  onSelect: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const listId = useId();
  const folders = data?.folders ?? [];
  const hidden = Math.max(0, folders.length - VISIBLE);
  const activeIdx = folders.findIndex((f) => f.id === activeId);
  const { expanded, toggle } = useFoldersExpanded(initialExpanded, activeIdx >= VISIBLE, activeId);
  const open = expanded && hidden > 0;

  return (
    <div className="flex min-h-0 flex-col gap-0.5">
      <Enter i={4} enter={enter}><p className="px-2.5 pb-1.5 text-xs text-ink-muted">Folders —</p></Enter>

      {status === "error" && (
        <p className="px-2.5 text-xs text-ink-muted">Couldn&apos;t load folders · <button type="button" onClick={retry} className="cursor-pointer bg-transparent p-0 text-ink underline">Retry</button></p>
      )}

      {/* Both states share one grid cell so the swap never shifts layout; skeleton fades out as rows fade in (150ms). */}
      {status !== "error" && (
        <div className="grid min-h-0">
          <div aria-hidden={status !== "loading"} className={`col-start-1 row-start-1 flex flex-col gap-0.5 transition-opacity duration-150 ${status === "loading" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            {status === "loading" && Array.from({ length: VISIBLE }, (_, i) => <FolderRowSkeleton key={i} i={i} />)}
          </div>

          <div className={`tp-thin-scroll col-start-1 row-start-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden transition-opacity duration-150 ${status === "ready" ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            {folders.slice(0, VISIBLE).map((f, i) => (
              <Enter key={f.id} i={5 + i} enter={enter}>
                <FolderRow folder={f} index={i} active={activeId === f.id} loading={loadingId === f.id} countAnimate={countAnimate} onSelect={() => onSelect(f.id)} />
              </Enter>
            ))}

            {hidden > 0 && (
              <>
                <div id={listId} className="grid transition-[grid-template-rows] duration-[280ms] motion-reduce:transition-none" style={{ gridTemplateRows: open ? "1fr" : "0fr", transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)" }}>
                  <div className="min-h-0 overflow-hidden" inert={!open}>
                    <div className="flex flex-col gap-0.5">
                      {folders.slice(VISIBLE).map((f, k) => (
                        <motion.div key={f.id} initial={false}
                          animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: reduced ? 0 : 6 }}
                          transition={reduced ? { duration: 0.1 } : { duration: 0.28, ease: EASE, delay: open ? Math.min(k * 0.03, 0.3) : 0 }}>
                          <FolderRow folder={f} index={VISIBLE + k} active={activeId === f.id} loading={loadingId === f.id} countAnimate={false} onSelect={() => onSelect(f.id)} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
                <Enter i={5 + VISIBLE} enter={enter}>
                  <button type="button" onClick={toggle} aria-expanded={open} aria-controls={listId}
                    className="flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-full border-0 bg-transparent px-2.5 text-left text-sm text-ink-muted hover:bg-white hover:text-ink">
                    <span>{open ? "Show less" : `View more (${hidden})`}</span>
                    <Chevron up={open} />
                  </button>
                </Enter>
              </>
            )}
            {status === "ready" && folders.length === 0 && <p className="px-2.5 text-xs text-ink-muted">No folders yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
