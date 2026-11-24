export type Bookmark = {
  id: string; url: string; title: string; domain: string; folder: string; folderId: string | null;
  savedAt: number; later: boolean; fav: boolean; tags: string[]; summary: string; opens: number;
};
export type LibraryData = {
  bookmarks: Bookmark[];
  counts: { all: number; later: number; fav: number };
  folders: { id: string; name: string; count: number }[];
  fetchedAt: number;
};
export type SidebarData = {
  counts: { all: number; later: number; fav: number };
  folders: { id: string; name: string; count: number }[];
};
export type DashboardData = {
  range: "week" | "month";
  kpis: { value: string; label: string; delta: string }[];
  interests: { name: string; pct: number; delta: string }[];
  days: { day: string; n: number }[];
  busiest: string;
  peak: string | null;
  tips: { title: string; why: string; action: string; to: { view?: string; open?: string } }[];
  rising: { name: string; note: string }[];
  top: { id: string; rank: number; title: string; n: number }[];
  gems: { id: string; title: string; why: string }[];
  empty: boolean;
  filedLeft: number;
};
export type View = "dash" | "all" | "later" | "fav" | "tidy";

const palette = [
  { bg: "#111111", fg: "#D4FA1E" }, { bg: "#A6C3DD", fg: "#111111" }, { bg: "#C9B597", fg: "#111111" },
  { bg: "#D4FA1E", fg: "#111111" }, { bg: "#CFCFCC", fg: "#111111" }, { bg: "#111111", fg: "#FFFFFF" },
];
export function siteIcon(domain: string) {
  let h = 0;
  for (const c of domain) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return { ...palette[h % palette.length], letter: (domain[0] ?? "?").toUpperCase() };
}

export function ago(from: number, now: number) {
  const s = Math.max(0, (now - from) / 1000);
  if (s < 3600) return s < 120 ? "now" : `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  if (s < 86400 * 60) return `${Math.floor(s / 86400 / 7)}w`;
  return `${Math.floor(s / 86400 / 30)}mo`;
}
