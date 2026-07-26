"use client";
import { useEffect, useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
}

export function Reveal({ children, className = "" }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // threshold: 0 + a negative bottom rootMargin fires as soon as the
    // element's top edge crosses ~90% down the viewport, regardless of how
    // tall the element is. A ratio-based threshold (e.g. 0.15) never fires
    // for elements taller than ~6.7x the viewport height, leaving them
    // permanently at opacity: 0 for JS-enabled users.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
