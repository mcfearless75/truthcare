import { test, expect } from "@playwright/test";

test.describe("accessibility controls", () => {
  test("text size toggle scales root font-size and persists across Link navigation, but resets on reload", async ({
    page,
  }) => {
    await page.goto("/");

    const normalSize = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize)
    );

    await page.getByRole("button", { name: /switch to large text size/i }).click();

    const largeSize = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize)
    );
    expect(largeSize).toBeGreaterThan(normalSize);
    await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");

    // Persists across client-side Link navigation (root layout doesn't remount).
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Our Team" }).click();
    await expect(page).toHaveURL(/\/our-team$/);
    await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");

    // Resets on a hard reload — no storage, by design.
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-text-size", "normal");
  });

  test("motion toggle sets data-motion and Reveal content stays visible without a transition", async ({
    page,
  }) => {
    await page.goto("/who-we-support");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "normal");

    await page.getByRole("button", { name: /turn off animation/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

    const transitionDuration = await page
      .locator(".reveal")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(transitionDuration).toBe("0s");

    await page.getByRole("button", { name: /turn animation back on/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "normal");
  });

  test("neither control writes a cookie or any local/session storage", async ({ page, context }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /switch to large text size/i }).click();
    await page.getByRole("button", { name: /turn off animation/i }).click();

    const cookies = await context.cookies();
    expect(cookies).toEqual([]);

    const storage = await page.evaluate(() => ({
      localStorage: window.localStorage.length,
      sessionStorage: window.sessionStorage.length,
    }));
    expect(storage.localStorage).toBe(0);
    expect(storage.sessionStorage).toBe(0);
  });

  test("no horizontal overflow at 1201px, before or after enabling large text (regression guard for the header-overflow bug)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1201, height: 800 });
    await page.goto("/");

    const noOverflow = () =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth
      );

    expect(await noOverflow()).toBe(true);

    await page.getByRole("button", { name: /switch to large text size/i }).click();
    await expect(page.locator("html")).toHaveAttribute("data-text-size", "large");

    expect(await noOverflow()).toBe(true);
  });
});
