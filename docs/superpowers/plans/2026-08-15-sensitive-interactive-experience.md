# Sensitive, Touching, Interactive Experience — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the design-only pass from `docs/superpowers/specs/2026-08-14-sensitive-interactive-experience-design.md` — real (in-memory, storage-free) text-size and reduced-motion accessibility controls with a companion statement page, a testimonial layout that leads with the subject's own words, and a new "A Day at Beaconsfield House" page built entirely from existing photos and already-approved copy.

**Architecture:** All work happens inside `site/` (Next.js App Router, `output: "export"`, Tailwind v4). Accessibility state lives in a single React Context mounted once in the root layout — no cookies, no localStorage, no sessionStorage, matching the site's existing tested commitment. Everything else is presentation-layer changes to existing components plus two new static pages, following established patterns (`LegalProse`/`content/legal.ts` for the accessibility statement, `Reveal`/`Pic`/`SectionHeading` for the new day page).

**Tech Stack:** Next.js 16 (App Router, static export), React 19, Tailwind CSS v4, TypeScript, Playwright (`@playwright/test`, `@axe-core/playwright`) for e2e tests. No new dependencies at any point in this plan.

## Global Constraints

- **No cookies, no `localStorage`, no `sessionStorage` — anywhere, for any reason.** `tests/e2e/regression.spec.ts` asserts this sitewide and `content/legal.ts`'s `COOKIES` page states it as a public commitment ("no local storage or session storage, which are the other two places a site can leave data on your device"). The accessibility state MUST be in-memory React state only.
- **No invented factual claims about Beaconsfield House's routine, schedule, or activities.** The day-at-Beaconsfield page draws only from `content/support.ts`'s existing, already-approved copy — no specific times, meal names, or activities not already stated elsewhere on the site.
- **No new npm dependencies.** Every task below is buildable with what's already in `site/package.json`.
- **Match existing code conventions exactly:** Tailwind class ordering/style as seen in the files being edited, `rounded-[9999px]` (not `rounded-full`) and `isolate` on any interactive element that sits under the header's `backdrop-blur`, comments explaining non-obvious "why" decisions the way the rest of the codebase does.
- All commands below run from `site/` (i.e. `C:\Users\LAPTOP80\Projects\truthcare\site` / `cd site` from the repo root) unless stated otherwise.
- Every task ends with a commit. Follow the existing commit message style (short summary line, blank line, explanatory body) — see recent commits with `git log --oneline -10` if unsure.
- After the final task, deploy with `vercel deploy --prod --yes` from `site/` — this project has **no GitHub integration**, so `git push` alone does not deploy it (confirmed earlier this session).

---

### Task 1: Accessibility Context (in-memory, no storage)

**Files:**
- Create: `site/src/components/AccessibilityContext.tsx`

**Interfaces:**
- Produces: `AccessibilityProvider({ children }: { children: React.ReactNode })` — a component; `useAccessibility()` — a hook returning `{ textSize: "normal" | "large", motion: "normal" | "reduced", setTextSize: (v: "normal" | "large") => void, setMotion: (v: "normal" | "reduced") => void }`. Later tasks import both from `@/components/AccessibilityContext`.

- [ ] **Step 1: Write the component**

Create `site/src/components/AccessibilityContext.tsx`:

```tsx
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
```

- [ ] **Step 2: Type-check it in isolation**

