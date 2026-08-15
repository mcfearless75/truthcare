"use client";
import { useAccessibility } from "./AccessibilityContext";

/**
 * Two real, working controls — not a decorative widget or third-party
 * overlay. See
 * docs/superpowers/specs/2026-08-14-sensitive-interactive-experience-design.md
 * §2 for why real controls were chosen over a statement-only approach.
 */
export function AccessibilityControls() {
  const { textSize, motion, setTextSize, setMotion } = useAccessibility();

  return (
    <div className="flex items-center gap-1 text-sm">
      <button
        type="button"
        onClick={() => setTextSize(textSize === "normal" ? "large" : "normal")}
        aria-pressed={textSize === "large"}
        aria-label={textSize === "large" ? "Aa — switch to normal text size" : "Aa — switch to large text size"}
        className="isolate rounded-[9999px] px-3 py-1.5 font-semibold text-navy transition-colors duration-200 hover:bg-navy/5"
      >
        Aa
      </button>
      <button
        type="button"
        onClick={() => setMotion(motion === "normal" ? "reduced" : "normal")}
        aria-pressed={motion === "reduced"}
        aria-label={motion === "reduced" ? "Motion off — turn animation back on" : "Motion on — turn off animation"}
        className="isolate rounded-[9999px] px-3 py-1.5 font-semibold text-navy transition-colors duration-200 hover:bg-navy/5"
      >
        {motion === "reduced" ? "Motion off" : "Motion on"}
      </button>
    </div>
  );
}
