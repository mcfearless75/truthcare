import { Pic } from "./Pic";
import { IMAGES } from "@/lib/images";
import type { TeamMember } from "@/content/types";

/**
 * Most headshots in the manifest are conventional portrait crops (roughly
 * 0.65-0.78 width:height) and sit comfortably in a 3:4 box. team-alison-woods
 * is a near-square 615x640 source (aspect 0.96) and only has a 480w render —
 * forcing it into the standard 3:4 box would crop ~20% off each side. A
 * near-square box keeps that crop to a few percent, top and bottom only.
 * Driven by the manifest's real aspect data so any future near-square
 * headshot gets the same gentler treatment automatically.
 */
function boxAspectClass(imageKey: string): string {
  const aspect = IMAGES[imageKey]?.aspect ?? 0.75;
  return aspect >= 0.85 ? "aspect-square" : "aspect-[3/4]";
}

export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <article className="flex flex-col">
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
