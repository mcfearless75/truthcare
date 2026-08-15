export interface Faq {
  question: string;
  answer: string; // may contain \n\n for paragraphs
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string; // key into image manifest, e.g. "team-caz-icke"
}

export interface ServiceValue {
  title: string; // e.g. "WELL LED"
  body: string;
  icon: string; // image key, e.g. "icon-well-led"
}

export interface GalleryImage {
  key: string; // image key
  alt: string; // rewritten, human alt text
  caption?: string;
}

/**
 * One h2-level block of a long-form prose page (privacy notice, cookie
 * policy). Every part is optional except the heading so a section can be
 * prose only, a list only, or both — the page component renders whichever
 * parts are present, in this order: paragraphs, listIntro, list, outro.
 */
export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  listIntro?: string;
  list?: string[];
  outro?: string[];
}

export interface Testimonial {
  quote: string; // may contain \n\n for paragraphs
  excerpt: string; // short pull-quote for compact placements (homepage strip)
  attribution: string;
  /** Where the quote came from, e.g. "Google review". Omit for direct submissions. */
  source?: string;
  /** Star rating out of 5, only meaningful alongside `source`. */
  rating?: number;
  /**
   * Explicit note shown in place of `source` when there isn't one, e.g.
   * "Shared with permission, in their own words". Only rendered when
   * `source` is absent. Must be authored per-testimonial — never inferred.
   */
  permissionNote?: string;
}

export interface LegalPage {
  eyebrow: string;
  heading: string;
  intro: string;
  /** Human-readable date, e.g. "26 July 2026". Rendered in a <time>. */
  updated: string;
  /** ISO date for the <time datetime> attribute. */
  updatedIso: string;
  sections: LegalSection[];
}
