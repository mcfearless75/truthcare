import type { Metadata } from "next";
import { GALLERY, GALLERY_BY_KEY, TOUR } from "@/content/gallery";
import { SITE } from "@/lib/site";
import { Pic } from "@/components/Pic";
import { Reveal } from "@/components/Reveal";
import { Gallery } from "@/components/Gallery";
import { SectionHeading } from "@/components/SectionHeading";
import { PageHeader } from "@/components/PageHeader";
import { TourEmbed } from "@/components/TourEmbed";
import { ButtonPrimary } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "Take a Look Inside",
  description:
    // Shortened 2026-08-13 from 206 characters, which Google was certain to
    // truncate before reaching the garden.
    "Take a 360° virtual tour of Beaconsfield House, Weston-super-Mare: the communal lounge and dining room, en-suite bedrooms, sensory room and secure garden.",
  alternates: { canonical: "/virtual-tour" },
};

const headerImage = GALLERY_BY_KEY[TOUR.headerImage];

export default function VirtualTourPage() {
  return (
    <>
      {/* ------------------------------------------------------------- Header */}
      {/* Text left, one photograph dropped down on the right — the same
          asymmetry the homepage mission block uses, so the two read as one
          system. Deliberately not a second full-bleed photo hero: the homepage
          owns that move, and the tour frame below is what should carry the
          weight on this page. The header shot is the exterior on purpose, so
          the sequence down the page is arrive, go in, look round. */}
      <PageHeader
        eyebrow={TOUR.eyebrow}
        title={TOUR.heading}
        lede={TOUR.lede}
        leftExtra={
          <p className="mt-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-navy/70">
            <span aria-hidden="true" className="h-px w-8 bg-navy/25" />
            {SITE.address.street} &middot; {SITE.address.locality}
          </p>
        }
      >
        <div className="relative md:col-span-6 md:col-start-7 md:mt-12 lg:mt-16">
          <span
            aria-hidden="true"
            className="absolute -bottom-4 -right-4 h-24 w-24 rounded-br-[1.75rem] border-b-4 border-r-4 border-orange md:-bottom-6 md:-right-6 md:h-36 md:w-36"
          />
          <div className="relative overflow-hidden rounded-[1.75rem] shadow-navy-lg">
            <Pic
              imageKey={headerImage.key}
              alt={headerImage.alt}
              sizes="(min-width: 768px) 50vw, calc(100vw - 2.5rem)"
              priority
              className="w-full object-cover"
            />
          </div>
        </div>
      </PageHeader>

      {/* --------------------------------------------------------------- Tour */}
      {/* The main event, and the first thing under the header. Full content
          width so it outweighs the header photograph beside it — the header
          shot is the arrival, this is going in. No <Reveal>: it sits high
          enough to be in view on load, and a section that starts at opacity 0
          is the wrong thing to put a primary control inside. */}
      <section className="pb-[var(--space-section)]">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading title={TOUR.tour.heading} lede={TOUR.tour.lede} />
          <div className="mt-10 lg:mt-12">
            <TourEmbed
              src={TOUR.tour.src}
              iframeTitle={TOUR.tour.iframeTitle}
              posterImageKey={TOUR.tour.posterImage}
              badge={TOUR.tour.badge}
              activateLabel={TOUR.tour.activateLabel}
              notice={TOUR.tour.notice}
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- Features strip */}
      {/* The live tour page's own heading and four bullets, verbatim. Laid out
          as a 2x2 field against the heading rather than the homepage's vertical
          list, so the same four facts don't render the same way twice. */}
      <section className="bg-navy text-paper">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5 py-[var(--space-section)]">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-4">
                <SectionHeading title={TOUR.featuresHeading} onDark />
              </div>

              <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-7 lg:col-start-6">
                {TOUR.features.map((feature) => (
                  <li key={feature} className="border-t border-paper/20 pt-5">
                    <span
                      aria-hidden="true"
                      className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-orange text-navy"
                    >
                      <svg
                        width="17"
                        height="17"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 12.5 9.5 18 20 6.5" />
                      </svg>
                    </span>
                    <span className="block text-[length:var(--text-lede)] leading-snug text-paper/90">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------ Gallery */}
      {/* Supporting detail now, not the point of the page: the tour shows how
          the rooms connect, these show what each one is actually like. Kept in
          full — nine real photographs of the house, no stock. */}
      <section className="py-[var(--space-section)]">
        <div className="mx-auto max-w-6xl px-5">
          <SectionHeading title={TOUR.gallery.heading} lede={TOUR.gallery.hint} />
          <div className="mt-12">
            <Gallery images={GALLERY} label={TOUR.gallery.label} />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Closing */}
      <section className="pb-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-orange/[0.08] px-6 py-14 text-center ring-1 ring-orange/25 sm:px-12 sm:py-16">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 mx-auto h-1 w-24 rounded-b-full bg-orange"
              />
              <h2 className="mx-auto max-w-[20ch] font-display text-[length:var(--text-h2)] font-semibold leading-[1.08] tracking-tight text-balance text-navy">
                {TOUR.closing.heading}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[length:var(--text-lede)] leading-relaxed text-muted">
                {TOUR.closing.body}
              </p>
              <div className="mt-9 flex justify-center">
                <ButtonPrimary href={TOUR.closing.cta.href} label={TOUR.closing.cta.label} />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
