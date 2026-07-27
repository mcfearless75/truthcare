export const SITE = {
  name: "Truth Care Group",
  url: "https://truthcaregroup.co.uk",
  // Verified against tel:+44 7966 284872 link on the live homepage hero
  // and "call us" link on /contact-us (2026-07-26).
  phone: "+44 7966 284872",
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
  formspree: "https://formspree.io/f/xzdnklod",
  // Sourced from the live Wix site's downloadable brochure (2026-07-27).
  // Raw path — callers apply withBasePath() at render time, same convention
  // as image paths in lib/images.ts.
  brochureUrl: "/downloads/truth-care-group-brochure.pdf",
} as const;
