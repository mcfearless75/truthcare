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
 * Stable identifier for the one business entity this site describes. Every
 * other node that needs to refer to it uses `{ "@id": ORG_ID }` rather than
 * restating the business inline, so consumers see one entity referenced from
 * several pages instead of several look-alike entities.
 */
const ORG_ID = `${SITE.url}/#organization`;

/**
 * Build-time serialisation of our own FAQ content into schema.org FAQPage
 * JSON-LD. Always derive this from `SUPPORT.faqs` at render time — never
 * hand-duplicate the question/answer text here, or the structured data and
 * the visible copy will drift apart.
 *
 * Note on expectations: Google restricted FAQ rich results in 2023 to
 * well-known authoritative government and health sites, so this markup is
 * unlikely to produce FAQ snippets in the SERP. It stays because it is
 * accurate, costs nothing, and still helps machines understand the page —
 * just don't let anyone report it as a rich-result win.
 */
export function faqPageJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    // Ties these questions to the business node emitted sitewide in layout.tsx.
    about: { "@id": ORG_ID },
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
    // MedicalBusiness is deliberate and was re-checked 2026-08-13. It is the
    // correct broad type for a CQC-registered care provider. Note there is no
    // schema.org "ResidentialCare" type despite it being an obvious guess —
    // schema.org/ResidentialCare 404s. Don't "fix" this to a type that
    // doesn't exist.
    "@type": "MedicalBusiness",
    "@id": ORG_ID,
    name: SITE.name,
    // The registered legal name, distinct from the trading name above.
    // Verified against the CQC Certificate of Registration and Companies
    // House, not assumed — see the notes in content/legal.ts.
    legalName: "Truth Care Group Ltd",
    url: SITE.url,
    // Kept to the single primary number on purpose. The landline
    // (SITE.landline) is deliberately NOT added here: local search rewards
    // one consistent name/address/phone across the site, the Google Business
    // Profile and third-party directories, and the profile's PRIMARY number
    // is this one. Adding a second number here creates NAP noise for no gain.
    telephone: SITE.phone,
    email: SITE.email,
    image: `${SITE.url}/images/beaconsfield-house-exterior-front/1200.jpg`,
    logo: `${SITE.url}/images/brand-logo/768.jpg`,
    /**
     * Authoritative third-party records for *this exact entity*, which is
     * what sameAs is actually for — not social profiles. Both were verified
     * against the live registers on 2026-08-13. Together they let a search
     * engine reconcile this site with the regulator's record and the
     * statutory company record, which is the strongest corroboration a
     * regulated care provider can offer.
     */
    sameAs: [
      SITE.cqcUrl,
      "https://find-and-update.company-information.service.gov.uk/company/15651211",
    ],
    identifier: {
      "@type": "PropertyValue",
      name: "Companies House company number",
      value: "15651211",
    },
    /**
     * Mirrors the catchment stated in the site's own copy (home.ts mission)
     * and corroborated by real Search Console impressions for Bristol and
     * Minehead searches. Note the Google Business Profile's service area
     * currently omits Bristol — worth aligning the two.
     */
    areaServed: [
      { "@type": "AdministrativeArea", name: "North Somerset" },
      { "@type": "AdministrativeArea", name: "Somerset" },
      { "@type": "AdministrativeArea", name: "Bristol" },
      { "@type": "AdministrativeArea", name: "South West England" },
    ],
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
    /**
     * Still deliberately omitted:
     *
     * - `geo`. The Google Business Profile's map pin is correctly placed and
     *   is what Google actually trusts for location; a postcode-centroid
     *   lat/long here would add nothing and could contradict it.
     * - `openingHours`. The client's own Business Profile publishes 24/7,
     *   which is true of staffing but would be read by a family member as
     *   *visiting* hours. Confirm which is meant before adding it — stating
     *   24/7 visiting on a care home's structured data is worse than
     *   omitting it.
     * - `priceRange`. Fees are not published and shouldn't be guessed.
     */
  };
}
