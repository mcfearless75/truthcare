import { test, expect, type Locator } from "@playwright/test";

/**
 * These four specs cover the questions no prior automated browser session
 * could actually answer: synthetic keyboard events dispatched by that tool
 * never fired a native `click` on a `<button>`/`<summary>`. Playwright's
 * `keyboard.press` dispatches real, trusted key events through CDP, so it can
 * finally prove (or disprove) that Enter/Space activation works.
 *
 * Do not "fix" a failure here by loosening the assertion — a failure means
 * the site is not keyboard-operable, which is the exact defect this suite
 * exists to catch.
 */

async function isDetailsOpen(details: Locator): Promise<boolean> {
  return details.evaluate((el) => (el as HTMLDetailsElement).open);
}

test.describe("keyboard activation", () => {
  test("mobile nav toggle opens via Enter and closes again via Enter", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.focus();
    await expect(toggle).toBeFocused();

    await page.keyboard.press("Enter");
    const nav = page.locator("#mobile-nav");
    await expect(nav).toBeVisible();
    await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();

    // Same physical element, now announcing as "Close menu" — press Enter
    // again to confirm it also closes, not just opens.
    await page.keyboard.press("Enter");
    await expect(nav).toBeHidden();
    await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
  });

  test("mobile nav toggle opens via Space", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    const toggle = page.getByRole("button", { name: "Open menu" });
    await toggle.focus();
    await page.keyboard.press("Space");

    await expect(page.locator("#mobile-nav")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close menu" })).toBeFocused();

    await page.keyboard.press("Space");
    await expect(page.locator("#mobile-nav")).toBeHidden();
  });

  test("gallery lightbox opens via Enter after tabbing to a thumbnail, navigates with arrow keys, closes with Escape, and returns focus to the trigger", async ({
    page,
  }) => {
    await page.goto("/virtual-tour");

    // The last focusable element before the page's own content is the
    // header's brochure button — it sits right after the nav, outside the
    // nav landmark, so "Contact Us" (the nav's last link) is one Tab short
    // of the page content now. Since the virtual tour became a real
    // Giraffe360 embed there are exactly two interactive elements between
    // "Contact Us" and the gallery — the brochure button, then the tour's
    // click-to-load button — so it takes three real Tab presses to reach
    // the first thumbnail. Asserting each intermediate stop keeps this
    // honest: if another control is added above the gallery, this fails
    // rather than silently drifting.
    const lastNavLink = page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Contact Us" })
      .first();
    await lastNavLink.focus();

    // exact: true — the footer's own brochure link ("Download our brochure
    // (PDF)") also contains the substring "Brochure" and would otherwise
    // match too.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Brochure", exact: true })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Start the virtual tour" })).toBeFocused();

    await page.keyboard.press("Tab");
    const firstThumbnail = page.getByRole("button", { name: /View larger photo\.$/ }).first();
    await expect(firstThumbnail).toBeFocused();

    await page.keyboard.press("Enter");
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();

    const firstCaption = await dialog.locator("figcaption").textContent();
    await page.keyboard.press("ArrowRight");
    await expect(dialog.locator("figcaption")).not.toHaveText(firstCaption ?? "");

    const secondCaption = await dialog.locator("figcaption").textContent();
    await page.keyboard.press("ArrowLeft");
    await expect(dialog.locator("figcaption")).toHaveText(firstCaption ?? "");
    expect(secondCaption).not.toEqual(firstCaption);

    await page.keyboard.press("Escape");
    await expect(page.locator("dialog[open]")).toHaveCount(0);

    // The open question this project could never verify with a synthetic
    // browser: does focus actually return to the thumbnail that opened it?
    await expect(firstThumbnail).toBeFocused();
  });

  test("virtual tour loads via Enter on its click-to-load button", async ({ page }) => {
    // Never reach Giraffe360 from a test run — the point of this test is that
    // our button works, not that their tour renders.
    await page.route("**://*.giraffe360.com/**", (route) => route.abort());
    await page.goto("/virtual-tour");

    await expect(page.locator("iframe")).toHaveCount(0);

    const activate = page.getByRole("button", { name: "Start the virtual tour" });
    await activate.focus();
    await expect(activate).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page.locator("iframe")).toHaveCount(1);

    // Activation destroys the button that was focused. If nothing catches
    // focus it falls to <body> and the visitor's next Tab restarts at the top
    // of the page — so focus must land on the tour frame instead.
    await expect(page.locator("iframe").locator("xpath=..")).toBeFocused();
  });

  test("FAQ entries toggle open and closed via Enter on the summary", async ({ page }) => {
    await page.goto("/who-we-support");

    const details = page.locator("details").first();
    const summary = details.locator("summary");

    expect(await isDetailsOpen(details)).toBe(false);

    await summary.focus();
    await page.keyboard.press("Enter");
    await expect.poll(() => isDetailsOpen(details)).toBe(true);

    await page.keyboard.press("Enter");
    await expect.poll(() => isDetailsOpen(details)).toBe(false);
  });
});

test.describe("contact form keyboard traversal", () => {
  test("tab order reaches every field, skips the honeypot, and submit activates via keyboard", async ({
    page,
  }) => {
    // Never hit the live Formspree endpoint from a test run.
    await page.route("https://formspree.io/f/xzdnklod", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/contact-us");

    // The honeypot (`name="_gotcha"`, tabIndex -1, display:none) sits between
    // the brochure download link and the name field in document order — the
    // only way to prove it is really skipped is to tab in from right before it.
    // `.first()`: the footer repeats the phone number as its own tel: link,
    // but it sits after <main> in the DOM, so it isn't this one.
    const phoneLink = page.locator('a[href^="tel:"]').first();
    await phoneLink.focus();
    await expect(phoneLink).toBeFocused();

    // The brochure download link is the last item in the contact details
    // list, right after phone. `.first()`: the footer repeats the same link
    // text, but it sits after <main> in the DOM, so it isn't this one.
    await page.keyboard.press("Tab");
    const brochureLink = page.getByRole("link", { name: /download our brochure/i }).first();
    await expect(brochureLink).toBeFocused();

    await page.keyboard.press("Tab");
    const nameInput = page.locator("#name");
    await expect(nameInput).toBeFocused();
    await page.keyboard.type("Jordan Test");

    await page.keyboard.press("Tab");
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeFocused();
    await page.keyboard.type("jordan@example.com");

    await page.keyboard.press("Tab");
    await expect(page.locator("#phone")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.locator("#enquiry_type")).toBeFocused();

    await page.keyboard.press("Tab");
    const messageInput = page.locator("#message");
    await expect(messageInput).toBeFocused();
    await page.keyboard.type("Testing keyboard-only traversal of this form.");

    await page.keyboard.press("Tab");
    const submitButton = page.getByRole("button", { name: "Send message" });
    await expect(submitButton).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(
      page.getByText("Thank you — we have received your message.")
    ).toBeVisible();
  });
});
