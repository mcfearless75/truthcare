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
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(bad, JSON.stringify(bad, null, 2)).toEqual([]);
  });
}
