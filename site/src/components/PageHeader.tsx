interface PageHeaderProps {
  eyebrow: string;
  title: string;
  lede?: string;
  /**
   * Extra content rendered in the left column after the lede — e.g. a short
   * address line. Kept separate from `lede` because it isn't always prose
   * (it can carry its own icon/rule markup).
   */
  leftExtra?: React.ReactNode;
  /**
   * Right-hand grid column content. The wrapper needs its own
   * `md:col-span-*`/`md:col-start-*` (and any vertical offset) classes, since
   * that content — an image, a CTA block, a second heading — differs per
   * page.
   */
  children?: React.ReactNode;
}

/**
 * Shared page-header layout: 12-column grid, orange rule → eyebrow → hero
 * `h1` → intro in a left column, with an arbitrary right-hand column supplied
 * by the caller. Used by every interior page so the top of the site reads as
 * one system.
 */
export function PageHeader({ eyebrow, title, lede, leftExtra, children }: PageHeaderProps) {
  return (
    <section className="pb-[var(--space-section)] pt-28 md:pt-36">
      <div className="mx-auto max-w-6xl px-5">
        <div className="grid gap-12 md:grid-cols-12 md:gap-10 lg:gap-16">
          <div className="md:col-span-5">
            <span aria-hidden="true" className="block h-1 w-12 rounded-full bg-orange" />

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-text">
              {eyebrow}
            </p>

            <h1 className="mt-3 font-display text-[length:var(--text-hero)] font-semibold leading-[1.03] tracking-[-0.02em] text-balance text-navy">
              {title}
            </h1>

            {lede && (
              <p className="mt-6 text-[length:var(--text-lede)] leading-relaxed text-muted">
                {lede}
              </p>
            )}

            {leftExtra}
          </div>

          {children}
        </div>
      </div>
    </section>
  );
}
