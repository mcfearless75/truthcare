"use client";
import { useEffect, useState } from "react";

interface DayProgressItem {
  id: string;
  label: string;
}

const ITEMS: DayProgressItem[] = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
];

/**
 * A sticky, desktop-only side rail marking which band of
 * /a-day-at-beaconsfield is in view — three dots, not a literal
 * scroll-percentage bar. Reuses the same IntersectionObserver approach as
 * Reveal.tsx rather than adding a new dependency, but unlike Reveal (which
 * only ever needs to fire once and then disconnects) this keeps observing,
 * since it needs to track the visitor scrolling back and forth between
 * bands, not just a one-time reveal.
 *
 * aria-hidden: this is a supplementary visual affordance, not a navigation
 * landmark — the bands themselves are in normal document order and reachable
 * without it, so it doesn't need to be announced or focusable.
 */
export function DayProgress() {
  const [activeId, setActiveId] = useState(ITEMS[0].id);

  useEffect(() => {
    const observers = ITEMS.map(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { threshold: 0, rootMargin: "-45% 0px -45% 0px" }
      );
      io.observe(el);
      return io;
    });
    return () => observers.forEach((io) => io?.disconnect());
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed left-8 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-4 lg:flex"
    >
      {ITEMS.map((item) => (
        <span
          key={item.id}
          className={`isolate h-2.5 w-2.5 rounded-[9999px] border-2 transition-colors duration-300 ${
            activeId === item.id ? "border-orange bg-orange" : "border-navy/30 bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}
