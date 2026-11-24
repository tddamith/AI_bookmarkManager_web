"use client";

import { LayoutGroup, MotionConfig } from "motion/react";
import { useEffect, useState } from "react";
import { ActivePill, SidebarFolders } from "@/components/portal/sidebar/sidebar-folders";
import { Count, Enter } from "@/components/portal/sidebar/motion";
import { markEntered, useSidebarFolders } from "@/components/portal/sidebar/use-sidebar-folders";
import type { SidebarData, View } from "@/components/portal/types";
import { SparkIcon } from "@/components/ui/icons";

const ROW = "relative flex h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-full border-0 px-2.5 text-left text-sm";
const tone = (on: boolean) => (on ? "text-white" : "bg-transparent text-ink hover:bg-white");

export function PortalSidebar({ initial, initialExpanded, enter, tick, isDash, view, folderId, loadingFolderId, filedLeft, onGo }: {
  initial: SidebarData | null;
  initialExpanded: boolean;
  enter: boolean;
  tick: number;
  isDash: boolean;
  view: View;
  folderId: string | null;
  loadingFolderId: string | null;
  filedLeft: number;
  onGo: (view: View, folder?: string | null) => void;
}) {
  const { data, status, retry } = useSidebarFolders(initial, tick);
  // Counts tween only the first time data shows up (first visit this session, or after a skeleton).
  const [cameFromSkeleton] = useState(() => !data);
  const countAnimate = enter || cameFromSkeleton;

  useEffect(() => { if (enter) markEntered(); }, [enter]);

  const nav = [
    ["all", "All bookmarks", data?.counts.all],
    ["later", "Read later", data?.counts.later],
    ["fav", "Favorites", data?.counts.fav],
  ] as const;

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id="sidebar">
        <nav aria-label="Library" className="flex max-w-[240px] flex-[1_1_200px] flex-col gap-5 p-6 pr-4 max-md:max-w-none md:sticky md:top-0 md:max-h-[calc(100dvh-73px)] md:self-start">
          <div className="flex shrink-0 flex-col gap-0.5">
            <Enter i={0} enter={enter}>
              <button type="button" className={`${ROW} ${tone(isDash)}`} aria-current={isDash ? "page" : undefined} onClick={() => onGo("dash")}>
                {isDash && <ActivePill />}<span className="relative">Dashboard</span>
              </button>
            </Enter>
            {nav.map(([id, label, n], i) => {
              const on = !folderId && !isDash && view === id;
              return (
                <Enter key={id} i={1 + i} enter={enter}>
                  <button type="button" className={`${ROW} ${tone(on)}`} aria-current={on ? "page" : undefined} onClick={() => onGo(id)}>
                    {on && <ActivePill />}
                    <span className="relative">{label}</span>
                    <span className="relative min-w-7 text-right text-xs tabular-nums">
                      {n === undefined ? <span className="tp-shimmer ml-auto block h-3 w-5 rounded" aria-hidden="true" /> : <Count value={n} animate={countAnimate} />}
                    </span>
                  </button>
                </Enter>
              );
            })}
          </div>

          <SidebarFolders data={data} status={status} retry={retry} activeId={folderId} loadingId={loadingFolderId} enter={enter}
            initialExpanded={initialExpanded} countAnimate={countAnimate} onSelect={(id) => onGo("all", id)} />

          <svg aria-hidden="true" className="mt-auto h-[180px] min-h-0 w-full shrink-[10] overflow-hidden rounded-[18px] border border-ink bg-white max-md:shrink-0">
            <defs><pattern id="tp-stack" width="120" height="120" patternUnits="userSpaceOnUse"><path d="M12 12H100V100M12 32H80V100M12 52H60V100M76 12L108 44" fill="none" stroke="#111" strokeWidth="1" strokeLinecap="square" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#tp-stack)" />
          </svg>
          <button type="button" onClick={() => onGo("tidy")} className="flex shrink-0 cursor-pointer items-center gap-2 rounded-[18px] border-0 bg-lime px-3.5 py-3 text-left text-[13px] hover:bg-lime-deep">
            <SparkIcon size={14} /><span className="grow">AI tidy-up</span>{filedLeft > 0 && <span>{filedLeft} →</span>}
          </button>
        </nav>
      </LayoutGroup>
    </MotionConfig>
  );
}
