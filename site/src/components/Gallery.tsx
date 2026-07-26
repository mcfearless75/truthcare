"use client";
import { useCallback, useRef, useState } from "react";
import { Pic } from "./Pic";
import { Lightbox } from "./Lightbox";
import type { GalleryImage } from "@/content/types";

interface GalleryProps {
  images: GalleryImage[];
  /** Accessible name for the lightbox dialog and the grid's own list. */
  label: string;
}

/**
 * Editorial photo grid. The first photograph runs at double width and height on
 * large screens so the set opens on a focal point instead of reading as a
 * uniform card grid; the remainder tile round it. With nine images that fills
 * four rows exactly, and with six it fills three.
 *
 * Every cell is a fixed 4:3 frame with `object-cover`, so the mixed 4:3 / 3:2
 * source ratios tile cleanly and the three lower-resolution photographs
 * (1200w max) are never asked to fill more than a ~750px cell.
 */
export function Gallery({ images, label }: GalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggers = useRef<Array<HTMLButtonElement | null>>([]);
  /** The thumbnail focus should land on when the dialog closes. */
  const returnTo = useRef<number | null>(null);

  const handleOpen = (index: number) => {
    returnTo.current = index;
    setOpenIndex(index);
  };

  const handleNavigate = useCallback((next: number) => {
    returnTo.current = next;
    setOpenIndex(next);
  }, []);

  const handleClose = useCallback(() => {
    setOpenIndex((current) => (current === null ? current : null));
    const index = returnTo.current;
    if (index === null) return;
    // After the dialog has actually left the top layer, so this wins over the
    // browser's own restoration and lands on the photo the user was viewing.
    requestAnimationFrame(() => triggers.current[index]?.focus());
  }, []);

  return (
    <>
      <ul
        aria-label={label}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5"
      >
        {images.map((image, index) => {
          const caption = image.caption ?? image.alt;
          return (
          <li key={image.key} className={index === 0 ? "lg:col-span-2 lg:row-span-2" : undefined}>
            <button
              type="button"
              ref={(node) => {
                triggers.current[index] = node;
              }}
              onClick={() => handleOpen(index)}
              /* Named explicitly rather than by content: the thumbnail should
                 announce as a short, actionable control. The full description
                 of each photograph lives on the image inside the lightbox,
                 which is why the thumbnail image itself is decorative here. */
              aria-label={`${caption}. View larger photo.`}
              className="group relative block h-full w-full overflow-hidden rounded-[1.25rem] bg-navy/5 ring-1 ring-navy/10 transition duration-300 ease-[var(--ease-out-expo)] hover:ring-navy/25 hover:shadow-navy-md"
            >
              {/* The feature cell drops its ratio at `lg` and takes its height
                  from the two rows it spans, so its bottom edge lines up with
                  the tiles beside it. */}
              <span className={`block aspect-[4/3] ${index === 0 ? "lg:aspect-auto lg:h-full" : ""}`}>
                <Pic
                  imageKey={image.key}
                  alt=""
                  sizes={
                    index === 0
                      ? "(min-width: 1024px) 750px, (min-width: 640px) 50vw, calc(100vw - 2.5rem)"
                      : "(min-width: 1024px) 370px, (min-width: 640px) 50vw, calc(100vw - 2.5rem)"
                  }
                  className="h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
                />
              </span>

              {/* Caption plate. Sits over a navy wash that deepens on hover and
                  focus, so the state is designed rather than a default outline. */}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy/85 via-navy/45 to-transparent p-4 pt-10 text-left sm:p-5 sm:pt-12">
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="h-px w-6 shrink-0 bg-orange transition-all duration-300 ease-[var(--ease-out-expo)] group-hover:w-10"
                  />
                  <span className="text-sm font-semibold leading-snug text-paper">{caption}</span>
                </span>
              </span>
            </button>
          </li>
          );
        })}
      </ul>

      <Lightbox
        images={images}
        index={openIndex}
        label={label}
        onClose={handleClose}
        onNavigate={handleNavigate}
      />
    </>
  );
}
