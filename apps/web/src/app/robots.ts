import type { MetadataRoute } from "next";

import { isProd, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  // Non-production deploys (preview/staging) must not be crawled or indexed.
  if (!isProd) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
