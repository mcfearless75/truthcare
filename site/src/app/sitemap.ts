import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// `output: "export"` needs this emitted at build time rather than on request.
export const dynamic = "force-static";

/**
 * Every indexable route on the site, in navigation order. Add new pages here
 * — nothing else discovers them, because a static export has no crawlable
 * route manifest at runtime.
 */
const ROUTES = [
  "",
  "/services-facilities",
  "/virtual-tour",
  "/who-we-support",
  "/our-team",
  "/reviews",
  "/contact-us",
  "/privacy-policy",
  "/cookie-policy",
  "/accessibility",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  // Build time is the honest answer for a fully static site: the deployed
  // HTML for every route is produced in this one pass, so that *is* when the
  // page last changed as far as a crawler is concerned.
  const lastModified = new Date();

  return ROUTES.map((path) => ({
    url: `${SITE.url}${path}`,
    lastModified,
  }));
}
