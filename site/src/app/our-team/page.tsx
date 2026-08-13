import type { Metadata } from "next";
import { TEAM, TEAM_PAGE } from "@/content/team";
import { SITE } from "@/lib/site";
import { slug } from "@/lib/slug";
import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { PageHeader } from "@/components/PageHeader";
import { TeamCard } from "@/components/TeamCard";
import { ButtonPrimary, ButtonSecondary } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "Our Team",
  // "Registered manager" removed 2026-08-12 — see the NEEDS CONFIRMATION
  // note on Emma Merriman in team.ts. Update this once that's resolved.
  description:
    "Meet the Truth Care Group team behind Beaconsfield House: a neuropsychiatrist, clinical neuropsychologist, neurophysiotherapists, a neuro speech and language therapist and a neuro-occupational therapist.",
  alternates: { canonical: "/our-team" },
};

const [primaryCta, secondaryCta] = TEAM_PAGE.ctas;

// Derived from TEAM itself (not re-typed) so the chip row can never drift
// out of sync with the roles the bios actually list. Two people currently
// share "Neurophysiotherapist" (Caz Icke, Emily Kerr); the chip links to
// whichever of them appears first in TEAM, since a role can't point at two
// cards at once — not a perfect answer, but a reasonable one.
const roles = Array.from(new Set(TEAM.map((member) => member.role))).map((role) => ({
  role,
  href: `#${slug(TEAM.find((member) => member.role === role)!.name)}`,
}));

export default function OurTeamPage() {
  return (
    <>
      {/* ------------------------------------------------------------- Header */}
      {/* Left column carries the hero copy; the right column lists the roles
          represented on the team as a chip row, echoing the conditions chips
          on /who-we-support, with the same two CTAs repeated in the closing
          section below. */}
      <PageHeader
        eyebrow={SITE.address.locality}
        title={TEAM_PAGE.hero.heading}
        lede={TEAM_PAGE.hero.intro}
      >
        <div className="md:col-span-6 md:col-start-7 md:pt-4">
          <ul className="flex flex-wrap gap-2.5">
            {roles.map(({ role, href }) => (
              <li key={role}>
                <a
                  href={href}
                  className="inline-flex rounded-full bg-orange/[0.12] px-4 py-2 text-sm font-semibold text-navy ring-1 ring-orange/40 transition-colors duration-200 hover:bg-orange/25"
                >
                  {role}
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <ButtonPrimary href={primaryCta.href} label={primaryCta.label} />
            <ButtonSecondary href={secondaryCta.href} label={secondaryCta.label} />
          </div>
        </div>
      </PageHeader>

      {/* --------------------------------------------------------- Team grid */}
      {/* Reveal now fires on threshold: 0 with a negative rootMargin (see
          Reveal.tsx), so it triggers off the element's top edge rather than
          a ratio of its total height — safe even for a tall six-card grid.
          pb only, not py: PageHeader already ends in its own
          pb-[var(--space-section)], so a matching pt- here stacked both and
          left a huge gap between the header content and "The Team" —
          matches the pattern virtual-tour's tour section already uses. */}
      <section className="pb-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <SectionHeading
              eyebrow={TEAM_PAGE.grid.eyebrow}
              title={TEAM_PAGE.grid.heading}
              lede={TEAM_PAGE.grid.lede}
            />

            <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {TEAM.map((member) => (
                <TeamCard key={member.name} member={member} />
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ------------------------------------------------------------ Closing */}
      <section className="pb-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-orange/[0.08] px-6 py-14 text-center ring-1 ring-orange/25 sm:px-12 sm:py-16">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 mx-auto h-1 w-24 rounded-b-full bg-orange"
              />

              <h2 className="mx-auto max-w-[20ch] font-display text-[length:var(--text-h2)] font-semibold leading-[1.08] tracking-tight text-balance text-navy">
                {TEAM_PAGE.closing.heading}
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-[length:var(--text-lede)] leading-relaxed text-muted">
                {TEAM_PAGE.closing.body}
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
                <ButtonPrimary href={primaryCta.href} label={primaryCta.label} />
                <ButtonSecondary href={secondaryCta.href} label={secondaryCta.label} />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
