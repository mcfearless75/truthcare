import { Pic } from "./Pic";
import { IMAGES } from "@/lib/images";
import { slug } from "@/lib/slug";
import type { TeamMember } from "@/content/types";

/**
 * Most headshots in the manifest are conventional portrait crops (roughly
 * 0.65-0.78 width:height) and sit comfortably in a 3:4 box. A near-square
 * source (e.g. a roughly 1:1 crop) only has a 480w render and would lose
 * ~20% off each side forced into the standard 3:4 box. A near-square box
 * keeps that crop to a few percent, top and bottom only. Driven by the
 * manifest's real aspect data so any near-square headshot gets the same
 * gentler treatment automatically.
 */
function boxAspectClass(imageKey: string): string {
  const aspect = IMAGES[imageKey]?.aspect ?? 0.75;
  return aspect >= 0.85 ? "aspect-square" : "aspect-[3/4]";
}

export function TeamCard({ member }: { member: TeamMember }) {
  return (
    // id + scroll-mt-28: the role chips in the page header link straight to
    // a card (see our-team/page.tsx); the offset keeps the sticky header
    // from covering the top of the card when the browser jumps to it.
    // Capped and centred below `sm` only: single-column cards otherwise grow
    // with the viewport (up to ~599px at 639px wide) and upscale the two
    // headshots that only ship a 480w render. From `sm` up the grid tracks
    // are already narrower than 480px, so the cap is a no-op there.
    <article
      id={slug(member.name)}
      className="mx-auto flex max-w-[480px] scroll-mt-28 flex-col sm:max-w-none"
    >
      <div className={`overflow-hidden rounded-2xl bg-navy/5 ${boxAspectClass(member.image)}`}>
        <Pic
          imageKey={member.image}
          alt={`${member.name}, ${member.role} at Truth Care Group`}
          sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 90vw"
          className="h-full w-full object-cover object-top"
        />
      </div>

      <h3 className="mt-5 font-display text-[length:var(--text-h3)] font-semibold text-navy">
        {member.name}
      </h3>
      <p className="mt-1 font-semibold text-orange-text">{member.role}</p>

      {member.bio.split("\n\n").map((paragraph, index) => (
        <p key={`${member.name}-${index}`} className="mt-3 leading-relaxed text-muted">
          {paragraph}
        </p>
      ))}
    </article>
  );
}
