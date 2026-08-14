interface TestimonialQuoteProps {
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
 * Full testimonial as a standalone card: an oversized quotation mark, the
 * quote itself (split on blank lines into paragraphs — see
 * content/reviews.ts), and the attribution set off by a short orange rule.
 * `source`/`rating` are optional — the anonymised family quote has neither,
 * the Google review carries both.
 */
export function TestimonialQuote({ quote, attribution, source, rating }: TestimonialQuoteProps) {
  const paragraphs = quote.split("\n\n");

  return (
    <figure className="relative overflow-hidden rounded-[1.75rem] bg-paper p-8 shadow-navy-md ring-1 ring-navy/10 sm:p-12">
      <span aria-hidden="true" className="font-display text-6xl leading-none text-orange/40 sm:text-7xl">
        &ldquo;
      </span>
      <blockquote className="-mt-4 space-y-4 text-[length:var(--text-lede)] leading-relaxed text-navy/90 sm:-mt-6">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </blockquote>
      <figcaption className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
        <span aria-hidden="true" className="h-px w-8 bg-orange" />
        {attribution}
        {source && (
          <>
            <span aria-hidden="true" className="text-navy/30">
              &middot;
            </span>
            <span className="normal-case tracking-normal text-navy/60">{source}</span>
          </>
        )}
        {rating && <Stars rating={rating} />}
      </figcaption>
    </figure>
  );
}