Run: `cd site && npx tsc --noEmit`
Expected: no errors mentioning `AccessibilityContext.tsx` (the file isn't imported anywhere yet, so this only checks its own internal types compile).

- [ ] **Step 3: Commit**

```bash
cd site
git add src/components/AccessibilityContext.tsx
git commit -m "feat(a11y): add in-memory AccessibilityContext (no storage)

Foundation for the text-size and reduced-motion controls. In-memory
React state only — no cookies, no localStorage, no sessionStorage —
per the site's existing tested commitment (tests/e2e/regression.spec.ts,
content/legal.ts COOKIES). State persists across client-side Link
navigation because the root layout doesn't remount, and resets on a
hard reload; not mounted into the tree yet, that's the next task."
```

---

### Task 2: `--text-scale` and `[data-motion]` CSS

**Files:**
- Modify: `site/src/app/globals.css`

**Interfaces:**
- Consumes: nothing (pure CSS).
- Produces: `html[data-text-size="large"]` scales all rem-based type sitewide via `--text-scale`; `:root[data-motion="reduced"]` disables transitions/animations and `.reveal` motion the same way `prefers-reduced-motion` already does. Later tasks (3, 9) rely on these attributes existing and being respected.

- [ ] **Step 1: Add the text-scale variable and rule**

In `site/src/app/globals.css`, immediately after the `@theme { ... }` block (after its closing `}` on line 29, before `html { scroll-behavior: smooth; }`), add:

```css
/*
 * Text size control. `--text-scale` defaults to 1 and is bumped by the
 * header's "Aa" toggle (AccessibilityControls.tsx) via a `data-text-size`
 * attribute on <html> — see AccessibilityContext.tsx. Scaling the root
 * font-size percentage scales every rem-based size sitewide (Tailwind's own
 * utilities and this file's clamp()-based --text-hero/--text-lede/etc. are
 * all rem-based), so this one rule is enough — no per-component overrides
 * needed.
 */
:root {
  --text-scale: 1;
}
html[data-text-size="large"] {
  --text-scale: 1.15;
}
```

Then change the existing `html { scroll-behavior: smooth; }` rule (currently line 31-33) to also apply the scale:

```css
html {
  scroll-behavior: smooth;
  font-size: calc(100% * var(--text-scale));
}
```

- [ ] **Step 2: Add the `[data-motion="reduced"]` rules, mirroring the existing `prefers-reduced-motion` block**

Find the existing block at the end of the file:

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

Immediately after it, add an attribute-selector equivalent so the explicit in-page toggle has the same effect as the OS setting:

```css
/*
 * Same effect as the prefers-reduced-motion block above, triggered by the
 * header's explicit "Motion" toggle instead of (or as well as) the OS
 * setting — both are respected independently, either can request reduced
 * motion. See AccessibilityContext.tsx.
 */
html[data-motion="reduced"] {
  scroll-behavior: auto;
}
html[data-motion="reduced"] *,
html[data-motion="reduced"] *::before,
html[data-motion="reduced"] *::after {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
```

Then find the reveal-specific reduced-motion rule:

```css
@media (prefers-reduced-motion: reduce) {
  .js .reveal { opacity: 1; transform: none; transition: none; }
}
```

Immediately after it, add:

```css
html[data-motion="reduced"] .js .reveal {
  opacity: 1;
  transform: none;
  transition: none;
}
```

- [ ] **Step 3: Verify the full file is valid CSS**

Run: `cd site && npm run build`
Expected: build succeeds (Tailwind/PostCSS would fail the build on invalid CSS syntax — a clean build is the verification here, since there's no standalone CSS linter in this project).

- [ ] **Step 4: Commit**

```bash
cd site
git add src/app/globals.css
git commit -m "feat(a11y): add --text-scale and [data-motion] CSS rules

html[data-text-size=\"large\"] bumps --text-scale, scaling every
rem-based size sitewide via html { font-size }. html[data-motion=
\"reduced\"] mirrors the existing prefers-reduced-motion block exactly,
so the explicit header toggle (next task) has identical effect to the
OS setting — both respected independently."
```

---

### Task 3: `AccessibilityControls` component, mounted in header and layout

**Files:**
- Create: `site/src/components/AccessibilityControls.tsx`
- Modify: `site/src/app/layout.tsx`
- Modify: `site/src/components/SiteHeader.tsx`
- Test: `site/tests/e2e/accessibility-controls.spec.ts`

**Interfaces:**
- Consumes: `AccessibilityProvider`, `useAccessibility` from `@/components/AccessibilityContext` (Task 1); `--text-scale`/`[data-motion]` CSS from Task 2.
- Produces: `<AccessibilityControls />` — a component rendered in `SiteHeader.tsx`'s desktop nav group and mobile nav panel. No exports consumed by later tasks.

- [ ] **Step 1: Write the failing test**

Create `site/tests/e2e/accessibility-controls.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

test.describe("accessibility controls", () => {
  test("text size toggle scales root font-size and persists across Link navigation, but resets on reload", async ({
    page,
  }) => {
    await page.goto("/");

    const normalSize = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize)
    );

    await page.getByRole("button", { name: "Switch to large text size" }).click();

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

    await page.getByRole("button", { name: "Turn off animation" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");

    const transitionDuration = await page
      .locator(".reveal")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(transitionDuration).toBe("0s");

    await page.getByRole("button", { name: "Turn animation back on" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-motion", "normal");
  });

  test("neither control writes a cookie or any local/session storage", async ({ page, context }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Switch to large text size" }).click();
    await page.getByRole("button", { name: "Turn off animation" }).click();

    const cookies = await context.cookies();
    expect(cookies).toEqual([]);

    const storage = await page.evaluate(() => ({
      localStorage: window.localStorage.length,
      sessionStorage: window.sessionStorage.length,
    }));
    expect(storage.localStorage).toBe(0);
    expect(storage.sessionStorage).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `cd site && npm run build && npx playwright test tests/e2e/accessibility-controls.spec.ts`
Expected: FAIL — `getByRole("button", { name: "Switch to large text size" })` finds no element, since `AccessibilityControls` doesn't exist yet.

- [ ] **Step 3: Write the component**

Create `site/src/components/AccessibilityControls.tsx`:

```tsx
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
        aria-label={textSize === "large" ? "Switch to normal text size" : "Switch to large text size"}
        className="isolate rounded-[9999px] px-3 py-1.5 font-semibold text-navy transition-colors duration-200 hover:bg-navy/5"
      >
        Aa
      </button>
      <button
        type="button"
        onClick={() => setMotion(motion === "normal" ? "reduced" : "normal")}
        aria-pressed={motion === "reduced"}
        aria-label={motion === "reduced" ? "Turn animation back on" : "Turn off animation"}
        className="isolate rounded-[9999px] px-3 py-1.5 font-semibold text-navy transition-colors duration-200 hover:bg-navy/5"
      >
        {motion === "reduced" ? "Motion off" : "Motion on"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Mount the provider in the root layout**

In `site/src/app/layout.tsx`, add the import and wrap `{children}`. Change:

```tsx
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { withBasePath } from "@/lib/basePath";
```

to:

```tsx
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AccessibilityProvider } from "@/components/AccessibilityContext";
import { withBasePath } from "@/lib/basePath";
```

and change:

```tsx
      <body>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
```

to:

```tsx
      <body>
        <AccessibilityProvider>
          <SiteHeader />
          <main>{children}</main>
          <SiteFooter />
        </AccessibilityProvider>
```

(Leave the closing `</body>` and the JSON-LD `<script>` after it exactly where they are — only `SiteHeader`/`main`/`SiteFooter` move inside the new wrapper, since the provider only needs to reach the parts of the tree that read accessibility state.)

- [ ] **Step 5: Mount the controls in `SiteHeader.tsx`**

Add the import at the top of `site/src/components/SiteHeader.tsx`:

```tsx
import { withBasePath } from "@/lib/basePath";
import { SITE } from "@/lib/site";
import { AccessibilityControls } from "@/components/AccessibilityControls";
```

In the desktop nav group, insert `<AccessibilityControls />` between the closing `</nav>` and the divider `<span>`. Change:

```tsx
          </nav>

          <span aria-hidden="true" className="h-6 w-px bg-navy/15" />
```

to:

```tsx
          </nav>

          <AccessibilityControls />

          <span aria-hidden="true" className="h-6 w-px bg-navy/15" />
```

In the mobile nav panel, add it as its own row above the brochure link. Change:

```tsx
        <div className="border-t border-navy/10 px-5 py-4">
          <a
            href={withBasePath(SITE.brochureUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="isolate flex items-center justify-center gap-2 rounded-[9999px] border-2 border-navy px-4 py-3.5 text-lg font-semibold text-navy transition duration-200 hover:bg-navy hover:text-paper"
          >
```

to:

```tsx
        <div className="border-t border-navy/10 px-5 py-4">
          <div className="flex justify-center pb-4">
            <AccessibilityControls />
          </div>
          <a
            href={withBasePath(SITE.brochureUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="isolate flex items-center justify-center gap-2 rounded-[9999px] border-2 border-navy px-4 py-3.5 text-lg font-semibold text-navy transition duration-200 hover:bg-navy hover:text-paper"
          >
```

- [ ] **Step 6: Run the test again to confirm it passes**

Run: `cd site && npm run build && npx playwright test tests/e2e/accessibility-controls.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 7: Run the full existing e2e suite to check for regressions**

Run: `cd site && npx playwright test`
Expected: all existing suites still pass. Pay particular attention to `tests/e2e/keyboard.spec.ts`'s tab-order test on `/contact-us` (line ~168 onward) and `tests/e2e/regression.spec.ts`'s zero-storage loop — if either fails, it means the new controls disturbed tab order or wrote storage; fix before continuing, don't loosen the assertion.

- [ ] **Step 8: Commit**

```bash
cd site
git add src/components/AccessibilityControls.tsx src/app/layout.tsx src/components/SiteHeader.tsx tests/e2e/accessibility-controls.spec.ts
git commit -m "feat(a11y): add AccessibilityControls, mount in header and layout

Two real toggles (\"Aa\" text size, \"Motion on/off\") in both the
desktop nav group and the mobile nav panel, backed by the in-memory
AccessibilityContext from the previous two tasks. New Playwright spec
covers: font-size actually scales, state persists across Link
navigation and resets on reload, reduced motion disables Reveal's
transition, and neither control writes any cookie or storage."
```

---

### Task 4: Accessibility statement page

**Files:**
- Modify: `site/src/content/legal.ts`
- Create: `site/src/app/accessibility/page.tsx`
- Modify: `site/src/app/sitemap.ts`

**Interfaces:**
- Consumes: `LegalProse` component and `LegalPage` type (both already exist and are used by `/privacy-policy` and `/cookie-policy` — no changes needed to either).
- Produces: `ACCESSIBILITY: LegalPage` exported from `content/legal.ts`, consumed only by the new page in this task.

- [ ] **Step 1: Add the content**

In `site/src/content/legal.ts`, after the closing `};` of `COOKIES` (the last line of the file), add:

```ts

// New page, authored 2026-08-15 alongside the accessibility controls —
// separate UPDATED consts from PRIVACY/COOKIES above since this is a
// genuinely different last-reviewed date, not the same edit.
const UPDATED_ACCESSIBILITY = "15 August 2026";
const UPDATED_ACCESSIBILITY_ISO = "2026-08-15";

export const ACCESSIBILITY: LegalPage = {
  eyebrow: "Accessibility",
  heading: "Accessibility statement",
  intro:
    "This page describes what this website does to be usable by as many visitors as possible, and where it currently falls short.",
  updated: UPDATED_ACCESSIBILITY,
  updatedIso: UPDATED_ACCESSIBILITY_ISO,
  sections: [
    {
      heading: "What this site does",
      listIntro: "Specifically, this site has:",
      list: [
        "a text size control in the header (labelled \"Aa\") that switches to a larger type size across every page, for the current visit",
        "a motion control in the header that turns off scroll-triggered animation, on top of automatically respecting your device's own reduced-motion setting if you already have one turned on",
        "descriptive alt text on every photograph, written for the specific photo rather than a generic caption",
        "a single, logical heading structure on every page",
        "full keyboard operability, including the photo gallery, the FAQ accordion and the mobile menu",
      ],
    },
    {
      heading: "What it doesn't do yet",
      paragraphs: [
        "There is no high-contrast colour mode yet. If this site's colours are hard to read, your browser or operating system's own contrast tools will work here — we have not blocked or overridden them.",
      ],
    },
    {
      heading: "How the text size and motion controls work",
      paragraphs: [
        "Neither control stores anything on your device — no cookies, no local storage — in keeping with this site's cookie policy. That means your choice applies as you move between pages during a visit, and resets if you reload the page or come back later.",
      ],
    },
    {
      heading: "Tell us about a problem",
      paragraphs: [
        "If you hit a barrier using this site that isn't listed here, let us know at info@truthcaregroup.co.uk and we'll do what we can to fix it.",
      ],
    },
  ],
};
```

- [ ] **Step 2: Write the page component**

Create `site/src/app/accessibility/page.tsx`:

```tsx
import type { Metadata } from "next";
import { ACCESSIBILITY } from "@/content/legal";
import { LegalProse } from "@/components/LegalProse";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How truthcaregroup.co.uk supports accessible browsing — text size and motion controls, descriptive alt text and full keyboard operability — and what isn't built yet.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return <LegalProse page={ACCESSIBILITY} related={{ href: "/contact-us", label: "our contact page" }} />;
}
```

- [ ] **Step 3: Add the route to the sitemap**

In `site/src/app/sitemap.ts`, add `"/accessibility"` to the `ROUTES` array. Change:

```ts
const ROUTES = [
  "",
  "/services-facilities",
  "/virtual-tour",
  "/who-we-support",
  "/our-team",
  "/reviews",
  "/contact-us",
  "/privacy-policy",
  "/cookie-policy",
] as const;
```

to:

```ts
const ROUTES = [
  "",
  "/services-facilities",
  "/virtual-tour",
  "/who-we-support",
  "/our-team",
  "/reviews",
  "/contact-us",
  "/privacy-policy",
  "/cookie-policy",
  "/accessibility",
] as const;
```

- [ ] **Step 4: Build and check the page renders**

Run: `cd site && npm run build`
Expected: `/accessibility` appears in the route list in the build output, build succeeds.

- [ ] **Step 5: Commit**

```bash
cd site
git add src/content/legal.ts src/app/accessibility/page.tsx src/app/sitemap.ts
git commit -m "feat(a11y): add /accessibility statement page

Reuses the existing LegalProse/content/legal.ts pattern already used
by /privacy-policy and /cookie-policy. States what the site does
(text size + motion controls, alt text, heading structure, keyboard
operability) and is honest about what it doesn't (no high-contrast
mode yet) — the Scope-inspired pattern from the design research:
disclose gaps rather than claim full compliance."
```

---

### Task 5: Testimonial headline treatment

**Files:**
- Modify: `site/src/components/TestimonialQuote.tsx`
- Modify: `site/src/app/reviews/page.tsx`

**Interfaces:**
- Consumes: `Testimonial` type from `@/content/types` (already has `excerpt` field, no change needed).
- Produces: `TestimonialQuote` now requires an `excerpt` prop in addition to the existing `quote`/`attribution`/`source`/`rating`. This is a breaking change to its prop signature — the only other call site is checked and updated in this same task.

- [ ] **Step 1: Check for other call sites**

Run: `cd site && grep -rn "TestimonialQuote" src/`
Expected: two matches — the component definition in `src/components/TestimonialQuote.tsx`, and its one usage in `src/app/reviews/page.tsx`. (The homepage strip in `src/app/page.tsx` renders its own bespoke JSX using `Stars` directly, not `TestimonialQuote` — confirm this is still true; if a second usage exists, it needs the same `excerpt` prop added in this task too.)

- [ ] **Step 2: Update the component to take `excerpt` as the headline**

Replace the full contents of `site/src/components/TestimonialQuote.tsx`:

```tsx
interface TestimonialQuoteProps {
  /** The subject's own opening line — rendered as the visual headline, editorial pull-quote style. */
  excerpt: string;
  quote: string;
  attribution: string;
  /** Where the quote came from, e.g. "Google review". Omit for direct submissions. */
  source?: string;
  /** Star rating out of 5, shown next to the source when both are given. */
  rating?: number;
}

/** Exported so the homepage's quieter review strip can reuse the same mark. */
export function Stars({ rating }: { rating: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-0.5 text-orange">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill={i < rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
          <path d="m12 2 2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3l-6.1 3.3 1.4-6.8-5.1-4.7 6.9-.8Z" strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

/**
 * Full testimonial as a standalone card. `excerpt` — the subject's own
 * opening line — is the visual headline (an editorial pull-quote), with the
 * full `quote` following underneath at normal body weight; the excerpt does
 * legitimately repeat as the opening of the full quote below it in the
 * family testimonial's case, and appears mid-quote in the Google review's
 * case — both are fine, this is the standard pull-quote convention, not a
 * duplication bug. See
 * docs/superpowers/specs/2026-08-14-sensitive-interactive-experience-design.md
 * §3 for why: the subject's own words carry the section, not a
 * charity-written header.
 */
export function TestimonialQuote({ excerpt, quote, attribution, source, rating }: TestimonialQuoteProps) {
  const paragraphs = quote.split("\n\n");

  return (
    <figure className="relative overflow-hidden rounded-[1.75rem] bg-paper p-8 shadow-navy-md ring-1 ring-navy/10 sm:p-12">
      <span aria-hidden="true" className="font-display text-6xl leading-none text-orange/40 sm:text-7xl">
        &ldquo;
      </span>
      <p className="-mt-4 font-display text-[length:var(--text-h3)] font-semibold leading-snug text-navy sm:-mt-6">
        {excerpt}
      </p>
      <blockquote className="mt-4 space-y-4 leading-relaxed text-navy/80">
        {paragraphs.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </blockquote>
      <figcaption className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold uppercase tracking-[0.14em] text-navy/70">
        <span aria-hidden="true" className="h-px w-8 bg-orange" />
        {attribution}
        {source ? (
          <>
            <span aria-hidden="true" className="text-navy/30">
              &middot;
            </span>
            <span className="normal-case tracking-normal text-navy/60">{source}</span>
          </>
        ) : (
          <>
            <span aria-hidden="true" className="text-navy/30">
              &middot;
            </span>
            <span className="normal-case tracking-normal text-navy/60">
              Shared with permission, in their own words
            </span>
          </>
        )}
        {rating && <Stars rating={rating} />}
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 3: Pass `excerpt` from the call site**

In `site/src/app/reviews/page.tsx`, change:

```tsx
                {REVIEWS.testimonials.map((testimonial) => (
                  <TestimonialQuote
                    key={testimonial.attribution}
                    quote={testimonial.quote}
                    attribution={testimonial.attribution}
                    source={testimonial.source}
                    rating={testimonial.rating}
                  />
                ))}
```

to:

```tsx
                {REVIEWS.testimonials.map((testimonial) => (
                  <TestimonialQuote
                    key={testimonial.attribution}
                    excerpt={testimonial.excerpt}
                    quote={testimonial.quote}
                    attribution={testimonial.attribution}
                    source={testimonial.source}
                    rating={testimonial.rating}
                  />
                ))}
```

- [ ] **Step 4: Demote "What families say" from a large heading to a small eyebrow**

Still in `site/src/app/reviews/page.tsx`, change:

```tsx
            <div className="mx-auto max-w-6xl px-5">
              <SectionHeading title={REVIEWS.testimonialsHeading} align="center" />
              <div className="mx-auto mt-12 max-w-3xl space-y-8">
```

to:

```tsx
            <div className="mx-auto max-w-6xl px-5">
              {/* A real <h2>, not a <p> — heading structure stays intact for
                  screen readers — but styled at eyebrow scale rather than
                  SectionHeading's large display size, so the testimonials'
                  own opening lines (rendered inside TestimonialQuote) are
                  the dominant visual heading, not this label. See
                  docs/superpowers/specs/2026-08-14-...-design.md §3. */}
              <h2 className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-orange-text">
                {REVIEWS.testimonialsHeading}
              </h2>
              <div className="mx-auto mt-12 max-w-3xl space-y-8">
```

Note: `SectionHeading` is still imported and used later in this same file (the "How it works" section) — do not remove the import.

- [ ] **Step 5: Build and run the axe accessibility scan**

Run: `cd site && npm run build && npx playwright test tests/e2e/a11y.spec.ts tests/e2e/smoke.spec.ts`
Expected: PASS. (`/reviews` isn't in either `PAGES` array yet — Task 7 adds it. This step is just confirming the build/existing pages aren't broken.)

- [ ] **Step 6: Confirm the homepage strip needs no change**

The spec (§3) names both `TestimonialQuote.tsx` and the homepage review strip as places this pattern applies. Check `site/src/app/page.tsx`'s "Reviews strip" section (search for `featuredReview` in that file): it already renders the excerpt as the dominant visual content — a large italic pull-quote with no competing charity-written header above it (no "Reviews" or "What families say" label exists there at all currently). It already satisfies the "own words carry the section" goal without any code change. Leave it as-is; do not add a redundant heading or duplicate the `TestimonialQuote` component's markup there.

- [ ] **Step 7: Manually verify in a browser**

Run: `cd site && npm run build && npx serve out -l 4173` (or use the project's existing preview workflow), then check `/reviews`:
- Both testimonial cards show the excerpt as a bold headline above the full quote
- The family testimonial's card shows "Shared with permission, in their own words"
- Trish T.'s card still shows "Google review" and 5 stars, unchanged
- "What families say" reads as a small orange label above the cards, not a large heading

- [ ] **Step 8: Commit**

```bash
cd site
git add src/components/TestimonialQuote.tsx src/app/reviews/page.tsx
git commit -m "feat(reviews): lead testimonials with the subject's own words

TestimonialQuote now renders excerpt as an editorial pull-quote
headline, with the full quote following at normal weight underneath —
the Headway pattern from the sensitive-sector research (lead with the
person's own sentence, not a charity-written summary). 'What families
say' demoted from a large SectionHeading to a small eyebrow-scale
<h2> so the testimonials' own words carry the section visually, while
keeping real heading semantics for screen readers. Family testimonial
(no source) now reads 'Shared with permission, in their own words'."
```

---

### Task 6: Day-at-Beaconsfield content

**Files:**
- Create: `site/src/content/dayAtBeaconsfield.ts`

**Interfaces:**
- Produces: `DAY_AT_BEACONSFIELD` object with shape `{ eyebrow, heading, intro, bands: { id, label, imageKey, alt, body }[], closing: { heading, body, cta: { label, href } } }`. Consumed by Task 7.

- [ ] **Step 1: Write the content file**

Create `site/src/content/dayAtBeaconsfield.ts`:

```ts
/**
 * Copy for /a-day-at-beaconsfield. Every `body` string below is composed
 * from phrases already approved and live elsewhere on the site — see the
 * matching item(s) in content/support.ts's SUPPORT.howWeHelp.list, named in
 * each comment. Deliberately NOT a timed schedule: Beaconsfield House is
 * CQC-regulated, and stating specific times, meals or named activities that
 * haven't been verified against actual practice would be a compliance risk,
 * not just a copywriting choice. Keep any future edits to this file broad
 * and impressionistic in the same way — see
 * docs/superpowers/specs/2026-08-14-sensitive-interactive-experience-design.md
 * §4 before adding anything more specific.
 */
export const DAY_AT_BEACONSFIELD = {
  eyebrow: "Take a Look Inside",
  heading: "A Day at Beaconsfield House",
  intro:
    "There's no single timetable here — every person's day is built around their own abilities, interests and goals. This is a sense of what that generally looks like, not a schedule.",
  bands: [
    {
      id: "morning",
      label: "Morning",
      imageKey: "beaconsfield-house-ensuite-bedroom-01",
      alt: "An en-suite bedroom at Beaconsfield House, with a made bed, wardrobe and natural light from the window.",
      // Draws on: "Personal care support delivered with dignity and
      // respect" + "Support with daily living skills (including cooking,
      // laundry and routines)"
      body: "Mornings start at each person's own pace, with personal care support delivered with dignity and respect, and daily living skills — including cooking, laundry and routines — built into each day as part of rehabilitation, not separate from it.",
    },
    {
      id: "afternoon",
      label: "Afternoon",
      imageKey: "lifestyle-group",
      alt: "A mixed group of adults, including a wheelchair user, talking and laughing together during a group session.",
      // Draws on: "Structured slow-stream rehabilitation aligned to
      // personalised goals" + "Cognitive and executive function support
      // (planning, memory, attention and problem-solving)" +
      // "Community-based rehabilitation to rebuild independence outside
      // the home"
      body: "Afternoons often mean structured, slow-stream rehabilitation aligned to each person's own goals — cognitive and executive function support alongside community-based rehabilitation that helps rebuild independence outside the home.",
    },
    {
      id: "evening",
      label: "Evening",
      imageKey: "beaconsfield-house-interior-lounge-wide",
      alt: "The main lounge at Beaconsfield House, with a large corner sofa, an upright piano and a dining table set in the bay window.",
      // Draws on: "Emotional well-being support and strategies for coping
      // and adjustment"
      body: "Evenings are unstructured time in the communal lounge — space for emotional wellbeing support and coping strategies, or simply time with family and the wider household.",
    },
  ],
  closing: {
    heading: "See the rest of the house",
    body: "This is one slice of what a day can hold. The full 360° tour shows every room mentioned here, and more.",
    cta: { label: "Take the Virtual Tour", href: "/virtual-tour" },
  },
} as const;
```

- [ ] **Step 2: Confirm the referenced image keys exist**

Run: `cd site && node -e "const d=require('./src/lib/images.json'); ['beaconsfield-house-ensuite-bedroom-01','lifestyle-group','beaconsfield-house-interior-lounge-wide'].forEach(k => { if (!d[k]) throw new Error('missing image key: ' + k); }); console.log('all image keys present');"`
Expected: `all image keys present`

- [ ] **Step 3: Commit**

```bash
cd site
git add src/content/dayAtBeaconsfield.ts
git commit -m "feat(day-in-life): add content for /a-day-at-beaconsfield

Three bands (Morning/Afternoon/Evening), each composed from phrases
already approved in content/support.ts's howWeHelp list — no invented
times, meals or named activities, per the compliance constraint in
the design spec. Page component follows in the next task."
```

---

### Task 7: Day-at-Beaconsfield progress indicator

**Files:**
- Create: `site/src/components/DayProgress.tsx`

**Interfaces:**
- Consumes: relies on DOM elements with `id="morning"`, `id="afternoon"`, `id="evening"` existing on the page (Task 8 provides these).
- Produces: `<DayProgress />` component, consumed only by Task 8.

- [ ] **Step 1: Write the component**

Create `site/src/components/DayProgress.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";

interface DayProgressItem {
  id: string;
  label: string;
}

const ITEMS: DayProgressItem[] = [
  { id: "morning", label: "Morning" },
  { id: "afternoon", label: "Afternoon" },
  { id: "evening", label: "Evening" },
];

/**
 * A sticky, desktop-only side rail marking which band of
 * /a-day-at-beaconsfield is in view — three dots, not a literal
 * scroll-percentage bar. Reuses the same IntersectionObserver approach as
 * Reveal.tsx rather than adding a new dependency, but unlike Reveal (which
 * only ever needs to fire once and then disconnects) this keeps observing,
 * since it needs to track the visitor scrolling back and forth between
 * bands, not just a one-time reveal.
 *
 * aria-hidden: this is a supplementary visual affordance, not a navigation
 * landmark — the bands themselves are in normal document order and reachable
 * without it, so it doesn't need to be announced or focusable.
 */
export function DayProgress() {
  const [activeId, setActiveId] = useState(ITEMS[0].id);

  useEffect(() => {
    const observers = ITEMS.map(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const io = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { threshold: 0, rootMargin: "-45% 0px -45% 0px" }
      );
      io.observe(el);
      return io;
    });
    return () => observers.forEach((io) => io?.disconnect());
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed left-8 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-4 lg:flex"
    >
      {ITEMS.map((item) => (
        <span
          key={item.id}
          className={`isolate h-2.5 w-2.5 rounded-[9999px] border-2 transition-colors duration-300 ${
            activeId === item.id ? "border-orange bg-orange" : "border-navy/30 bg-transparent"
          }`}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `cd site && npx tsc --noEmit`
Expected: no errors mentioning `DayProgress.tsx`.

- [ ] **Step 3: Commit**

```bash
cd site
git add src/components/DayProgress.tsx
git commit -m "feat(day-in-life): add DayProgress side-rail indicator

Three-dot sticky rail (desktop only) tracking which Morning/
Afternoon/Evening band is in view, via the same IntersectionObserver
pattern Reveal.tsx already uses. aria-hidden — supplementary visual
affordance, not a navigation landmark; page content is fully usable
without it. Not wired into a page yet, that's the next task."
```

---

### Task 8: Day-at-Beaconsfield page

**Files:**
- Create: `site/src/app/a-day-at-beaconsfield/page.tsx`

**Interfaces:**
- Consumes: `DAY_AT_BEACONSFIELD` (Task 6), `DayProgress` (Task 7), plus existing `PageHeader`, `Reveal`, `Pic`, `ButtonPrimary` components (unchanged).

- [ ] **Step 1: Write the page**

Create `site/src/app/a-day-at-beaconsfield/page.tsx`:

```tsx
import type { Metadata } from "next";
import { DAY_AT_BEACONSFIELD } from "@/content/dayAtBeaconsfield";
import { Pic } from "@/components/Pic";
import { Reveal } from "@/components/Reveal";
import { PageHeader } from "@/components/PageHeader";
import { DayProgress } from "@/components/DayProgress";
import { ButtonPrimary } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "A Day at Beaconsfield House",
  description:
    "A sense of what a day at Beaconsfield House can hold — not a schedule, but the shape of morning, afternoon and evening for residents at our Weston-super-Mare brain injury rehabilitation home.",
  alternates: { canonical: "/a-day-at-beaconsfield" },
};

export default function DayAtBeaconsfieldPage() {
  return (
    <>
      <DayProgress />

      {/* ------------------------------------------------------------- Header */}
      <PageHeader
        eyebrow={DAY_AT_BEACONSFIELD.eyebrow}
        title={DAY_AT_BEACONSFIELD.heading}
        lede={DAY_AT_BEACONSFIELD.intro}
      />

      {/* --------------------------------------------------------------- Bands */}
      {/* Image left, text right, for all three bands — deliberately not
          alternating sides per band. An alternating layout is possible with
          CSS Grid (col-start + row-start on each child) but adds real risk
          of a subtle placement bug that's hard to catch without a live
          browser; a single consistent arrangement matches the pattern
          page.tsx's "Mission" and "Support teaser" sections already use
          and is simpler to verify correct by inspection. */}
      {DAY_AT_BEACONSFIELD.bands.map((band) => (
        <section key={band.id} id={band.id} className="pb-[var(--space-section)]">
          <Reveal>
            <div className="mx-auto max-w-6xl px-5">
              <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-6">
                  <div className="overflow-hidden rounded-[1.75rem] shadow-navy-lg">
                    <Pic
                      imageKey={band.imageKey}
                      alt={band.alt}
                      sizes="(min-width: 1024px) 50vw, calc(100vw - 2.5rem)"
                      className="w-full object-cover"
                    />
                  </div>
                </div>

                <div className="lg:col-span-5 lg:col-start-8">
                  <span aria-hidden="true" className="block h-1 w-12 rounded-full bg-orange" />
                  <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-orange-text">
                    {band.label}
                  </p>
                  <p className="mt-3 text-[length:var(--text-lede)] leading-relaxed text-navy/90">
                    {band.body}
                  </p>
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      ))}

      {/* ------------------------------------------------------------ Closing */}
      <section className="pb-[var(--space-section)]">
        <Reveal>
          <div className="mx-auto max-w-6xl px-5">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-orange/[0.08] px-6 py-14 text-center ring-1 ring-orange/25 sm:px-12 sm:py-16">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 mx-auto h-1 w-24 rounded-b-full bg-orange"
              />
              <h2 className="mx-auto max-w-[20ch] font-display text-[length:var(--text-h2)] font-semibold leading-[1.08] tracking-tight text-balance text-navy">
                {DAY_AT_BEACONSFIELD.closing.heading}
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-[length:var(--text-lede)] leading-relaxed text-muted">
                {DAY_AT_BEACONSFIELD.closing.body}
              </p>
              <div className="mt-9 flex justify-center">
                <ButtonPrimary
                  href={DAY_AT_BEACONSFIELD.closing.cta.href}
                  label={DAY_AT_BEACONSFIELD.closing.cta.label}
                />
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Build**

Run: `cd site && npm run build`
Expected: `/a-day-at-beaconsfield` appears in the route list, build succeeds with no TypeScript errors.

- [ ] **Step 3: Manually verify in a browser**

Run: `cd site && npm run build && npx serve out -l 4173`, then check `/a-day-at-beaconsfield` at both a desktop width (≥1024px, confirm the three-dot `DayProgress` rail appears on the left and highlights as you scroll through Morning/Afternoon/Evening, and that each band shows image-left/text-right correctly) and a mobile width (confirm the rail is hidden and the three bands stack cleanly, image above text).

- [ ] **Step 4: Commit**

```bash
cd site
git add src/app/a-day-at-beaconsfield/page.tsx
git commit -m "feat(day-in-life): add /a-day-at-beaconsfield page

Three image-left/text-right bands (Morning/Afternoon/Evening) built
from real photos already in images.json and the copy from the
previous content task, each wrapped in the existing Reveal component
— no new animation library. DayProgress rail marks which band is in
view on desktop. Not yet in nav or sitemap — next task."
```

---

### Task 9: Nav entry and sitemap

**Files:**
- Modify: `site/src/components/SiteHeader.tsx`
- Modify: `site/src/app/sitemap.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing consumed by later tasks — this is the last piece connecting the new page into the site's navigable surface.

- [ ] **Step 1: Add the nav entry**

In `site/src/components/SiteHeader.tsx`, change the `NAV` array:

```tsx
const NAV = [
  { href: "/", label: "Home" },
  { href: "/services-facilities", label: "Services & Facilities" },
  { href: "/virtual-tour", label: "Take a Look Inside" },
  { href: "/who-we-support", label: "Who We Support" },
  { href: "/our-team", label: "Our Team" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact-us", label: "Contact Us" },
];
```

to:

```tsx
const NAV = [
  { href: "/", label: "Home" },
  { href: "/services-facilities", label: "Services & Facilities" },
  { href: "/virtual-tour", label: "Take a Look Inside" },
  { href: "/a-day-at-beaconsfield", label: "A Day at Beaconsfield" },
  { href: "/who-we-support", label: "Who We Support" },
  { href: "/our-team", label: "Our Team" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact-us", label: "Contact Us" },
];
```

- [ ] **Step 2: Add the route to the sitemap**

In `site/src/app/sitemap.ts`, change:

```ts
const ROUTES = [
  "",
  "/services-facilities",
  "/virtual-tour",
  "/who-we-support",
  "/our-team",
  "/reviews",
  "/contact-us",
  "/privacy-policy",
  "/cookie-policy",
  "/accessibility",
] as const;
```

to:

```ts
const ROUTES = [
  "",
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
] as const;
```

- [ ] **Step 3: Build and visually confirm the nav fits**

Run: `cd site && npm run build && npx serve out -l 4173`, then check the header at desktop width (≥1024px) — 8 nav items plus the accessibility controls plus the Brochure button is a lot in one row. If it visibly crowds or wraps, that's a real problem to fix now (e.g. shortening "A Day at Beaconsfield" further, or adjusting header padding/gaps) — don't leave it looking broken and move on.

- [ ] **Step 4: Commit**

```bash
cd site
git add src/components/SiteHeader.tsx src/app/sitemap.ts
git commit -m "feat(day-in-life): add 'A Day at Beaconsfield' to nav and sitemap

Positioned right after 'Take a Look Inside' — both are experiential/
photo-led content, grouping them keeps the nav's logic legible."
```

---

### Task 10: Add new pages to the existing smoke and a11y test suites

**Files:**
- Modify: `site/tests/e2e/smoke.spec.ts`
- Modify: `site/tests/e2e/a11y.spec.ts`

**Interfaces:**
- Consumes: nothing new — these are the existing generic per-page test loops, just extended to cover the routes this plan added (plus `/reviews`, which was added in an earlier session and never backfilled into either array — closing that pre-existing gap here since it's the same one-line change).

- [ ] **Step 1: Extend `smoke.spec.ts`'s `PAGES` array**

In `site/tests/e2e/smoke.spec.ts`, change:

```typescript
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
```

to:

```typescript
const PAGES = [
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
```

- [ ] **Step 2: Extend `a11y.spec.ts`'s `PAGES` array**

In `site/tests/e2e/a11y.spec.ts`, change:

```typescript
const PAGES = [
  "/",
  "/services-facilities",
  "/virtual-tour",
  "/who-we-support",
  "/our-team",
  "/contact-us",
];
```

to:

```typescript
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
```

(Leave `/privacy-policy`/`/cookie-policy` out of this array, matching the existing scope of this suite — not adding unrelated pages beyond what this plan touched plus the one pre-existing `/reviews` gap.)

- [ ] **Step 3: Run both suites**

Run: `cd site && npm run build && npx playwright test tests/e2e/smoke.spec.ts tests/e2e/a11y.spec.ts`
Expected: PASS for every page in both arrays, including the three newly-added routes. If `/a-day-at-beaconsfield` fails the axe scan, read the violation output carefully (`JSON.stringify(bad, null, 2)` in the test's own assertion message shows exactly what failed) and fix the actual markup — the most likely culprit is a heading-order issue if `PageHeader`'s `<h1>` isn't rendering before the band `<p>` elements as expected.

- [ ] **Step 4: Commit**

```bash
cd site
git add tests/e2e/smoke.spec.ts tests/e2e/a11y.spec.ts
git commit -m "test: add new pages to smoke and a11y PAGES arrays

/a-day-at-beaconsfield and /accessibility (new this plan) plus
/reviews (added in an earlier session, never backfilled into either
array until now) — closes that pre-existing gap while already
touching these exact arrays for the new pages."
```

---

### Task 11: Full verification and deploy

**Files:** none (verification only).

- [ ] **Step 1: Full clean build**

Run: `cd site && npm run build`
Expected: succeeds, all 17 routes listed (14 previous + `/a-day-at-beaconsfield` + `/accessibility`, plus `/reviews` already existed — confirm the count matches what's actually in `ROUTES`/the App Router's file structure).

- [ ] **Step 2: Full Playwright suite**

Run: `cd site && npx playwright test`
Expected: 100% pass, including `tests/e2e/regression.spec.ts`'s sitewide zero-cookie/zero-storage loop (this is the test that would catch any accidental storage usage anywhere in this plan's work) and the new `accessibility-controls.spec.ts`.

- [ ] **Step 3: Manual cross-check in a live browser, per the spec's verification plan**

- Text-size and reduced-motion toggles: confirm state persists across a few in-site `Link` clicks, and resets on a hard reload
- Reduced motion checked both via the header toggle AND via the OS/browser's own `prefers-reduced-motion` setting, independently of each other
- `/a-day-at-beaconsfield` checked at mobile and desktop widths
- `/reviews` and `/` re-checked for layout regressions after the testimonial hierarchy change (Task 5)
- `/accessibility` reads correctly and its "our contact page" link works

- [ ] **Step 4: Deploy**

Run: `cd site && vercel deploy --prod --yes`
Expected: deployment reports `"readyState": "READY"`, aliased to `truthcaregroup.co.uk`. (This project has no GitHub integration — confirmed earlier this session — so this manual deploy step is required; a `git push` alone will not update the live site.)

- [ ] **Step 5: Re-verify live**

Load `https://truthcaregroup.co.uk/a-day-at-beaconsfield`, `https://truthcaregroup.co.uk/accessibility`, and `https://truthcaregroup.co.uk/reviews` in a real browser and confirm each renders correctly and the header controls work, the same way every other change this session was verified live post-deploy, not just locally.

- [ ] **Step 6: Push to GitHub** (repo of record, even though it doesn't trigger deploy)

```bash
cd /path/to/repo/root  # the truthcare repo root, not site/
git push origin main
```

Expected: `main` on GitHub matches what's now live.
