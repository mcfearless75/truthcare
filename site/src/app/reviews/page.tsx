import type { Metadata } from "next";
import { REVIEWS } from "@/content/reviews";
import { SITE } from "@/lib/site";
import { Reveal } from "@/components/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { SectionHeading } from "@/components/SectionHeading";
import { ReviewQr } from "@/components/ReviewQr";
import { TestimonialQuote } from "@/components/TestimonialQuote";
import { ButtonPrimary, ButtonSecondary } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "Reviews",
  description:
    "Leave Truth Care Group a Google review — scan the QR code or tap through to rate your experience of Beaconsfield House, Weston-super-Mare.",
  alternates: { canonical: "/reviews" },
};

export default function ReviewsPage() {
  return (
    <>
      {/* ------------------------------------------------------------- Header */}
      {/* Copy + CTA left, the scannable QR right — mirrors virtual-tour's
          text/photo split so the page reads as part of the same site, with
          the QR card standing in for the photograph. */}
      <PageHeader
        eyebrow={REVIEWS.eyebrow}
        title={REVIEWS.heading}
        lede={REVIEWS.intro}
        leftExtra={
          <div className="mt-9">
            <ButtonPrimary href={SITE.googleReviewUrl} label={REVIEWS.ctaLabel} external />
          </div>
        }
      >
        <div className="flex md:col-span-6 md:col-start-7 md:mt-12 md:justify-center lg:mt-16">
          <ReviewQr caption={REVIEWS.qr.caption} />
        </div>
      </PageHeader>

      {/* --------------------------------------------------------- Testimonials */}
      {REVIEWS.testimonials.length > 0 && (
        <section className="pb-[var(--space-section)]">
          <Reveal>
            <div className="mx-auto max-w-6xl px-5">
              {/* A real <h2>, not a <p> — heading structure stays intact for
                  screen readers — but styled at eyebrow scale rather than
                  SectionHeading's large display size, so the testimonials'
                  own opening lines (rendered inside TestimonialQuote) are
                  the dominant visual heading, not this label. See
                  docs/superpowers/specs/2026-08-14-...-design.md §3. */}
              <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-orange-text">
                {REVIEWS.testimonialsHeading}
              </h2>
              <div className="mx-auto mt-12 max-w-3xl space-y-8">
                {REVIEWS.testimonials.map((testimonial) => (
                  <TestimonialQuote
                    key={testimonial.attribution}
                    excerpt={testimonial.excerpt}
                    quote={testimonial.quote}
                    attribution={testimonial.attribution}
                    source={testimonial.source}
                    rating={testimonial.rating}
                  />
                ))}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* -------------------------------------------------------------- Steps */}
      <section className="bg-navy text-paper">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5 py-[var(--space-section)]">
            <SectionHeading title="How it works" onDark />

            <ol className="mt-10 grid gap-8 sm:grid-cols-3">
              {REVIEWS.steps.map((step, i) => (
                <li key={step.heading} className="border-t border-paper/20 pt-5">
                  <span
                    aria-hidden="true"
                    className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-orange text-navy font-display font-semibold"
                  >
                    {i + 1}
                  </span>
                  <p className="font-display text-[length:var(--text-h3)] font-semibold text-paper">
                    {step.heading}
                  </p>
                  <p className="mt-2 leading-relaxed text-paper/90">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------ Closing */}
      <section className="py-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-orange/[0.08] px-6 py-14 text-center ring-1 ring-orange/25 sm:px-12 sm:py-16">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 mx-auto h-1 w-24 rounded-b-full bg-orange"
              />
              <h2 className="mx-auto max-w-[20ch] font-display text-[length:var(--text-h2)] font-semibold leading-[1.08] tracking-tight text-balance text-navy">
                {REVIEWS.closing.heading}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[length:var(--text-lede)] leading-relaxed text-muted">
                {REVIEWS.closing.body}
              </p>
              <div className="mt-9 flex justify-center">
                <ButtonSecondary href={REVIEWS.closing.cta.href} label={REVIEWS.closing.cta.label} />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
