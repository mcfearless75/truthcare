import type { ServiceValue } from "./types";

export const HOME = {
  hero: {
    title: "Specialist Residential Brain Injury Rehabilitation",
    lede: "Personalised, community-based rehabilitation for adults living with acquired or traumatic brain injury, based in Weston-super-Mare, North Somerset.",
    ctas: [
      { label: "Arrange a Visit", href: "/contact-us" },
      { label: "Make a Referral", href: "/contact-us?type=referral" },
    ],
  },
  strips: [
    "EXPERIENCED SPECIALIST MDT",
    "GOAL FOCUSED COMMUNITY REHABILITATION",
    "OPTIMISING INDEPENDENCE",
  ],
  mission: {
    heading: "Our Mission",
    paragraphs: [
      "Truth Care Group develops specialist residential services for individuals living with the cognitive, emotional, and physical effects of acquired brain injuries.",
      "Our mission is to deliver person-centred rehabilitation and promote community reintegration.",
      // Added 2026-08-13: real Search Console query data shows the site
      // already surfacing for "Minehead" and "Bristol" ABI searches with
      // zero clicks — genuine demand from beyond Weston-super-Mare itself
      // that this line makes explicit rather than leaving implicit.
      "Based at Beaconsfield House in Weston-super-Mare, North Somerset, we welcome referrals and enquiries from across Somerset, Bristol and the wider South West.",
      "Our values - Integrity, Respect, Kindness, and Optimism - guide every aspect of our work.",
    ],
  },
  valuesHeading: "Our Services Are",
  values: [
    {
      title: "WELL LED",
      body: "Experienced registered manager aligned to our Values – Integrity, Respect, Kindness and Optimism",
      icon: "icon-well-led",
    },
    {
      title: "RESPONSIVE",
      body: "Innovative technology promoting co-production and family/carer feedback",
      icon: "icon-responsive",
    },
    {
      title: "SAFE",
      body: "Robust governance, high-quality care",
      icon: "icon-safe",
    },
    {
      title: "EFFECTIVE",
      body: "Delivering evidence-based intervention with measurable outcomes.",
      icon: "icon-effective",
    },
    {
      title: "CARING",
      body: "Motivated staff team 24/7",
      icon: "icon-caring",
    },
  ] as ServiceValue[],
  beaconsfield: {
    heading: "Step inside Beaconsfield House",
    bullets: [
      "Six, spacious en-suite bedrooms",
      "Dedicated therapy spaces",
      "Communal living areas",
      "Secure outdoor garden and dining areas",
    ],
    cta: { label: "View Virtual Tour", href: "/virtual-tour" },
  },
  whoWeSupportTeaser: {
    heading: "Who We Support",
    // Only one paragraph is rendered on the homepage teaser (page.tsx uses
    // it directly beneath the highlights chips); the full three-paragraph
    // version lives on /who-we-support (support.ts).
    paragraph:
      "We offer a free initial assessment to ensure we can meet each individual’s needs and work closely with commissioners, care coordinators, case managers, and families to deliver bespoke, community-based rehabilitation.",
    supportIntro: "Our highly skilled staff team support the community-based rehabilitation of people living with:",
    highlights: ["Acquired Brain Injury", "Stroke", "Personal Care Needs"],
    cta: { label: "See Who We Support", href: "/who-we-support" },
  },
} as const;
