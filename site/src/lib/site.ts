export const SITE = {
  name: "Truth Care Group",
  url: "https://truthcaregroup.co.uk",
  // Updated 2026-07-27: live Wix's sitewide "Call Us" link (header, footer,
  // /contact-us) now resolves to +44 7483 483955, not the +44 7966 284872
  // this was verified against on 2026-07-26. The old number survives only
  // on the homepage's "Arrange a Visit" button, which looks like an
  // unfinished update on Wix's side rather than a deliberate second line —
  // worth the client double-checking which number should actually be live.
  phone: "+44 7483 483955",
  // Added 2026-08-13, provided directly by the client — resolves the
  // "Landline? confirm mobile-only or add one" item from the original
  // handover doc. Beaconsfield House Manager/Office's work line.
  landline: "+44 1934 753233",
  email: "info@truthcaregroup.co.uk",
  address: {
    name: "Beaconsfield House",
    // Verified against the live /contact-us page and CQC's public register
    // (cqc.org.uk/location/1-26270675575): Beaconsfield House, run by Truth
    // Care Group Ltd, sits in Weston-super-Mare — not Bristol as the site's
    // own SEO titles suggest. Bristol is retained in marketing copy/titles
    // per the live site; this address is the real, structured postal record.
    street: "11 Beaconsfield Rd",
    locality: "Weston-super-Mare",
    region: "England",
    postcode: "BS23 1YE",
    country: "GB",
  },
  cqcUrl: "https://www.cqc.org.uk/location/1-26270675575",
  // Truth Care Group's Google Business Profile "write a review" deep link,
  // supplied directly by the client 2026-08-14. Short g.page links like this
  // don't expire the way a raw place-review URL built from a place_id can,
  // so it's used verbatim rather than reconstructed.
  googleReviewUrl: "https://g.page/r/CTLQPUoUP0uMEBM/review",
  formspree: "https://formspree.io/f/xzdnklod",
  // Sourced from the live Wix site's downloadable brochure (2026-07-27).
  // Raw path — callers apply withBasePath() at render time, same convention
  // as image paths in lib/images.ts.
  brochureUrl: "/downloads/truth-care-group-brochure.pdf",
} as const;
