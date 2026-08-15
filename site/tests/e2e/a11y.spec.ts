import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  "/",
  "/services-facilities",
  "/virtual-tour",
  "/a-day-at-beaconsfield",
  "/who-we-support",
  "/our-team",
  "/reviews",
  "/contact-us",
  "/accessibility",
];

for (const path of PAGES) {
  test(`${path} has no serious/critical axe violations`, async ({ page }) => {
    await page.goto(path);
    // Reveal fades content in over 700ms via an IntersectionObserver; scanning
    // mid-transition catches text at partial opacity, which axe reports as a
    // (spurious) contrast failure against the settled colour. Elements that
    // haven't started revealing yet are untouched — they're legitimately at
    // opacity 0 pending scroll, and axe doesn't flag invisible text. Geometric
    // viewport-bounds checks are deliberately avoided here: Reveal's own
    // IntersectionObserver uses a -10% rootMargin, stricter than a raw
    // "is it on screen" check, so an element barely visible at the bottom edge
    // could pass a viewport check without ever being marked is-visible,
    // hanging this wait forever. Only wait on elements already mid-transition.
    await page.waitForFunction(() =>
      Array.from(document.querySelectorAll(".reveal")).every((el) => {
        const started = el.classList.contains("is-visible");
        return !started || parseFloat(getComputedStyle(el).opacity) >= 0.99;
      })
    );
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });
}
