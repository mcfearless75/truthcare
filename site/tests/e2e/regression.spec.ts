import { test, expect, type Page } from "@playwright/test";

const ALL_PAGES = [
  "/",
  "/services-facilities",
  "/virtual-tour",
  "/a-day-at-beaconsfield",
  "/who-we-support",
  "/our-team",
  "/reviews",
  "/contact-us",
  "/privacy-policy",
  "/cookie-policy",
  "/accessibility",
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

/**
 * The site's compliance position is that it sets nothing and calls nobody:
 * the cookie policy says so and there is deliberately no consent banner. The
 * loop below is what holds that true page by page — and since /virtual-tour
 * gained a third-party Giraffe360 tour, its entry in this loop is also the
 * proof that the click-to-load facade works. If someone changes TourEmbed to
 * render the iframe on page view, this is the test that should go red.
 */
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

test.describe("virtual tour click-to-load facade", () => {
  const TOUR_HOST = /giraffe360\.com/;

  /**
   * Never let a test run reach Giraffe360. Aborting means the assertions
   * below are about *our* markup and *our* request behaviour, and they cannot
   * fail (or hang) because a third party is slow or down. `page.route` still
   * sees the request, which is exactly what we want to assert on.
   */
  async function blockTourHost(page: Page) {
    await page.route("**://*.giraffe360.com/**", (route) => route.abort());
  }

  test("no request reaches giraffe360.com until the tour is activated", async ({ page }) => {
    await blockTourHost(page);

    const tourRequests: string[] = [];
    page.on("request", (request) => {
      if (TOUR_HOST.test(request.url())) tourRequests.push(request.url());
    });

    await page.goto("/virtual-tour");
    await page.waitForLoadState("networkidle");

    // The load-bearing assertion. Nothing at all — not the iframe, not a
    // preconnect, not a prefetch — may touch the third party on page view.
    expect(tourRequests).toEqual([]);
    // Belt and braces: no element in the document points a fetching attribute
    // at the host either. (The URL does appear once in the RSC payload, as a
    // prop of the client component that will one day use it — that is inert
    // text in a script tag, not a request, and the assertion above is what
    // proves it stays inert.)
    const fetchingReferences = await page
      .locator('iframe, link[href*="giraffe360"], script[src*="giraffe360"], img[src*="giraffe360"]')
      .count();
    expect(fetchingReferences).toBe(0);

    await page.getByRole("button", { name: "Start the virtual tour" }).click();

    const iframe = page.locator('iframe[title="360° virtual tour of Beaconsfield House"]');
    await expect(iframe).toHaveCount(1);
    await expect
      .poll(() => tourRequests.length, { message: "activation should reach giraffe360.com" })
      .toBeGreaterThan(0);
  });

  test("tour iframe is absent on load and present after activation, with the right attributes", async ({
    page,
  }) => {
    await blockTourHost(page);
    await page.goto("/virtual-tour");

    await expect(page.locator("iframe")).toHaveCount(0);

    const activate = page.getByRole("button", { name: "Start the virtual tour" });
    await expect(activate).toBeVisible();
    // Tap target: the facade's control must clear the 24px minimum comfortably.
    const box = await activate.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);

    await activate.click();

    const iframe = page.locator("iframe");
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute("title", "360° virtual tour of Beaconsfield House");
    await expect(iframe).toHaveAttribute("allow", "fullscreen");
    await expect(iframe).toHaveAttribute("loading", "lazy");
    await expect(iframe).toHaveAttribute(
      "src",
      "https://tour.giraffe360.com/da17e336b14a4da2900293ab947ccedf/"
    );

    // The facade is gone, so there is no second control to confuse anyone.
    await expect(activate).toHaveCount(0);
  });
});
