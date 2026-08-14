import type { Metadata } from "next";
import { HOME } from "@/content/home";
import { REVIEWS } from "@/content/reviews";
import { SITE } from "@/lib/site";
import { Pic } from "@/components/Pic";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { ValueCard } from "@/components/ValueCard";
import { ButtonPrimary, ButtonSecondary, ButtonSecondaryOnDark } from "@/components/Buttons";

export const metadata: Metadata = {
  title: {
    absolute:
      "Truth Care Group | Brain Injury Residential Rehabilitation Weston-super-Mare",
  },
  // Trimmed to target length and added "North Somerset" 2026-08-13 — real
  // GSC query data shows impressions (no clicks yet) for "Minehead" and
  // "Bristol" ABI searches, confirming demand from beyond Weston-super-Mare
  // itself; North Somerset is the actual local authority area WSM sits in.
  description:
    "Specialist residential brain injury rehabilitation in Weston-super-Mare, North Somerset, for adults with acquired or traumatic brain injury.",
  alternates: { canonical: "/" },
};

/**
 * On navy and photographic backgrounds the global orange-text focus ring drops
 * below 3:1 against the surface, so dark CTA groups switch it to paper white.
 * `!` is needed because the global :focus-visible rule sits outside Tailwind's
 * cascade layers and would otherwise win.
 */
const DARK_FOCUS = "[&_a:focus-visible]:outline-paper!";

