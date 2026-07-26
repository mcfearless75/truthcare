import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  "/",
  "/services-facilities",
  "/virtual-tour",
  "/who-we-support",
  "/our-team",
  "/contact-us",
];

for (const path of PAGES) {
  test(`${path} has no serious/critical axe violations`, async ({ page }) => {
    await page.goto(path);
    // Reveal fades content in over 700ms via an IntersectionObserver; scanning
    // mid-transition catches text at partial opacity, which axe reports as a
    // (spurious) contrast failure against the settled colour. Below-the-fold
    // .reveal sections are *meant* to stay at opacity 0 until scrolled into
    // view, so only wait for sections already in the viewport on load.
    await page.waitForFunction(() => {
      const vh = window.innerHeight;
      const onScreen = Array.from(document.querySelectorAll(".reveal")).filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top < vh && rect.bottom > 0;
      });
      return onScreen.every((el) => parseFloat(getComputedStyle(el).opacity) >= 0.99);
    });
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });
}
