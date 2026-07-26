interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
  /**
   * Set on navy/photographic surfaces. Swaps the heading, eyebrow and lede to
   * their on-dark colours. The eyebrow uses `text-orange` (the fill token,
   * ~6.2:1 on navy) rather than `text-orange-text` (~2.93:1 on navy, fails
   * WCAG AA) — see globals.css for the token values.
   */
  onDark?: boolean;
}

/**
 * Shared section heading. Every section is marked by the same short orange rule
 * so the page reads as one system rather than a stack of unrelated blocks.
 * Orange is used as a fill here only — never as text on white.
 */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  onDark = false,
}: SectionHeadingProps) {
  const centred = align === "center";

  return (
    <div className={`max-w-2xl ${centred ? "mx-auto text-center" : ""}`}>
      <span
        aria-hidden="true"
        className={`block h-1 w-12 rounded-full bg-orange ${centred ? "mx-auto" : ""}`}
      />

      {eyebrow && (
        <p
          className={`mt-5 text-xs font-semibold uppercase tracking-[0.2em] ${
            onDark ? "text-orange" : "text-orange-text"
          }`}
        >
          {eyebrow}
        </p>
      )}

      <h2
        className={`font-display text-[length:var(--text-h2)] font-semibold leading-[1.08] tracking-tight text-balance ${
          onDark ? "text-paper" : "text-navy"
        } ${eyebrow ? "mt-3" : "mt-6"}`}
      >
        {title}
      </h2>

      {lede && (
        <p
          className={`mt-5 text-[length:var(--text-lede)] leading-relaxed ${
            onDark ? "text-paper/90" : "text-muted"
          }`}
        >
          {lede}
        </p>
      )}
    </div>
  );
}