export default function HomePage() {
  const [primaryCta, secondaryCta] = HOME.hero.ctas;
  const featuredReview = REVIEWS.testimonials[0];

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative isolate flex min-h-[34rem] items-end overflow-hidden md:min-h-[42rem] lg:min-h-[46rem]">
        <div className="absolute inset-0 -z-10">
          <Pic
            imageKey="beaconsfield-house-exterior-front"
            alt="Beaconsfield House, a Victorian stone building with tall bay windows and its own parking, seen from the road."
            sizes="100vw"
            priority
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          {/* object-top, not object-center: the source photo is 4:3 and this
              section is much wider than that on desktop, so object-cover was
              cropping roughly equal amounts off the top and bottom — losing
              the gables and roofline off the top for no reason, since the
              text sits at the bottom and never competes with that area.
              Anchoring to the top keeps the full roofline in frame and lets
              the crop come entirely from the (uninteresting) ground-level
              strip at the bottom instead.
              Scrim is now gradient-only, no flat wash — the wash was dulling
              the whole photo, including the now-more-visible top, just to
              keep it readable against bright sky; the gradient alone still
              clears contrast where the headline actually sits. */}
          <div className="absolute inset-0 bg-gradient-to-t from-navy/95 via-navy/70 via-55% to-transparent" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-36 md:pb-24 md:pt-48">
          <Reveal>
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-paper">
              <span aria-hidden="true" className="h-px w-10 bg-orange" />
              {SITE.address.name} &middot; {SITE.address.locality}
            </p>

            <h1 className="mt-6 max-w-[18ch] font-display text-[length:var(--text-hero)] font-semibold leading-[1.03] tracking-[-0.02em] text-balance text-paper">
              {HOME.hero.title}
            </h1>

            <p className="mt-6 max-w-xl text-[length:var(--text-lede)] leading-relaxed text-paper/90">
              {HOME.hero.lede}
            </p>

            <div className={`mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4 ${DARK_FOCUS}`}>
              <ButtonPrimary href={primaryCta.href} label={primaryCta.label} />
              <ButtonSecondaryOnDark href={secondaryCta.href} label={secondaryCta.label} />
            </div>
          </Reveal>
        </div>
      </section>

      {/* -------------------------------------------------------- Proof strip */}
      {/* Floats up over the hero's bottom edge for depth rather than sitting in
          its own padded band. */}
      <div className="relative z-10 mx-auto -mt-8 w-full max-w-6xl px-5 md:-mt-12">
        <ul className="flex flex-col divide-y divide-navy/10 rounded-2xl bg-paper shadow-navy-md ring-1 ring-navy/5 sm:flex-row sm:divide-x sm:divide-y-0">
          {HOME.strips.map((strip) => (
            <li key={strip} className="flex flex-1 items-center gap-3 px-6 py-5">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-orange" />
              <span className="text-[0.8rem] font-semibold uppercase leading-snug tracking-[0.14em] text-navy sm:text-xs">
                {strip}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* ------------------------------------------------------------ Mission */}
      <section className="py-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-12 md:grid-cols-12 md:gap-10 lg:gap-16">
              <div className="md:col-span-5">
                <SectionHeading title={HOME.mission.heading} />
                <div className="mt-7 space-y-5">
                  <p className="text-[length:var(--text-lede)] leading-relaxed text-navy/90">
                    {HOME.mission.paragraphs[0]}
                  </p>
                  {HOME.mission.paragraphs.slice(1).map((paragraph) => (
                    <p key={paragraph} className="leading-relaxed text-muted">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Dropped down against the text column for editorial asymmetry. */}
              <div className="relative md:col-span-6 md:col-start-7 md:mt-14 lg:mt-20">
                <span
                  aria-hidden="true"
                  className="absolute -left-3 -top-3 h-20 w-20 rounded-tl-[1.75rem] border-l-4 border-t-4 border-orange md:-left-6 md:-top-6 md:h-32 md:w-32"
                />
                <div className="relative overflow-hidden rounded-[1.75rem] shadow-navy-lg">
                  <Pic
                    imageKey="beaconsfield-house-interior-lounge-wide"
                    alt="The main lounge at Beaconsfield House, with a large corner sofa, an upright piano and a dining table set in the bay window."
                    sizes="(min-width: 768px) 50vw, calc(100vw - 2.5rem)"
                    className="w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------- Values */}
      <section className="pb-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            {/* HOME.valuesHeading is the live site's own lead-in heading; the
                five cards complete the sentence. */}
            <SectionHeading title={HOME.valuesHeading} align="center" />

            <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6 lg:gap-6">
              {HOME.values.map((value, index) => (
                <li
                  key={value.title}
                  className={
                    index < 3
                      ? "lg:col-span-2"
                      : index === 4
                        ? "sm:col-span-2 lg:col-span-3"
                        : "lg:col-span-3"
                  }
                >
                  <ValueCard value={value} />
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- CQC */}
      {/* Sits directly after the values block on purpose: those five cards are
          CQC's own key questions (well-led / responsive / safe / effective /
          caring), so the regulator's actual registration status is the natural
          next thing a reader wants after being told the service is measured
          against that framework. See the comment on HOME.cqc — the honest
          "no rating yet" wording is deliberate, not a placeholder. */}
      <section className="pb-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <div className="rounded-[1.75rem] bg-navy/[0.04] p-8 ring-1 ring-navy/10 md:p-12">
              <div className="grid gap-10 md:grid-cols-12 md:gap-12">
                <div className="md:col-span-6">
                  <SectionHeading
                    eyebrow={HOME.cqc.eyebrow}
                    title={HOME.cqc.heading}
                    lede={HOME.cqc.lede}
                  />

                  <dl className="mt-9">
                    {HOME.cqc.facts.map((fact) => (
                      <div
                        key={fact.label}
                        className="flex flex-col gap-1 border-t border-navy/10 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                      >
                        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                          {fact.label}
                        </dt>
                        <dd className="font-semibold text-navy">{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className="md:col-span-5 md:col-start-8">
                  <div className="rounded-2xl bg-paper p-7 shadow-navy-md ring-1 ring-navy/5">
                    <h3 className="font-display text-[length:var(--text-h3)] font-semibold leading-tight text-navy">
                      {HOME.cqc.rating.heading}
                    </h3>

                    <p className="mt-5 leading-relaxed text-muted">
                      {HOME.cqc.rating.body}
                    </p>

                    <p className="mt-4 border-t border-navy/10 pt-4 text-sm leading-relaxed text-muted">
                      {HOME.cqc.rating.note}
                    </p>

                    <a
                      href={SITE.cqcUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-6 inline-flex items-center gap-2 font-semibold text-navy underline decoration-orange decoration-2 underline-offset-4 hover:text-orange-text"
                    >
                      {HOME.cqc.rating.linkLabel}
                      <span className="sr-only"> (opens in a new tab)</span>
                      <svg
                        aria-hidden="true"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 17 17 7M9 7h8v8" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------- Beaconsfield teaser */}
      <section className="bg-navy text-paper">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5 py-[var(--space-section)]">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              <div>
                <SectionHeading title={HOME.beaconsfield.heading} onDark />

                <ul className="mt-8 space-y-4">
                  {HOME.beaconsfield.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-4">
                      <span
                        aria-hidden="true"
                        className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange text-navy"
                      >
                        <svg
                          width="15"
                          height="15"
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
                      <span className="text-[length:var(--text-lede)] leading-snug text-paper/90">
                        {bullet}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className={`mt-10 ${DARK_FOCUS}`}>
                  <ButtonPrimary
                    href={HOME.beaconsfield.cta.href}
                    label={HOME.beaconsfield.cta.label}
                  />
                </div>
              </div>

              <div className="relative">
                <span
                  aria-hidden="true"
                  className="absolute inset-0 translate-x-4 translate-y-4 rounded-[1.75rem] border border-orange/60"
                />
                <div className="relative overflow-hidden rounded-[1.75rem]">
                  <Pic
                    imageKey="beaconsfield-house-garden-patio"
                    alt="The enclosed rear patio at Beaconsfield House, with wooden benches, raised planting beds and a fenced boundary."
                    sizes="(min-width: 1024px) 50vw, calc(100vw - 2.5rem)"
                    className="w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ----------------------------------------------------- Support teaser */}
      <section className="py-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-6">
                <div className="overflow-hidden rounded-[1.75rem] shadow-navy-lg">
                  <Pic
                    imageKey="lifestyle-group"
                    alt="A mixed group of adults, including a wheelchair user, talking and laughing together during a group session."
                    sizes="(min-width: 1024px) 50vw, calc(100vw - 2.5rem)"
                    className="w-full object-cover"
                  />
                </div>
              </div>

              {/* Mirrors the mission block: text on the opposite side, narrower
                  than the photo so the two sections don't rhyme too neatly. */}
              <div className="lg:col-span-5 lg:col-start-8">
                <SectionHeading
                  title={HOME.whoWeSupportTeaser.heading}
                  lede={HOME.whoWeSupportTeaser.supportIntro}
                />

                <ul className="mt-7 flex flex-wrap gap-2.5">
                  {HOME.whoWeSupportTeaser.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="rounded-full bg-orange/[0.12] px-4 py-2 text-sm font-semibold text-navy ring-1 ring-orange/40"
                    >
                      {highlight}
                    </li>
                  ))}
                </ul>

                <p className="mt-7 leading-relaxed text-muted">
                  {HOME.whoWeSupportTeaser.paragraph}
                </p>

                <div className="mt-9">
                  <ButtonSecondary
                    href={HOME.whoWeSupportTeaser.cta.href}
                    label={HOME.whoWeSupportTeaser.cta.label}
                  />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* --------------------------------------------------------- Reviews strip */}
      {/* A real, anonymised family review as a pull-quote, not a fabricated
          count of "growing reviews" — see the note in content/reviews.ts on
          why this list only ever grows from genuine client-supplied
          submissions. Links out to /reviews, which carries the full quote
          plus the QR code / Google review CTA. */}
      {featuredReview && (
        <section className="pb-[var(--space-section)]">
          <Reveal>
            <div className="mx-auto max-w-6xl px-5">
              <div className="relative overflow-hidden rounded-[1.75rem] bg-orange/[0.08] px-6 py-14 ring-1 ring-orange/25 sm:px-12 sm:py-16">
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 top-0 mx-auto h-1 w-24 rounded-b-full bg-orange"
                />
                <div className="grid gap-10 md:grid-cols-12 md:items-center md:gap-12">
                  <div className="md:col-span-7">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-text">
                      Reviews
                    </p>
                    <p className="mt-4 font-display text-[length:var(--text-h2)] font-semibold leading-[1.15] tracking-tight text-balance text-navy">
                      &ldquo;{featuredReview.excerpt}&rdquo;
                    </p>
                    <p className="mt-5 text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
                      &mdash; {featuredReview.attribution}
                    </p>
                  </div>

                  <div className="md:col-span-4 md:col-start-9">
                    <div className="flex flex-col gap-3">
                      <ButtonPrimary href="/reviews" label="Read Reviews" />
                      <ButtonSecondary href={SITE.googleReviewUrl} label="Leave a Review" external />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      )}
    </>
  );
}
