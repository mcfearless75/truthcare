import { SITE } from "./site";
import type { Faq } from "@/content/types";

/**
 * Build-time serialisation of our own FAQ content into schema.org FAQPage
 * JSON-LD. Always derive this from `SUPPORT.faqs` at render time — never
 * hand-duplicate the question/answer text here, or the structured data and
 * the visible copy will drift apart.
 */
export function faqPageJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

/**
 * MedicalBusiness JSON-LD for the registered location (Weston-super-Mare —
 * see SITE.address). Consumed by Task 9's root/global structured data.
 */
export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: SITE.name,
    url: SITE.url,
    telephone: SITE.phone,
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      name: SITE.address.name,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      addressCountry: SITE.address.country,
    },
    // geo + openingHours added when client confirms (spec open question 5)
  };
}
