export const CONTACT = {
  heading: "Contact Us",
  address: "11 Beaconsfield Rd, Weston Super Mare. BS23 1YE.",
  email: "info@truthcaregroup.co.uk",
  phone: "07966 284872",
  links: {
    emailUs: { label: "email us", href: "mailto:info@truthcaregroup.co.uk" },
    callUs: { label: "call us", href: "tel:07966 284872" },
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
