import type { Testimonial } from "./types";

export const REVIEWS = {
  eyebrow: "Reviews",
  heading: "Tell us how we're doing",
  intro:
    "If a family member, professional or visitor has had a good experience with Truth Care Group, a Google review helps other families find Beaconsfield House when they need us most — and helps us know what we're getting right.",
  qr: {
    caption: "Scan to leave a review",
  },
  testimonialsHeading: "What families say",
  // Submitted directly by the client 2026-08-14, published anonymously at
  // their request. Real, unedited text — do not shorten, embellish or
  // invent further entries; only add to this array from a genuine
  // submission the client has supplied.
  testimonials: [
    {
      quote:
        "We have been incredibly impressed with the care and support provided by Truth Care Group. My mum has a complex brain injury and requires specialist care, and the team have been exceptional in understanding her individual needs.\n\nThey take the time to tailor each day around her abilities, interests and wellbeing, ensuring she remains active, engaged and involved in meaningful activities rather than simply following a routine. It's clear that they see her as an individual and genuinely care about helping her maintain the best possible quality of life.\n\nThe staff are kind, compassionate, patient and professional, and it's reassuring to know she is in such capable hands. Their expertise in supporting people with brain injuries has given our family real confidence that Mum is receiving the specialist care and rehabilitation she needs.\n\nWe are very grateful for everything the team at Truth Care Group does and would highly recommend them to anyone looking for high-quality, person-centred care and rehabilitation.",
      // Short pull-quote used on the homepage strip — the opening line of
      // the same testimonial, not a rewrite.
      excerpt:
        "We have been incredibly impressed with the care and support provided by Truth Care Group.",
      attribution: "Family member",
      permissionNote: "Shared with permission, in their own words",
    },
    // Truth Care Group's one live Google review as of 2026-08-14 — read
    // directly off the Google Business Profile (public, unedited). Reviewer
    // surname trimmed to an initial for the same reason the family quote
    // above is anonymised; the rating and "a week ago" timing are Google's,
    // not ours. Re-check this against the profile before editing — it will
    // read stale once more reviews come in.
    {
      quote:
        "A family member in under the care of Truth Care. She has complex needs and is currently being assessed here. The staff are kind, considerate and importantly experienced with brain injured patients. My relative is very happy there and making progress. It is a relief to the family that she is in such a brilliant and appropriate place.",
      excerpt:
        "The staff are kind, considerate and importantly experienced with brain injured patients.",
      attribution: "Trish T.",
      source: "Google review",
      rating: 5,
    },
  ] as Testimonial[],
  // href isn't stored here — it's SITE.googleReviewUrl, read directly at the
  // call site so there is exactly one copy of the URL in the codebase.
  ctaLabel: "Leave a Google Review",
  steps: [
    {
      heading: "Scan or tap",
      body: "Point your phone's camera at the code, or tap the button on this page if you're already on your phone.",
    },
    {
      heading: "Sign in with Google",
      body: "You'll be taken straight to our Google Business Profile's review form.",
    },
    {
      heading: "Rate and write a few words",
      body: "A star rating alone helps; a sentence or two about your experience helps even more.",
    },
  ],
  closing: {
    heading: "Prefer to tell us directly?",
    body: "You're always welcome to share feedback in person, by phone or through our contact page — a review is only one way to let us know.",
    cta: { label: "Contact Us", href: "/contact-us" },
  },
} as const;
