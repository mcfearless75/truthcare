/**
 * Stable in-page anchor derived from a heading or name. Shared between
 * TeamCard (sets the `id`) and the our-team role chips (link to it) so the
 * two can never drift out of sync — same convention as LegalProse.tsx's
 * local copy of this, extracted here because it's used across two files
 * instead of within one.
 */
export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
