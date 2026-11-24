import type { Ai, Item } from "@/lib/import-pipeline";

/**
 * The AI used by the import pipeline. This is the on-device version (rules + keywords, free and instant), the same idea as the
 * extension's own sorting: it files by site and topic, tags from the title, and writes a one-line summary.
 * The pipeline only depends on the `Ai` interface, so a model-backed version (the API's /ai "suggest" task) can replace it,
 * but at hundreds of bookmarks per import that would exceed the free monthly AI quota, so it is not the default.
 */
const SITE: [RegExp, string][] = [
  [/github|gitlab|stackoverflow|stackexchange|developer\.mozilla|npmjs|dev\.to|codepen|codesandbox|vercel|netlify|aws|cloudflare|docs\.|css-tricks|smashingmagazine|react\.dev|nextjs|tailwind/, "Dev"],
  [/figma|dribbble|behance|awwwards|canva|adobe|coolors|fonts\.google|uxdesign|nngroup/, "Design"],
  [/youtube|youtu\.be|vimeo|twitch|netflix|spotify/, "Media"],
  [/amazon|ebay|etsy|aliexpress|shopify|walmart|bestbuy|shop/, "Shopping"],
  [/booking|airbnb|tripadvisor|expedia|skyscanner|japan-guide|lonelyplanet|travel/, "Travel"],
  [/twitter|x\.com|facebook|instagram|linkedin|reddit|tiktok|discord/, "Social"],
  [/medium|substack|wikipedia|nytimes|bbc|theguardian|news|blog|hackernews|ycombinator/, "Reading"],
  [/notion|trello|asana|slack|zoom|docs\.google|drive\.google|calendar|atlassian|jira|monday|airtable/, "Work"],
];

const STOP = new Set("the and for with from your you are this that what how why when into about guide complete using use best top new www com org net http https html page pages vs which have has will can not".split(" "));

const host = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));

export const defaultAi: Ai = {
  async folder(item: Item, existing: string[]) {
    const h = host(item.url);
    const w = new Set(words(`${item.title} ${h}`));
    // 1) a folder you already have whose name appears in the title / site
    const own = existing.find((f) => w.has(f.toLowerCase()) || h.includes(f.toLowerCase()));
    if (own) return own;
    // 2) a well-known kind of site
    const hit = SITE.find(([re]) => re.test(h) || re.test(item.url.toLowerCase()));
    return hit ? hit[1] : "Reading";
  },
  async tags(item: Item) {
    const counts = new Map<string, number>();
    for (const t of words(item.title)) counts.set(t, (counts.get(t) ?? 0) + 1);
    const fromTitle = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).map(([t]) => t).slice(0, 3);
    const site = host(item.url).split(".").slice(-2, -1)[0];
    return [...new Set([...fromTitle, ...(site && !STOP.has(site) ? [site] : [])])].slice(0, 5);
  },
  async summary(item: Item) {
    const h = host(item.url);
    const title = item.title.trim() || h || item.url;
    return h && !title.toLowerCase().includes(h) ? `${title}. Saved from ${h}.` : `${title}.`;
  },
};
