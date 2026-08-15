"use client";
import { createContext, useContext, useEffect, useState } from "react";

type TextSize = "normal" | "large";
type Motion = "normal" | "reduced";

interface AccessibilityState {
  textSize: TextSize;
  motion: Motion;
  setTextSize: (size: TextSize) => void;
  setMotion: (motion: Motion) => void;
}

const AccessibilityContext = createContext<AccessibilityState | null>(null);

/**
 * In-memory only — no cookies, no localStorage, no sessionStorage. See
 * docs/superpowers/specs/2026-08-14-sensitive-interactive-experience-design.md
 * §2 for why: the site has an existing, tested commitment
 * (tests/e2e/regression.spec.ts) to set nothing client-side, stated publicly
 * in content/legal.ts's COOKIES page. Mounted once in the root layout
 * (layout.tsx), so state survives Next.js's client-side <Link> navigation
 * between pages — the layout doesn't remount on route change — but resets on
 * a hard reload or a new tab. That's an accepted, honest tradeoff, not a bug.
 */
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSize] = useState<TextSize>("normal");
  const [motion, setMotion] = useState<Motion>("normal");

  useEffect(() => {
    document.documentElement.setAttribute("data-text-size", textSize);
  }, [textSize]);

  useEffect(() => {
    document.documentElement.setAttribute("data-motion", motion);
  }, [motion]);

  return (
    <AccessibilityContext.Provider value={{ textSize, motion, setTextSize, setMotion }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityState {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return ctx;
}
