export const CONTACT = {
  heading: "Contact Us",
  address: "11 Beaconsfield Rd, Weston Super Mare. BS23 1YE.",
  email: "info@truthcaregroup.co.uk",
  phone: "07966 284872",
  links: {
    emailUs: { label: "email us", href: "mailto:info@truthcaregroup.co.uk" },
    // The live site ships `tel:07966 284872`. A literal space is invalid in a
    // tel: URI per RFC 3966 §3 and some mobile dialers silently truncate at
    // it, so the number is normalised here. Only the href is corrected — the
    // human-readable `phone` above still renders verbatim.
    callUs: { label: "call us", href: "tel:+447966284872" },
  },
  form: {
    heading: "Contact information",
    fields: [
      "First name",
      "Last name",
      "Email",
      "Address",
      "Phone",
      "Additional information",
    ],
    submitLabel: "Submit",
  },
} as const;
