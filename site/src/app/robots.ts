import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// `output: "export"` needs this emitted at build time rather than on request.
export const dynamic = "force-static";

/**
 * Nothing on this site is private, so everything is crawlable. The only job
 * here is pointing crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
