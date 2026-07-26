import { IMAGES } from "@/lib/images";
import { withBasePath } from "@/lib/basePath";

interface PicProps {
  imageKey: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function Pic({ imageKey, alt, sizes = "100vw", priority = false, className }: PicProps) {
  const entry = IMAGES[imageKey];
  if (!entry) throw new Error(`Unknown image key: ${imageKey}`);
  const { widths, aspect } = entry;
  const max = widths[widths.length - 1];
  const srcSet = (fmt: string) =>
    widths.map((w) => `${withBasePath(`/images/${imageKey}/${w}.${fmt}`)} ${w}w`).join(", ");

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
      <img
        src={withBasePath(`/images/${imageKey}/${max}.jpg`)}
        srcSet={srcSet("jpg")}
        sizes={sizes}
        alt={alt}
        width={max}
        height={Math.round(max / aspect)}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
