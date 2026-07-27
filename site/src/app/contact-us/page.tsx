import type { Metadata } from "next";
import { CONTACT } from "@/content/contact";
import { SITE } from "@/lib/site";
import { withBasePath } from "@/lib/basePath";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact Truth Care Group about a placement, a referral or a visit to Beaconsfield House, Weston-super-Mare. Call 07966 284872 or send us a message.",
  alternates: { canonical: "/contact-us" },
};

const linkClass =
  "font-semibold text-navy underline decoration-navy/30 underline-offset-4 hover:text-orange-text hover:decoration-orange-text";

export default function ContactPage() {
  return (
    <>
      {/* ------------------------------------------------------------- Header */}
      {/* Contact details sit in the header's left column beneath the h1, the
          form takes the right column. On mobile the grid collapses so the
          details — the fastest route to a human — come first. */}
      <PageHeader
        eyebrow={SITE.address.locality}
        title={CONTACT.heading}
        leftExtra={
          /* A description list, not a stack of headings: these are label /
             value pairs, and promoting three one-word labels to h2 would
             clutter the page's heading outline for screen-reader users. */
          <dl className="mt-8 space-y-6">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-navy/70">
                Address
              </dt>
              <dd className="mt-2 text-[length:var(--text-lede)] leading-relaxed text-muted">
                <address className="not-italic">{CONTACT.address}</address>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-navy/70">
                Email
              </dt>
              <dd className="mt-2 text-[length:var(--text-lede)]">
                <a href={CONTACT.links.emailUs.href} className={linkClass}>
                  {CONTACT.email}
                </a>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-navy/70">
                Phone
              </dt>
              {/* href comes from CONTACT.links.callUs, which normalises the
                  live site's space-containing tel: URI (see contact.ts). */}
              <dd className="mt-2 text-[length:var(--text-lede)]">
                <a href={CONTACT.links.callUs.href} className={linkClass}>
                  {CONTACT.phone}
                </a>
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-navy/70">
                Brochure
              </dt>
              <dd className="mt-2 text-[length:var(--text-lede)]">
                <a
                  href={withBasePath(SITE.brochureUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  Download our brochure (PDF)
                </a>
              </dd>
            </div>
          </dl>
        }
      >
        <div className="md:col-span-6 md:col-start-7">
          <h2 className="font-display text-[length:var(--text-h3)] font-semibold text-navy">
            {CONTACT.form.heading}
          </h2>
          <div className="mt-7">
            <ContactForm />
          </div>
        </div>
      </PageHeader>

      {/* ---------------------------------------------------------- Regulation */}
      <section className="bg-navy text-paper">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5 py-14">
            <div className="grid gap-6 md:grid-cols-12 md:items-center">
              <div className="md:col-span-5">
                <span aria-hidden="true" className="block h-1 w-12 rounded-full bg-orange" />
                <h2 className="mt-5 font-display text-[length:var(--text-h3)] font-semibold text-paper">
                  {CONTACT.regulation.heading}
                </h2>
              </div>
              <div className="md:col-span-6 md:col-start-7">
                <p className="text-[length:var(--text-lede)] leading-relaxed text-paper/90">
                  {CONTACT.regulation.intro}{" "}
                  <a
                    href={SITE.cqcUrl}
                    className="font-semibold text-paper underline decoration-orange underline-offset-4 hover:text-orange"
                  >
                    {CONTACT.regulation.linkLabel}
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
