import type { Metadata } from "next";
import { SERVICES } from "@/content/services";
import { SERVICES_GALLERY } from "@/content/gallery";
import { SITE } from "@/lib/site";
import { Reveal } from "@/components/Reveal";
import { Gallery } from "@/components/Gallery";
import { SectionHeading } from "@/components/SectionHeading";
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
      <section className="pb-[var(--space-section)] pt-28 md:pt-36">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-12 md:grid-cols-12 md:gap-10 lg:gap-16">
            <div className="md:col-span-5">
              <span aria-hidden="true" className="block h-1 w-12 rounded-full bg-orange" />

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-text">
                {SITE.address.locality}
              </p>

              <h1 className="mt-3 font-display text-[length:var(--text-hero)] font-semibold leading-[1.03] tracking-[-0.02em] text-balance text-navy">
                {SERVICES.heading}
              </h1>
            </div>

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
            </div>
          </div>
        </div>
      </section>

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
