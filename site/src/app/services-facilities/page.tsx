import type { Metadata } from "next";
import { SERVICES } from "@/content/services";
import { SERVICES_GALLERY } from "@/content/gallery";
import { SITE } from "@/lib/site";
import { withBasePath } from "@/lib/basePath";
import { Reveal } from "@/components/Reveal";
import { Gallery } from "@/components/Gallery";
import { SectionHeading } from "@/components/SectionHeading";
import { PageHeader } from "@/components/PageHeader";
import { ButtonPrimary, ButtonSecondary } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "Services & Facilities",
  description:
    "Beaconsfield House, Weston-super-Mare: a six bed transitional and residential acquired brain injury service, within walking distance of the seafront, shops and leisure facilities.",
  alternates: { canonical: "/services-facilities" },
};

export default function ServicesFacilitiesPage() {
  return (
    <>
      {/* ------------------------------------------------------------- Header */}
      {/* 12-col editorial split: the page title holds the left column on its
          own at hero scale, the house and its description take the right. */}
      <PageHeader eyebrow={SITE.address.locality} title={SERVICES.heading}>
        <div className="md:col-span-6 md:col-start-7 md:pt-4">
          <h2 className="font-display text-[length:var(--text-h2)] font-semibold leading-[1.08] tracking-tight text-balance text-navy">
            {SERVICES.beaconsfield.heading}
          </h2>

          <p className="mt-6 text-[length:var(--text-lede)] leading-relaxed text-navy/90">
            {SERVICES.beaconsfield.intro}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <ButtonPrimary href={SERVICES.cta.href} label={SERVICES.cta.label} />
            <ButtonSecondary
              href={SERVICES.gallery.cta.href}
              label={SERVICES.gallery.cta.label}
            />
          </div>

          {/* Quieter than the two buttons above on purpose — this is a
              reference document for later, not the primary action. */}
          <a
            href={withBasePath(SITE.brochureUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy underline decoration-navy/30 underline-offset-4 hover:text-orange-text hover:decoration-orange-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
            </svg>
            Download our brochure (PDF)
          </a>
        </div>
      </PageHeader>

      {/* -------------------------------------------------------- At A Glance */}
      {/* Navy slab. Six items on hairline rules with orange index markers —
          a specification sheet, not another card grid. */}
      <section className="bg-navy text-paper">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5 py-[var(--space-section)]">
            <span aria-hidden="true" className="block h-1 w-12 rounded-full bg-orange" />

            <h3 className="mt-6 font-display text-[length:var(--text-h2)] font-semibold leading-[1.08] tracking-tight text-paper">
              {SERVICES.beaconsfield.atAGlance.heading}
            </h3>

            <ul className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {SERVICES.beaconsfield.atAGlance.items.map((item, index) => (
                <li key={item} className="border-t border-paper/20 pt-5">
                  <span
                    aria-hidden="true"
                    className="block font-display text-sm font-semibold tracking-[0.2em] text-orange"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="mt-3 block text-[length:var(--text-lede)] leading-snug text-paper/90">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------ Gallery */}
      {/* Rendered exactly once. The live Wix page repeats the same gallery three
          times; the full nine-photo set lives on /virtual-tour. */}
      <section className="py-[var(--space-section)]">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading title={SERVICES.gallery.heading} lede={SERVICES.gallery.hint} />
          <div className="mt-12">
            <Gallery images={SERVICES_GALLERY} label={SERVICES.gallery.label} />
          </div>
        </div>
      </section>
    </>
  );
}
