/** Parses a browser-exported bookmarks file (Netscape HTML, from Chrome/Edge/Brave/Firefox/Safari). Browser-only. */
export type ParsedBookmarks = {
  folders: { id: string; name: string }[];
  bookmarks: { id: string; url: string; title: string; folderId: string | null; savedAt?: number }[];
};

export function parseBookmarksHtml(html: string): ParsedBookmarks {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const folders: ParsedBookmarks["folders"] = [];
  const bookmarks: ParsedBookmarks["bookmarks"] = [];

  function walk(dl: Element, folderId: string | null) {
    for (const dt of Array.from(dl.children)) {
      if (dt.tagName !== "DT") continue;
      const h3 = Array.from(dt.children).find((c) => c.tagName === "H3");
      const a = Array.from(dt.children).find((c) => c.tagName === "A");
      if (h3) {
        const id = `f${folders.length + 1}`;
        folders.push({ id, name: (h3.textContent ?? "").trim().slice(0, 200) || "Untitled" });
        // The nested list is inside the <dt> (HTML parser) or the next sibling.
        const inner = Array.from(dt.children).find((c) => c.tagName === "DL") ??
          (dt.nextElementSibling?.tagName === "DL" ? dt.nextElementSibling : null);
        if (inner) walk(inner, id);
      } else if (a) {
        const url = a.getAttribute("href") ?? "";
        if (/^https?:\/\//i.test(url) && url.length <= 2048) {
          const added = Number(a.getAttribute("add_date"));
          bookmarks.push({ id: `b${bookmarks.length + 1}`, url, title: (a.textContent ?? "").trim().slice(0, 500), folderId, ...(added > 0 && added < 4e9 ? { savedAt: added * 1000 } : {}) });
        }
      }
    }
  }

  const root = doc.querySelector("dl");
  if (root) walk(root, null);
  // Drop folders that ended up empty and have no children with bookmarks.
  const used = new Set(bookmarks.map((b) => b.folderId));
  return { folders: folders.filter((f) => used.has(f.id)), bookmarks };
}
