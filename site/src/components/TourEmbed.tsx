"use client";
import { useEffect, useRef, useState } from "react";
import { Pic } from "./Pic";

interface TourEmbedProps {
  /** Third-party tour URL. Nothing is requested from it until activation. */
  src: string;
  /** Accessible name for the iframe once it exists. */
  iframeTitle: string;
  /** Image manifest key for the still shown in place of the tour. */
  posterImageKey: string;
  /** Small overline on the poster, e.g. "360° virtual tour". */
  badge: string;
  /** Label on the activation button. */
  activateLabel: string;
  /** One plain line naming the third party the tour connects to. */
  notice: string;
}

/**
 * Click-to-load facade for the Giraffe360 tour.
 *
 * The whole site sets no cookies and makes no third-party request on page
 * load — the cookie policy says so, there is deliberately no consent banner,
 * and a Playwright regression test asserts it on every page. A third-party
 * iframe rendered on page view would break all three at once, so the iframe
 * is not in the document until the visitor asks for it. Under PECR that
 * activation is the consent step; it also keeps the page fast.
 *
 * Two things this component must keep doing:
 *  - `src` must never appear in the markup before activation. Not on a hidden
 *    iframe, not in a `<link rel="preconnect">`, not in a `data-` attribute a
 *    script could promote. The static export ships the poster and nothing else.
 *  - Once `isLoaded` flips it never flips back, and the iframe keeps the same
 *    position in the tree, so React reuses the element and the visitor is
 *    never dropped back to the start of the tour by a re-render.
 */
export function TourEmbed({
  src,
  iframeTitle,
  posterImageKey,
  badge,
  activateLabel,
  notice,
}: TourEmbedProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const frame = useRef<HTMLDivElement>(null);

  // Activation removes the button the visitor just pressed. Without this the
  // browser drops focus to <body>, so the next Tab restarts at the top of the
  // document — a keyboard user activates the tour and is thrown back to the
  // site header. Focus lands on the frame instead, which is where they were,
  // and their next Tab goes into the tour. Same reasoning as Gallery.tsx
  // returning focus to the thumbnail when the lightbox closes.
  useEffect(() => {
    if (!isLoaded) return;
    frame.current?.focus();
  }, [isLoaded]);

  return (
    /* Responsive frame rather than the vendor's fixed 800px: 800px is taller
       than most laptop viewports and far taller than a phone. The ratio opens
       out as the viewport widens, with a floor on small screens so the tour
       controls are never squeezed into a letterbox.
       `tabIndex={-1}`: programmatically focusable for the effect above, but
       never a tab stop of its own. */
    <div
      ref={frame}
      tabIndex={-1}
      className="relative isolate aspect-[4/3] min-h-[26rem] overflow-hidden rounded-[1.75rem] bg-navy shadow-navy-lg focus-visible:outline-paper! sm:aspect-[16/10] sm:min-h-0 lg:aspect-[16/9]"
    >
      {isLoaded ? (
        <iframe
          src={src}
          title={iframeTitle}
          allow="fullscreen"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <>
          {/* Decorative: the button carries the meaning, and this same
              photograph appears with full alt text in the gallery below. */}
          <Pic
            imageKey={posterImageKey}
            alt=""
            sizes="(min-width: 1152px) 1120px, calc(100vw - 2.5rem)"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Even wash plus a bottom-weighted gradient — the same two-part
              scrim the homepage hero uses, so the label and the notice line
              clear contrast over any part of the photograph. */}
          <div aria-hidden="true" className="absolute inset-0 bg-navy/45" />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/45 to-navy/25"
          />

          {/* py-8 + the 26rem floor above leaves the badge, control and notice
              headroom at 320px, where the notice line wraps to five lines. */}
          <div className="relative flex h-full flex-col items-center justify-center px-6 py-8 text-center">
            <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-paper">
              <span aria-hidden="true" className="h-px w-8 bg-orange" />
              {badge}
            </p>

            {/* One control, not a decorative play ring next to a separate
                text button — a play glyph that looks pressable but isn't is
                the usual way this pattern goes wrong. Focus ring switches to
                paper: the global orange-text ring is too dark on navy. */}
            <button
              type="button"
              onClick={() => setIsLoaded(true)}
              className="group mt-7 inline-flex flex-col items-center gap-4 rounded-[1.5rem] px-6 py-4 focus-visible:outline-paper!"
            >
              <span
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full bg-orange text-navy shadow-navy-md transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-110 group-active:scale-100"
              >
                <svg width="20" height="22" viewBox="0 0 20 22" fill="currentColor">
                  <path d="M18.5 9.7a1.5 1.5 0 0 1 0 2.6l-15 8.5A1.5 1.5 0 0 1 1.25 19.5v-17A1.5 1.5 0 0 1 3.5 1.2Z" />
                </svg>
              </span>
              <span className="font-display text-[length:var(--text-h3)] font-semibold leading-tight text-paper">
                {activateLabel}
              </span>
            </button>

            <p className="mt-5 max-w-md text-sm leading-relaxed text-paper/85">{notice}</p>
          </div>
        </>
      )}
    </div>
  );
}
