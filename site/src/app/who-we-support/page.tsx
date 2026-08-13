import type { Metadata } from "next";
import { SUPPORT } from "@/content/support";
import { SITE } from "@/lib/site";
import { faqPageJsonLd, jsonLdScript } from "@/lib/schema";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { PageHeader } from "@/components/PageHeader";
import { FaqAccordion } from "@/components/FaqAccordion";
import { ButtonPrimary, ButtonSecondary } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "Who We Support",
  description:
    "Truth Care Group supports adults with acquired brain injury, alcohol-related brain damage and stroke at Beaconsfield House, Weston-super-Mare, North Somerset.",
  alternates: { canonical: "/who-we-support" },
};

export default function WhoWeSupportPage() {
  const [primaryCta, secondaryCta] = SUPPORT.hero.ctas;
  const [assessmentPrimaryCta, assessmentSecondaryCta] = SUPPORT.assessment.ctas;

  return (
    <>
      {/* ------------------------------------------------------------- Header */}
      {/* Left column carries the hero copy; the right column holds the
          conditions we support as a chip row (the live site's own list, styled
          the same way the homepage teaser previews it) with the same two CTAs
          the assessment section repeats further down. */}
      <PageHeader
        eyebrow={SITE.address.locality}
        title={SUPPORT.hero.heading}
        lede={SUPPORT.hero.intro}
      >
        <div className="md:col-span-6 md:col-start-7 md:pt-4">
          <ul className="flex flex-wrap gap-2.5">
            {SUPPORT.conditions.map((condition) => (
              <li
                key={condition}
                className="rounded-full bg-orange/[0.12] px-4 py-2 text-sm font-semibold text-navy ring-1 ring-orange/40"
              >
                {condition}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <ButtonPrimary href={primaryCta.href} label={primaryCta.label} />
            <ButtonSecondary href={secondaryCta.href} label={secondaryCta.label} />
          </div>
        </div>
      </PageHeader>

      {/* ------------------------------------------------------------ How we help */}
      {/* pb only, not py — see the matching note in our-team/page.tsx:
          PageHeader already ends in its own pb-[var(--space-section)], so a
          matching pt- here doubled the gap between the header and this
          section. */}
      <section className="pb-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-4">
                <SectionHeading
                  eyebrow={SUPPORT.howWeHelp.eyebrow}
                  title={SUPPORT.howWeHelp.heading}
                  lede={SUPPORT.howWeHelp.intro}
                />
              </div>

              <div className="lg:col-span-7 lg:col-start-6">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-navy/70">
                  {SUPPORT.howWeHelp.listIntro}
                </p>

                <ul className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
                  {SUPPORT.howWeHelp.list.map((item) => (
                    <li key={item} className="flex items-start gap-4">
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
                      <span className="leading-snug text-navy/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------------ Capacity / safety */}
      <section className="bg-navy text-paper">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5 py-[var(--space-section)]">
            <div className="grid gap-10 md:grid-cols-12 md:gap-16">
              <div className="md:col-span-5">
                <SectionHeading
                  eyebrow={SUPPORT.capacitySafety.eyebrow}
                  title={SUPPORT.capacitySafety.heading}
                  onDark
                />
              </div>
              <div className="md:col-span-6 md:col-start-7 md:pt-4">
                <p className="text-[length:var(--text-lede)] leading-relaxed text-paper/90">
                  {SUPPORT.capacitySafety.body}
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------ Assessment */}
      <section className="py-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-orange/[0.08] px-6 py-14 text-center ring-1 ring-orange/25 sm:px-12 sm:py-16">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 mx-auto h-1 w-24 rounded-b-full bg-orange"
              />

              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-text">
                {SUPPORT.assessment.eyebrow}
              </p>

              <h2 className="mx-auto mt-3 max-w-[20ch] font-display text-[length:var(--text-h2)] font-semibold leading-[1.08] tracking-tight text-balance text-navy">
                {SUPPORT.assessment.heading}
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-[length:var(--text-lede)] leading-relaxed text-muted">
                {SUPPORT.assessment.body}
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <ButtonPrimary href={assessmentPrimaryCta.href} label={assessmentPrimaryCta.label} />
                <ButtonSecondary
                  href={assessmentSecondaryCta.href}
                  label={assessmentSecondaryCta.label}
                />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------------ FAQs */}
      <section className="py-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-3xl px-5">
            <SectionHeading title={SUPPORT.faqsHeading} align="center" />
            <div className="mt-12">
              <FaqAccordion faqs={SUPPORT.faqs} />
            </div>
          </div>
        </Reveal>
      </section>

      {/* -------------------------------------------------------------- Referrals */}
      <section className="pb-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid gap-10 md:grid-cols-12 md:gap-10">
              <div className="md:col-span-5">
                <SectionHeading
                  eyebrow={SUPPORT.referrals.eyebrow}
                  title={SUPPORT.referrals.heading}
                  lede={SUPPORT.referrals.intro}
                />
              </div>

              <div className="md:col-span-6 md:col-start-7 md:pt-4">
                <ul className="space-y-3">
                  {SUPPORT.referrals.emails.map((email) => (
                    <li key={email}>
                      <a
                        href={`mailto:${email}`}
                        className="text-[length:var(--text-lede)] font-semibold text-navy underline decoration-navy/30 underline-offset-4 hover:text-orange-text hover:decoration-orange-text"
                      >
                        {email}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a
                      href={SUPPORT.referrals.phoneHref}
                      className="text-[length:var(--text-lede)] font-semibold text-navy underline decoration-navy/30 underline-offset-4 hover:text-orange-text hover:decoration-orange-text"
                    >
                      {SUPPORT.referrals.phone}
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Build-time serialisation of SUPPORT.faqs — no user input, XSS-safe. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPageJsonLd(SUPPORT.faqs)) }}
      />
    </>
  );
}
