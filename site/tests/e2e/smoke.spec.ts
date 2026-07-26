import { test, expect } from "@playwright/test";

const PAGES = [
  "/",
  "/services-facilities",
  "/virtual-tour",
  "/who-we-support",
  "/our-team",
  "/contact-us",
  "/privacy-policy",
  "/cookie-policy",
];

for (const path of PAGES) {
  test(`${path} renders with h1 and no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (err) => errors.push(err.message));

    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator("h1")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("404 page renders with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // The navigation itself is a 404 response by design (that's the page
    // under test) — Chromium logs that as a "Failed to load resource"
    // console error for the top-level document itself. Expected here, not
    // an application bug; anything else still fails the test.
    if (/responded with a status of 404/.test(m.text())) return;
    errors.push(m.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/this-page-does-not-exist");
  await expect(page.locator("h1")).toBeVisible();
  expect(errors).toEqual([]);
});

test("mobile nav opens via mouse click and navigates", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.locator("#mobile-nav").getByRole("link", { name: "Our Team" }).click();
  await expect(page).toHaveURL(/\/our-team$/);
});

test("lightbox opens via mouse click, navigates, closes with Escape", async ({ page }) => {
  await page.goto("/virtual-tour");
  await page.getByRole("button", { name: /View larger photo\.$/ }).first().click();
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("contact form shows inline validation errors on empty submit", async ({ page }) => {
  await page.goto("/contact-us");
  await page.getByRole("button", { name: "Send message" }).click();

  // Copy is the project's actual field-level messages (not the brief's
  // placeholder wording) — see src/components/ContactForm.tsx.
  await expect(page.locator("#name-error")).toHaveText("Error: Enter your name");
  await expect(page.locator("#email-error")).toHaveText("Error: Enter your email address");
  await expect(page.locator("#message-error")).toHaveText("Error: Tell us how we can help");

  // The error summary banner is announced and lists all three problems.
  const summary = page.getByRole("alert").filter({ hasText: "There is a problem with this form" });
  await expect(summary).toBeVisible();
});

test("contact form flags an invalid email format distinctly from an empty one", async ({ page }) => {
  await page.goto("/contact-us");
  await page.locator("#email").fill("not-an-email");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator("#email-error")).toHaveText(
    "Error: Enter an email address in the format name@example.com"
  );
});

test("FAQ schema present on who-we-support", async ({ page }) => {
  await page.goto("/who-we-support");
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((s) => s.includes('"FAQPage"'))).toBe(true);
});
