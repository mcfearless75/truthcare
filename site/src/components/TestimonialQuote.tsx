interface TestimonialQuoteProps {
  /** The subject's own opening line — rendered as the visual headline, editorial pull-quote style. */
  excerpt: string;
  quote: string;
  attribution: string;
  /** Where the quote came from, e.g. "Google review". Omit for direct submissions. */
  source?: string;
  /** Star rating out of 5, shown next to the source when both are given. */
  rating?: number;
}

/** Exported so the homepage's quieter review strip can reuse the same mark. */
export function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5 text-orange">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i < rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
          <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8-5.1-4.7 6.9-.8Z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Full testimonial as a standalone card. `excerpt` — the subject's own
 * opening line — is the visual headline (an editorial pull-quote), with the
 * full `quote` following underneath at normal body weight; the excerpt does
 * legitimately repeat as the opening of the full quote below it in the
 * family testimonial's case, and appears mid-quote in the Google review's
 * case — both are fine, this is the standard pull-quote convention, not a
 * duplication bug. See
 * docs/superpowers/specs/2026-08-14-sensitive-interactive-experience-design.md
 * §3 for why: the subject's own words carry the section, not a
 * charity-written header.
 */
export function TestimonialQuote({ excerpt, quote, attribution, source, rating }: TestimonialQuoteProps) {
  const paragraphs = quote.split("\n\n");

  return (
    <figure className="relative overflow-hidden rounded-[1.75rem] bg-paper p-8 shadow-navy-md ring-1 ring-navy/10 sm:p-12">
      <span aria-hidden="true" className="font-display text-6xl leading-none text-orange/40 sm:text-7xl">
        &ldquo;
      </span>
      <p className="-mt-4 font-display text-[length:var(--text-h3)] font-semibold leading-snug text-navy sm:-mt-6">
        {excerpt}
      </p>
      <blockquote className="mt-4 space-y-4 leading-relaxed text-navy/80">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </blockquote>
      <figcaption className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
        <span aria-hidden="true" className="h-px w-8 bg-orange" />
        {attribution}
        {source ? (
          <>
            <span aria-hidden="true" className="text-navy/30">
              &middot;
            </span>
            <span className="normal-case tracking-normal text-navy/60">{source}</span>
          </>
        ) : (
          <>
            <span aria-hidden="true" className="text-navy/30">
              &middot;
            </span>
            <span className="normal-case tracking-normal text-navy/60">
              Shared with permission, in their own words
            </span>
          </>
        )}
        {rating && <Stars rating={rating} />}
      </figcaption>
    </figure>
  );
}
