import type { Metadata } from "next";
import { DAY_AT_BEACONSFIELD } from "@/content/dayAtBeaconsfield";
import { Pic } from "@/components/Pic";
import { Reveal } from "@/components/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { DayProgress } from "@/components/DayProgress";
import { ButtonPrimary } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "A Day at Beaconsfield House",
  description:
    "A sense of what a day at Beaconsfield House can hold — not a schedule, but the shape of morning, afternoon and evening for residents at our Weston-super-Mare brain injury rehabilitation home.",
  alternates: { canonical: "/a-day-at-beaconsfield" },
};

export default function DayAtBeaconsfieldPage() {
  return (
    <>
      <DayProgress />

      {/* ------------------------------------------------------------- Header */}
      {/* Every other interior page fills PageHeader's right-hand column with
          a photo or CTA — this one shipped without it, leaving a large blank
          gap next to the title. Garden patio, not one of the three images
          already used in the bands below, so nothing repeats on this page. */}
      <PageHeader
        eyebrow={DAY_AT_BEACONSFIELD.eyebrow}
        title={DAY_AT_BEACONSFIELD.heading}
        lede={DAY_AT_BEACONSFIELD.intro}
      >
        <div className="relative md:col-span-6 md:col-start-7 md:mt-12 lg:mt-16">
          <span
            aria-hidden="true"
            className="absolute -bottom-4 -right-4 h-24 w-24 rounded-br-[1.75rem] border-b-4 border-r-4 border-orange md:-bottom-6 md:-right-6 md:h-36 md:w-36"
          />
          <div className="relative overflow-hidden rounded-[1.75rem] shadow-navy-lg">
            <Pic
              imageKey="beaconsfield-house-garden-patio"
              alt="The enclosed rear patio at Beaconsfield House, with wooden benches, raised planting beds and a fenced boundary."
              sizes="(min-width: 768px) 50vw, calc(100vw - 2.5rem)"
              priority
              className="w-full object-cover"
            />
          </div>
        </div>
      </PageHeader>

      {/* --------------------------------------------------------------- Bands */}
      {/* Image left, text right, for all three bands — deliberately not
          alternating sides per band. An alternating layout is possible with
          CSS Grid (col-start + row-start on each child) but adds real risk
          of a subtle placement bug that's hard to catch without a live
          browser; a single consistent arrangement matches the pattern
          page.tsx's "Mission" and "Support teaser" sections already use
          and is simpler to verify correct by inspection. */}
      {DAY_AT_BEACONSFIELD.bands.map((band) => (
        <section key={band.id} id={band.id} className="scroll-mt-28 pb-[var(--space-section)]">
          <Reveal>
            <div className="mx-auto max-w-6xl px-5">
              <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-6">
                  <div className="overflow-hidden rounded-[1.75rem] shadow-navy-lg">
                    <Pic
                      imageKey={band.imageKey}
                      alt={band.alt}
                      sizes="(min-width: 1024px) 50vw, calc(100vw - 2.5rem)"
                      className="w-full object-cover"
                    />
                  </div>
                </div>

                <div className="lg:col-span-5 lg:col-start-8">
                  <span aria-hidden="true" className="block h-1 w-12 rounded-full bg-orange" />
                  {/* Real heading, not just eyebrow styling: gives the page an
                      h1 -> h2 -> h2 -> h2 -> h2(closing) outline for screen
                      readers, matching the heading-semantics convention
                      established in reviews/page.tsx's "What families say". */}
                  <h2 className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-text">
                    {band.label}
                  </h2>
                  <p className="mt-3 text-[length:var(--text-lede)] leading-relaxed text-navy/90">
                    {band.body}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      ))}

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
                {DAY_AT_BEACONSFIELD.closing.heading}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[length:var(--text-lede)] leading-relaxed text-muted">
                {DAY_AT_BEACONSFIELD.closing.body}
              </p>
              <div className="mt-9 flex justify-center">
                <ButtonPrimary
                  href={DAY_AT_BEACONSFIELD.closing.cta.href}
                  label={DAY_AT_BEACONSFIELD.closing.cta.label}
                />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
