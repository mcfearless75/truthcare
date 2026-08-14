interface TestimonialQuoteProps {
  quote: string;
  attribution: string;
}

/**
 * Full testimonial as a standalone card: an oversized quotation mark, the
 * quote itself (split on blank lines into paragraphs — see
 * content/reviews.ts), and the attribution set off by a short orange rule.
 */
export function TestimonialQuote({ quote, attribution }: TestimonialQuoteProps) {
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
      <figcaption className="mt-7 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
        <span aria-hidden="true" className="h-px w-8 bg-orange" />
        {attribution}
      </figcaption>
    </figure>
  );
}
