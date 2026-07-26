import type { Faq } from "@/content/types";

/**
 * Native <details>/<summary> accordion — keyboard-operable and screen-reader
 * accessible for free, no JS required. The "+" disclosure indicator is
 * decorative only (aria-hidden); the summary's own text is the accessible
 * name for each disclosure.
 */
export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="divide-y divide-navy/10 border-y border-navy/10">
      {faqs.map((faq) => (
        <details key={faq.question} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold text-navy [&::-webkit-details-marker]:hidden">
            {faq.question}
            <span
              aria-hidden="true"
              className="text-orange-text transition-transform duration-300 group-open:rotate-45 text-2xl leading-none"
            >
              +
            </span>
          </summary>
          {faq.answer.split("\n\n").map((paragraph) => (
            <p key={paragraph.slice(0, 32)} className="mt-3 max-w-prose leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </details>
      ))}
    </div>
  );
}
