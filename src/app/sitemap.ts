import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

// Add every public route here (or fetch dynamic URLs from your DB/CMS).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl("/"),
      lastModified: new Date("2026-11-19"),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
