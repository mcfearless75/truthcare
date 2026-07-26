"use client";
import { useCallback, useEffect, useRef } from "react";
import { Pic } from "./Pic";
import type { GalleryImage } from "@/content/types";

interface LightboxProps {
  images: GalleryImage[];
  /** Index of the open photo, or null when the lightbox is closed. */
  index: number | null;
  /** Accessible name for the dialog. Stable across photos. */
  label: string;
  onClose: () => void;
  onNavigate: (next: number) => void;
}

const CONTROL =
  "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-paper/40 text-paper transition duration-200 hover:border-paper hover:bg-paper hover:text-navy focus-visible:outline-paper!";

/**
 * Native `<dialog>` + `showModal()`. That gives focus trapping, Esc-to-close and
 * an inert background for free, so none of it is reimplemented here.
 *
 * The dialog element stays mounted whether or not a photo is open — only its
 * contents are conditional. Unmounting an open modal dialog would strip it from
 * the top layer without firing `close`, which is exactly what breaks the
 * browser's own focus restoration.
 */
export function Lightbox({ images, index, label, onClose, onNavigate }: LightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  const step = useCallback(
    (delta: number) => {
      if (index === null) return;
      onNavigate((index + delta + images.length) % images.length);
    },
    [index, images.length, onNavigate]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDialogElement>) => {
      if (index === null) return;
      if (event.key === "Escape") {
        // The browser's own close request already handles Esc. This is a
        // deliberate belt-and-braces: `onClose` is idempotent, and it keeps the
        // shortcut working in environments where the native close request does
        // not fire (some embedded/automated browsers). Not prevented, so the
        // native path still runs where it does work.
        onClose();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        step(1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        step(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        onNavigate(0);
      } else if (event.key === "End") {
        event.preventDefault();
        onNavigate(images.length - 1);
      }
    },
    [index, images.length, onClose, onNavigate, step]
  );

  const image = index === null ? null : images[index];

  return (
    <dialog
      ref={ref}
      /* Fires for Esc (after `cancel`) and for programmatic close alike, so it
         is the single place the closed state is reported upward. */
      onClose={onClose}
      onKeyDown={handleKeyDown}
      /* A click on ::backdrop targets the dialog element itself. The inner
         wrapper below is the only child, so anything else has a deeper target. */
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={label}
      className="max-h-none max-w-none bg-transparent p-0 backdrop:bg-navy/95 open:flex open:h-full open:w-full open:items-center open:justify-center"
    >
      {image && index !== null && (
        <div className="flex w-[92vw] max-w-4xl flex-col items-center gap-5 p-4">
          <figure className="flex w-full flex-col items-center">
            <Pic
              key={image.key}
              imageKey={image.key}
              alt={image.alt}
              sizes="(min-width: 960px) 896px, 92vw"
              className="max-h-[64vh] w-auto max-w-full rounded-xl object-contain shadow-navy-lg"
            />
            <figcaption className="mt-4 text-center font-display text-[length:var(--text-h3)] font-semibold text-paper">
              {image.caption ?? image.alt}
            </figcaption>
          </figure>

          <div className="flex items-center gap-3 sm:gap-4">
            <button type="button" onClick={() => step(-1)} className={CONTROL} aria-label="Previous photo">
              <Arrow direction="left" />
            </button>

            <p className="min-w-[6.5rem] text-center text-sm font-semibold uppercase tracking-[0.14em] text-paper/80">
              {index + 1} of {images.length}
            </p>

            <button type="button" onClick={() => step(1)} className={CONTROL} aria-label="Next photo">
              <Arrow direction="right" />
            </button>

            <span aria-hidden="true" className="mx-1 h-8 w-px bg-paper/25" />

            <button type="button" onClick={onClose} className={CONTROL} aria-label="Close gallery">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          </div>

          {/* Announces the change to screen-reader users, who otherwise get no
              notification that the dialog's contents were swapped. */}
          <p aria-live="polite" className="sr-only">
            {`Photo ${index + 1} of ${images.length}. ${image.caption ?? image.alt}`}
          </p>
        </div>
      )}
    </dialog>
  );
}

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={direction === "left" ? "-ml-0.5 rotate-180" : "-mr-0.5"}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
