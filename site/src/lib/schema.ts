import { SITE } from "./site";
import type { Faq } from "@/content/types";

/**
 * Serialise a JSON-LD object for safe embedding inside a script tag via
 * dangerouslySetInnerHTML. Escaping the angle bracket prevents a closing
 * script-tag substring appearing anywhere in the data (e.g. a future FAQ
 * answer) from closing the script tag early and breaking the page. The
 * unicode escape used here is a valid JSON escape for that character, so
 * the output still parses identically as JSON.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

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
      // schema.org's PostalAddress has no meaningful `name` property — the
      // building name belongs in streetAddress, which is exactly how Royal
      // Mail formats a named building: "Beaconsfield House, 11 Beaconsfield
      // Rd". Emitting `name` here produced a property consumers ignore while
      // dropping the building name from the address they actually parse.
      streetAddress: `${SITE.address.name}, ${SITE.address.street}`,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      postalCode: SITE.address.postcode,
      addressCountry: SITE.address.country,
    },
    // geo + openingHours added when client confirms (spec open question 5)
  };
}
