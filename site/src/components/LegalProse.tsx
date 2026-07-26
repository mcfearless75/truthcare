import Link from "next/link";
import type { LegalPage } from "@/content/types";
import { PageHeader } from "@/components/PageHeader";

/**
 * Turn plain prose into React nodes, linking the things a reader will
 * actually want to click in a legal document: email addresses, absolute
 * URLs, and bare references to ico.org.uk.
 *
 * The prose in `content/legal.ts` is written as plain strings so it stays
 * readable and reviewable by a non-developer. Linking is presentation, so it
 * happens here rather than by scattering markup through the content file.
 * Anything not matched is passed through untouched — a legal document must
 * never be silently reworded by a formatter.
 */
const LINKABLE =
  /([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|(https?:\/\/[^\s)]+)|(\bico\.org\.uk(?:\/[\w-]+)*)/g;

const inlineLink =
  "font-medium text-navy underline decoration-navy/30 underline-offset-4 hover:text-orange-text hover:decoration-orange-text";

function linkify(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  for (const match of text.matchAll(LINKABLE)) {
    const [value] = match;
    const start = match.index;

    if (start > cursor) nodes.push(text.slice(cursor, start));

    const href = value.includes("@")
      ? `mailto:${value}`
      : value.startsWith("http")
        ? value
        : `https://${value}`;

    nodes.push(
      <a key={`l${key++}`} href={href} className={inlineLink}>
        {value}
      </a>,
    );
    cursor = start + value.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

/** Stable in-page anchor derived from the heading itself. */
function slug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

interface LegalProseProps {
  page: LegalPage;
  /** The sibling legal page, cross-linked at the foot of the document. */
  related: { href: string; label: string };
}

export function LegalProse({ page, related }: LegalProseProps) {
  const paragraph = "mt-4 leading-relaxed text-muted";

  return (
    <>
      <PageHeader eyebrow={page.eyebrow} title={page.heading} lede={page.intro}>
        <div className="md:col-span-6 md:col-start-7 md:pt-4">
          <p className="text-sm text-muted">
            Last updated{" "}
            <time dateTime={page.updatedIso} className="font-semibold text-navy">
              {page.updated}
            </time>
          </p>

          <nav aria-labelledby="contents-heading" className="mt-6">
            <h2
              id="contents-heading"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-navy/70"
            >
              On this page
            </h2>
            <ol className="mt-3 space-y-1.5">
              {page.sections.map((section) => (
                <li key={section.heading}>
                  <a
                    href={`#${slug(section.heading)}`}
                    className="inline-flex min-h-6 items-center text-navy underline decoration-navy/25 underline-offset-4 hover:text-orange-text hover:decoration-orange-text"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </PageHeader>

      <section className="pb-[var(--space-section)]">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-prose">
            {page.sections.map((section) => (
              <section key={section.heading} className="mt-14 first:mt-0 scroll-mt-28">
                <h2
                  id={slug(section.heading)}
                  className="font-display text-[length:var(--text-h3)] font-semibold leading-snug text-navy"
                >
                  {section.heading}
                </h2>

                {section.paragraphs?.map((text) => (
                  <p key={text} className={paragraph}>
                    {linkify(text)}
                  </p>
                ))}

                {section.listIntro && <p className={paragraph}>{linkify(section.listIntro)}</p>}

                {section.list && (
                  <ul className="mt-4 space-y-3">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-3 leading-relaxed text-muted">
                        <span
                          aria-hidden="true"
                          className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange"
                        />
                        <span>{linkify(item)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {section.outro?.map((text) => (
                  <p key={text} className={paragraph}>
                    {linkify(text)}
                  </p>
                ))}
              </section>
            ))}

            <p className="mt-14 border-t border-navy/10 pt-6 text-sm text-muted">
              See also{" "}
              <Link href={related.href} className={inlineLink}>
                {related.label}
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
