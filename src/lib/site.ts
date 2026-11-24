export const siteConfig = {
  name: "Tidypin",
  shortName: "Tidypin",
  tagline: "Bookmarks that organize themselves.",
  description:
    "Tidypin is an AI bookmark manager for Chrome, Edge and Brave. Save any page in one click, and AI picks the folder, writes a summary and cleans up duplicates and dead links.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  locale: "en_US",
  twitter: "@tidypin",
  keywords: [
    "AI bookmark manager",
    "bookmark organizer",
    "Chrome bookmark extension",
    "AI summary",
    "duplicate bookmarks",
    "side panel bookmarks",
  ],
} as const;

/** Central place for outbound / auth links. Replace "#" when the targets exist. */
export const links = {
  install: "#", // browser extension store listing
  signin: "/signin",
  signup: "/signup",
  forgot: "/forgot-password",
  plans: "/plans",
  welcome: "/welcome",
  app: "/dashboard", // signed-in home
  fresh: "/dashboard?fresh=1", // "Start fresh": open the library empty on purpose
  checkout: "#", // PayPal checkout
  privacy: "#",
  terms: "#",
  contact: "#",
} as const;

export const absoluteUrl = (path = "/") => `${siteConfig.url}${path}`;
