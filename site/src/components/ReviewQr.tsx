/**
 * QR code linking to Truth Care Group's Google review form
 * (SITE.googleReviewUrl). The module pattern below is a static, pre-rendered
 * encoding of that exact URL — generated once with the `qrcode` package at
 * version 3 / error-correction level M (29x29 modules) and pasted in here as
 * plain markup, so the page ships zero extra JS and no runtime QR library.
 *
 * If SITE.googleReviewUrl ever changes, this pattern must be regenerated to
 * match — it will otherwise silently point at a dead review link. Regenerate
 * with:
 *   npx qrcode -o out.svg -e M '<the new URL>'
 * then copy the single <path d="…"> from the output back in below.
 */
const QR_VIEWBOX = "0 0 29 29";
const QR_PATH =
  "M0 0.5h7m1 0h2m1 0h1m1 0h1m2 0h1m3 0h1m1 0h7M0 1.5h1m5 0h1m1 0h3m3 0h1m2 0h2m1 0h1m1 0h1m5 0h1M0 2.5h1m1 0h3m1 0h1m2 0h1m2 0h4m2 0h2m2 0h1m1 0h3m1 0h1M0 3.5h1m1 0h3m1 0h1m1 0h1m3 0h6m2 0h1m1 0h1m1 0h3m1 0h1M0 4.5h1m1 0h3m1 0h1m2 0h2m3 0h3m5 0h1m1 0h3m1 0h1M0 5.5h1m5 0h1m4 0h1m1 0h2m2 0h4m1 0h1m5 0h1M0 6.5h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7M8 7.5h2m1 0h2m3 0h3m1 0h1M0 8.5h1m1 0h2m1 0h3m2 0h2m2 0h1m1 0h1m1 0h3m1 0h1m2 0h1m1 0h2M10 9.5h1m3 0h1m1 0h1m3 0h5m3 0h1M0 10.5h1m1 0h2m2 0h1m1 0h1m4 0h1m3 0h2m1 0h2m4 0h2M0 11.5h4m1 0h1m1 0h1m1 0h1m3 0h4m1 0h4m6 0h1M0 12.5h1m1 0h1m2 0h2m5 0h1m2 0h2m2 0h1m5 0h2M0 13.5h5m2 0h1m2 0h2m1 0h6m3 0h1m3 0h3M1 14.5h4m1 0h1m1 0h2m2 0h1m1 0h1m4 0h1m1 0h2m3 0h3M0 15.5h1m3 0h2m2 0h1m2 0h3m2 0h1m1 0h1m1 0h1m3 0h1m2 0h1M0 16.5h2m1 0h1m2 0h2m1 0h4m2 0h1m8 0h2m1 0h1M4 17.5h2m6 0h2m1 0h2m1 0h3m2 0h1m1 0h3M0 18.5h1m3 0h3m1 0h1m2 0h1m3 0h2m1 0h1m1 0h1m1 0h1m3 0h1M2 19.5h1m4 0h3m1 0h2m3 0h2m1 0h4m1 0h1m1 0h1M1 20.5h2m3 0h2m1 0h1m1 0h1m1 0h1m1 0h12M8 21.5h2m1 0h6m3 0h1m3 0h5M0 22.5h7m1 0h1m1 0h1m2 0h1m3 0h2m1 0h1m1 0h1m1 0h2m1 0h1M0 23.5h1m5 0h1m1 0h2m1 0h2m2 0h2m1 0h1m1 0h1m3 0h2m1 0h1M0 24.5h1m1 0h3m1 0h1m2 0h1m1 0h1m2 0h2m4 0h5m1 0h1M0 25.5h1m1 0h3m1 0h1m1 0h1m1 0h1m1 0h3m1 0h1m2 0h1m1 0h1m1 0h3m2 0h1M0 26.5h1m1 0h3m1 0h1m1 0h4m1 0h2m3 0h1m1 0h2m4 0h1m1 0h1M0 27.5h1m5 0h1m3 0h1m1 0h1m1 0h3m3 0h2m1 0h1m1 0h1m1 0h1M0 28.5h7m1 0h7m2 0h2m1 0h1m1 0h1m4 0h1";

interface ReviewQrProps {
  caption?: string;
  className?: string;
}

/**
 * Stylish, self-contained presentation of the QR code above: a paper card
 * with a generous quiet zone (QR codes need clear space around the pattern
 * to scan reliably — that's the card's own padding, not baked into the SVG)
 * and the same orange corner accent used elsewhere on interior pages.
 */
export function ReviewQr({ caption, className = "" }: ReviewQrProps) {
  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute -bottom-3 -right-3 h-14 w-14 rounded-br-2xl border-b-4 border-r-4 border-orange"
        />
        <div className="relative rounded-2xl bg-paper p-5 shadow-navy-md ring-1 ring-navy/10 sm:p-6">
          <svg
            viewBox={QR_VIEWBOX}
            shapeRendering="crispEdges"
            className="h-40 w-40 sm:h-48 sm:w-48"
            role="img"
            aria-label="QR code linking to Truth Care Group's Google review page"
          >
            {/* Each "h" segment in QR_PATH is one module-row wide; stroke-width
                1 (in the 29x29-unit viewBox, so 1 = one module) is what turns
                those line segments into solid squares — this has to stay a
                stroke, not a fill, or the pattern reads as gaps. */}
            <path fill="none" stroke="var(--color-navy)" strokeWidth={1} d={QR_PATH} />
          </svg>
        </div>
      </div>

      {caption && (
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-navy/70">
          {caption}
        </p>
      )}
    </div>
  );
}
