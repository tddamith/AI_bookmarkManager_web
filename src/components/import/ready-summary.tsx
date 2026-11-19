"use client";

import { ArrowRight } from "@/components/ui/icons";
import { FolderIcon } from "@/components/import/folder-icon";
import { folderTones, nf, useSyncStatus } from "@/components/import/use-sync-status";
import { links } from "@/lib/site";

export function ReadySummary() {
  const { data } = useSyncStatus(5000);
  const s = data?.stats;
  const stats: [string, number | undefined][] = [
    ["bookmarks", s?.bookmarks], ["folders", s?.folders], ["duplicates gone", s?.duplicates], ["dead links", s?.dead],
  ];
  return (
    <>
      <div className="flex flex-col gap-2.5">
        <h1 className="max-w-[520px] text-[clamp(40px,6vw,56px)] font-normal leading-[0.98] tracking-[-0.045em]">All sorted.</h1>
        <p className="m-0 flex flex-wrap gap-x-7 gap-y-2 text-sm text-[#1F1F1F]">
          {stats.map(([label, n]) => (
            <span key={label}>
              <span className="text-[32px] tracking-[-0.02em] text-ink">{n === undefined ? "–" : nf(n)}</span> {label}
            </span>
          ))}
        </p>
      </div>
      <ul className="m-0 flex list-none flex-col border-b border-ink p-0">
        {(data?.folders ?? []).slice(0, 8).map((f, i) => (
          <li key={f.id} className="flex h-[52px] items-center gap-3.5 border-t border-ink text-[17px]">
            <FolderIcon tone={folderTones[i % folderTones.length]} />
            <span className="grow truncate">{f.name}</span>
            <span className="text-[#1F1F1F]">{nf(f.count)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <a href={links.app} className="inline-flex h-14 flex-[1_1_260px] items-center justify-center gap-2.5 rounded-pill bg-ink px-7 text-[17px] font-medium text-white no-underline transition-colors hover:bg-ink-muted">
          Open my library <ArrowRight stroke="#FFFFFF" />
        </a>
        <a href="/import" className="inline-flex h-14 items-center rounded-pill border-[1.5px] border-ink px-6 text-base no-underline transition-colors hover:bg-white/60">
          Change folders
        </a>
      </div>
    </>
  );
}
