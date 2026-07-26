/**
 * Prefixes a root-relative path with the configured base path.
 *
 * Next.js's own router (`next/link`, `next/navigation`) and `next/font`
 * already account for `basePath` automatically. This helper exists only for
 * the handful of places that build asset URLs as plain strings (see Pic.tsx,
 * SiteHeader.tsx, layout.tsx) and therefore need to prefix them by hand.
 *
 * `NEXT_PUBLIC_BASE_PATH` must stay in sync with `basePath`/`assetPrefix` in
 * next.config.ts — both read the exact same env var so a single value drives
 * everything. It must be `NEXT_PUBLIC_`-prefixed to be inlined at build time
 * in a static export (there is no server to read `process.env` at request
 * time).
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function withBasePath(path: string): string {
  if (!BASE_PATH) return path;
  return `${BASE_PATH}${path}`;
}
