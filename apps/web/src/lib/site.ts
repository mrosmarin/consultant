// Central site metadata. Single source for the Metadata API, JSON-LD, sitemap,
// and robots. Canonical origin is env-configurable so it can flip to the custom
// domain (endlessworlds.xyz) at launch without code changes.
export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://endlessworlds-web.vercel.app"
).replace(/\/$/, "");

// Only the production deployment is indexable; preview/staging/local get
// noindex (Vercel sets VERCEL_ENV = production | preview | development).
export const isProd = process.env.VERCEL_ENV === "production";

export const site = {
  name: "EndlessWorlds",
  legalName: "EndlessWorlds, LLC",
  url: siteUrl,
  description:
    "Engineering leadership and AI-native architecture for teams that need to ship. 30 years turning legacy constraints and AI ambition into production systems.",
  founder: "Mitchell Rosmarin",
  email: "hello@endlessworlds.xyz",
  sameAs: [] as string[],
} as const;
