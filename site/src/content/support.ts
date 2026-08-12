import type { Faq } from "./types";

export const SUPPORT = {
  hero: {
    heading: "Who We Support",
    intro:
      "Truth Care Group supports adults living with the cognitive, emotional and physical effects of acquired and traumatic brain injury. Our focus is on independence, meaningful recovery and community reintegration, delivered through a personalised, collaborative rehabilitation approach.",
    ctas: [
      { label: "Arrange a Visit", href: "/contact-us" },
      { label: "Make a Referral", href: "/contact-us?type=referral" },
    ],
  },
  conditions: [
    "Cognitive and Executive Function Impairments",
    "Epilepsy",
    "Acquired Brain Injury",
    "Communication Difficulties",
    "Stroke",
    "Co morbid Mental Health and Emotional Needs",
    "Personal Care Needs",
  ],
  howWeHelp: {
    eyebrow: "HOW WE HELP",
    heading: "Person-centred neurorehabilitation, built around real life.",
    intro:
      "Every person’s needs are different. We work with each resident, their family (where appropriate), and the wider professional network to create a rehabilitation plan that builds confidence, ability and independence over time.",
    listIntro: "Our support may include:",
    list: [
      "Structured slow-stream rehabilitation aligned to personalised goals",
      "Support with daily living skills (including cooking, laundry and routines)",
      "Cognitive and executive function support (planning, memory, attention and problem-solving)",
      "Communication support alongside specialist input where required",
      "Emotional well-being support and strategies for coping and adjustment",
      "Personal care support delivered with dignity and respect",
      "Community-based rehabilitation to rebuild independence outside the home",
    ],
  },
  capacitySafety: {
    eyebrow: "CAPACITY / SAFETY",
    heading: "Capacity, safety and least restrictive practice",
    body: "Some residents may lack capacity to consent to certain decisions. Our team is experienced in using appropriate legal frameworks to support individuals, promote safety and reduce restrictive practices wherever possible. We aim to maintain independence while ensuring the right level of support is in place.",
  },
  assessment: {
    eyebrow: "ASSESSMENT",
    heading: "Free initial assessment",
    body: "We offer a free initial assessment to understand each person’s needs and confirm that our service is the right fit. We work closely with commissioners, care coordinators, case managers and families to deliver bespoke, community-based rehabilitation.",
    ctas: [
      { label: "Arrange a Visit", href: "/contact-us" },
      { label: "Make a Referral", href: "/contact-us?type=referral" },
    ],
  },
  referrals: {
    eyebrow: "REFERRALS",
    heading: "Referrals and enquiries",
    intro: "To discuss a referral or arrange a visit:",
    emails: ["kumi@truthcaregroup.co.uk", "info@truthcaregroup.co.uk"],
    // Updated 2026-07-27 — see the matching note in lib/site.ts.
    phone: "07483 483955",
    // Explicit tel: href, not derived from `phone` by stripping spaces —
    // that would produce the invalid national-format `tel:07483483955`.
    // Matches CONTACT.links.callUs and SITE.phone. See contact.ts for why.
    phoneHref: "tel:+447483483955",
  },
  faqsHeading: "Frequently asked questions",
  faqs: [
    {
      question: "What is slow-stream rehabilitation?",
      answer:
        "Slow-stream rehabilitation provides structured, person-centred support over a longer period of time, helping residents build skills, confidence and independence at a pace that is safe and sustainable.",
    },
    {
      question: "Who can make a referral?",
      answer:
        "We accept referrals from commissioners, care coordinators, case managers, professionals and families. If you are unsure, contact us and we will guide you through the next steps.",
    },
    {
      question: "Do you offer an initial assessment?",
      answer:
        "Yes. We offer a free initial assessment to understand needs, confirm suitability and discuss the right support plan.",
    },
    {
      question: "What happens after the assessment?",
      answer:
        "If we are the right fit, we agree goals and an initial rehabilitation plan, and coordinate next steps with the referrer and wider support network.",
    },
    {
      question: "Can families visit?",
      answer:
        "Yes. We welcome appropriate family involvement and will agree visiting arrangements that support each resident’s wellbeing and rehabilitation.",
    },
    {
      question: "How do you manage capacity and decision-making?",
      answer:
        "Where a person lacks capacity for specific decisions, we follow the appropriate legal frameworks and act in their best interests, aiming for the least restrictive approach wherever possible.",
    },
  ] as Faq[],
} as const;
