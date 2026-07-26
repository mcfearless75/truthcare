import type { Metadata } from "next";
import { NOT_FOUND } from "@/content/not-found";
import { PageHeader } from "@/components/PageHeader";
import { ButtonPrimary, ButtonSecondary } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "Page Not Found",
};

/**
 * Rendered inside the root layout's <main>, so this returns page content
 * only — no <main> of its own and no <html>/<body>.
 */
export default function NotFound() {
  const [primaryCta, secondaryCta] = NOT_FOUND.ctas;

  return (
    <PageHeader
      eyebrow="404"
      title={NOT_FOUND.heading}
      lede={NOT_FOUND.body}
      leftExtra={
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <ButtonPrimary href={primaryCta.href} label={primaryCta.label} />
          <ButtonSecondary href={secondaryCta.href} label={secondaryCta.label} />
        </div>
      }
    />
  );
}
