import type { Metadata } from "next";
import { ButtonPrimary, ButtonSecondary } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "Page Not Found",
};

/**
 * Rendered inside the root layout's <main>, so this returns page content
 * only — no <main> of its own and no <html>/<body>.
 */
export default function NotFound() {
  return (
    <section className="pb-[var(--space-section)] pt-28 md:pt-36">
      <div className="mx-auto max-w-6xl px-5">
        <div className="max-w-2xl">
          <span aria-hidden="true" className="block h-1 w-12 rounded-full bg-orange" />

          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-text">
            404
          </p>

          <h1 className="mt-3 font-display text-[length:var(--text-hero)] font-semibold leading-[1.03] tracking-[-0.02em] text-balance text-navy">
            Page not found
          </h1>

          <p className="mt-6 text-[length:var(--text-lede)] leading-relaxed text-muted">
            The page you were looking for has moved or no longer exists. If you were trying to
            reach us about a placement or a referral, the contact page is the quickest route.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <ButtonPrimary href="/" label="Back to home" />
            <ButtonSecondary href="/contact-us" label="Contact us" />
          </div>
        </div>
      </div>
    </section>
  );
}
