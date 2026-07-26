import { test, expect } from "@playwright/test";

const ALL_PAGES = [
  "/",
  "/services-facilities",
  "/virtual-tour",
  "/who-we-support",
  "/our-team",
  "/contact-us",
  "/privacy-policy",
  "/cookie-policy",
];

test("sitewide MedicalBusiness/LocalBusiness JSON-LD parses", async ({ page }) => {
  await page.goto("/");
  const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(scripts.length).toBeGreaterThan(0);

  const parsed = scripts.map((s) => JSON.parse(s));
  const business = parsed.find((d) => d["@type"] === "MedicalBusiness");

  expect(business).toBeTruthy();
  expect(business["@context"]).toBe("https://schema.org");
  expect(business.name).toBe("Truth Care Group");
  expect(business.address.postalCode).toBe("BS23 1YE");
  expect(business.address.addressCountry).toBe("GB");
});

test("tall Reveal sections become visible after scrolling into view (regression)", async ({ page }) => {
  // Previously, Reveal used a ratio-based IntersectionObserver threshold that
  // never fired for elements taller than ~6.7x the viewport, leaving them at
  // opacity: 0 forever. The six-card team grid on /our-team is exactly that
  // shape and is the section the fix (Reveal.tsx: threshold 0 + rootMargin
  // -10% bottom) was written for.
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/our-team");

  const teamGridReveal = page.locator(".reveal").filter({ hasText: "Dr Kumi Pillay" });
  await expect(teamGridReveal).toHaveCount(1);

  // Confirm the regression scenario actually applies here: the section must
  // be taller than the viewport, or this test would pass even with the old
  // buggy threshold.
  const box = await teamGridReveal.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThan(720);

  await teamGridReveal.scrollIntoViewIfNeeded();
  await expect(teamGridReveal).toHaveClass(/is-visible/);
  await expect(teamGridReveal).toHaveCSS("opacity", "1");
});

for (const path of ALL_PAGES) {
  test(`${path} sets no cookies and writes no local/session storage`, async ({ page, context }) => {
    await page.goto(path);
    // Give any deferred/async script a moment to run before we assert on the
    // absence of side effects, without relying on a fixed timeout to decide
    // pass/fail — the page's own load + hydration is the wait condition.
    await page.waitForLoadState("networkidle");

    const cookies = await context.cookies();
    expect(cookies).toEqual([]);

    const storage = await page.evaluate(() => ({
      localStorage: window.localStorage.length,
      sessionStorage: window.sessionStorage.length,
    }));
    expect(storage.localStorage).toBe(0);
    expect(storage.sessionStorage).toBe(0);
  });
}
