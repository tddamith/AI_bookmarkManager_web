"use client";

import { useState } from "react";
import { siteIcon } from "@/components/portal/types";

/** The site's favicon, falling back to a coloured letter tile while it loads or when the site has none. */
export function SiteIcon({ domain, size = 20 }: { domain: string; size?: number }) {
  const [bad, setBad] = useState(false);
  const ic = siteIcon(domain);
  const box = { width: size, height: size, borderRadius: Math.round(size / 4) };
  if (bad || !domain) {
    return <span className="flex items-center justify-center font-bold" style={{ ...box, fontSize: Math.round(size * 0.55), background: ic.bg, color: ic.fg }}>{ic.letter}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBad(true)}
      onLoad={(e) => { if (e.currentTarget.naturalWidth <= 16) setBad(true); }}
      style={{ ...box, objectFit: "contain" }}
    />
  );
}
