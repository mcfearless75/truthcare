export const CONTACT = {
  heading: "Contact Us",
  // Weston-super-Mare, not "Weston Super Mare" — matches the CQC register
  // and SITE.address.locality. Keep this spelling everywhere; it's a
  // NAP-consistency signal for local SEO.
  address: "11 Beaconsfield Rd, Weston-super-Mare. BS23 1YE.",
  email: "info@truthcaregroup.co.uk",
  // Updated 2026-07-27 — see the matching note in lib/site.ts.
  phone: "07483 483955",
  // Added 2026-08-13 — see the matching note in lib/site.ts.
  landline: "01934 753233",
  links: {
    emailUs: { href: "mailto:info@truthcaregroup.co.uk" },
    // A literal space is invalid in a tel: URI per RFC 3966 §3 and some
    // mobile dialers silently truncate at it, so the number is normalised
    // here. Only the href is corrected — the human-readable `phone` above
    // still renders verbatim.
    callUs: { href: "tel:+447483483955" },
    callLandline: { href: "tel:+441934753233" },
  },
  form: {
    heading: "Contact information",
    // The live Wix site's field set (first name, last name, email,
    // address, phone, additional information) is deliberately NOT
    // reproduced here. `ContactForm.tsx` defines its own, data-minimised
    // field set (name, email, phone, enquiry type, message) and
    // intentionally omits the postal address the old site collected —
    // there is no need for it to answer an enquiry. Do not re-add a
    // `fields` array here to "match" the old site.
  },
  regulation: {
    heading: "Regulated by the Care Quality Commission",
    intro: "Beaconsfield House is registered with the CQC.",
    linkLabel: "View our entry on the public register",
  },
} as const;
