# Sensitive, Touching, Interactive Experience — Design Spec

**Date:** 14 August 2026
**Trigger:** "check competition and see what they are doing website wise — or not! and make ours a sensitive touching and interactive experience"
**Scope decision:** Design-only pass. No new client-supplied content (photos, video, quotes) required — everything here is buildable from what already exists on the site. A future content project (real filmed/recorded conversation content) is named as out of scope below, not attempted here.

---

## 1. Why this shape

Two research passes (competitor UX audit + sensitive-sector inspiration audit, both in this session's transcript, not re-copied here) converged on the same three findings:

1. **No competitor in the sector has any real interactivity** — Arbor, Active Care Group, Askham, Richardson Care, Brainkind, Elysium are all static text-and-photo sites. Gimmicky interactivity (quizzes, calculators) reads worse than none — the opportunity is *real* interactivity, not decoration.
2. **The best sensitive-sector sites (Headway, Sue Ryder, Dementia UK) lead with the subject's own words**, match imagery to the emotional register of the topic, and keep transactional CTAs physically separate from personal content.
3. **Alzheimer's Society's statistic-led, crisis-framed homepage copy is an explicit anti-pattern** for this project — Truth Care Group's audience is choosing a home, not being recruited into advocacy. Reassurance register throughout, always.

Three pieces came out of brainstorming against that backdrop, each approved individually:

## 2. Accessibility controls

**What:** A small control in the header — text size (Normal/Large) and reduced motion (On/Off) — each a two-state toggle. Real, working controls, not a decorative widget or a third-party overlay.

**Why real controls over a statement-only approach:** the research found Scope's approach (link out to OS/browser accessibility tools, publish an honest statement) is good practice, but a small residential provider's actual audience — older visitors, families reading under acute stress, people with their own cognitive/communication difficulties — benefits more from a control that's simply *there* than from a link to go configure their OS. This isn't a bolt-on toolbar widget (like Brainkind's Recite Me integration) — it's two specific, useful settings, nothing more.

**Mechanism — revised during plan-writing, no storage of any kind:**
- The original draft of this spec called for `localStorage` persistence. That conflicts with an existing, deliberate site commitment: `tests/e2e/regression.spec.ts` asserts zero cookies and zero localStorage/sessionStorage on every page, with the site's cookie policy stating plainly that it "sets nothing and calls nobody" and carries no consent banner as a result. `localStorage` would have quietly broken that promise.
- Instead: an `AccessibilityProvider` React Context, mounted once in the root layout (`layout.tsx`) around `{children}`, holding `textSize`/`reducedMotion` state in memory only. Next.js's App Router keeps the root layout mounted across client-side `Link` navigation (the same reason `SiteHeader`'s scroll state already survives page-to-page browsing), so the toggle state genuinely persists as a visitor browses the site in one visit — with **zero cookies, zero localStorage, zero sessionStorage**. A hard refresh or a new tab resets it; that's an honest, acceptable tradeoff, not a defect.
- The provider applies `data-text-size="normal"|"large"` and `data-motion="normal"|"reduced"` attributes to `document.documentElement` in an effect when state changes — no inline `<head>` script, no pre-paint read needed, since there's nothing stored to read on first load (state always starts at the default).
- A client component (`AccessibilityControls.tsx`) in the header consumes the context and renders the two toggles.
- CSS: `--text-scale` custom property (1 / 1.15) driving a `font-size` multiplier at `:root` scope; `Reveal`'s existing `.js .reveal` transition rules gate on `[data-motion="reduced"]` the same way they already gate on `prefers-reduced-motion` (both respected — explicit control OR OS setting either can request reduced motion).
- No new dependency. No changes needed to the cookie policy or the existing regression test.

**Companion page:** `/accessibility` — short, plain-English statement of what the site does (text size control, reduced motion control, alt text on every photo, semantic heading structure, keyboard-navigable nav) **and 1-2 honest current gaps** (e.g. no high-contrast mode yet), in the spirit of Scope's audited statement. This is the page the header control's "Accessibility" link points to, and it's where any future accessibility work gets logged rather than silently added.

## 3. Testimonial headline treatment

**What:** Testimonials currently sit under charity-written headers ("What families say", "Reviews"). Invert the hierarchy: the person's own opening sentence becomes the large visual headline; the section label ("What families say") becomes a small eyebrow above it, not the heading.

**Where:** `TestimonialQuote.tsx` (used on `/reviews`) and the homepage review strip (`page.tsx`) — both already carry `excerpt`/`quote`/`attribution` in the right shape (`content/reviews.ts`), so this is a visual hierarchy change, not a data change.

**Addition:** a small line near each testimonial — "Shared with permission, in their own words" (family testimonial) / the existing "Google review" source tag (Trish T.) — making clear these are genuine, unedited submissions rather than implying editorial polish.

## 4. "A Day at Beaconsfield House" — new page

**What:** A new page, `/a-day-at-beaconsfield`, presenting the real photo library (10 genuine interior/exterior/lifestyle photos already in `images.json`) as a gentle scroll-revealed sequence rather than a static gallery — the "real interactivity, not gimmick" the research pointed at.

**Structure:** Three broad bands — Morning / Afternoon / Evening — each pairing one or two real photos with a couple of sentences drawn from **existing, already-approved copy** (`content/support.ts`'s "how we help" list, the site's stated values) rather than invented specifics.

**Explicit constraint — no fabricated schedule:** Beaconsfield House is CQC-regulated. This page will **not** state specific timings, meal times, or named activities that haven't been verified against actual practice ("7am breakfast, 9am therapy" etc.) — that would be a compliance risk, not just a copywriting choice, if it doesn't match reality. The bands stay broad and impressionistic (what a morning generally holds, in the site's own already-approved language), never a literal timetable.

**Mechanism:** extends the existing `Reveal` component (IntersectionObserver-driven fade/slide-in, already used sitewide) — no new animation library. A thin progress indicator runs down the side on desktop (pure CSS/scroll-position, no new dependency). With the reduced-motion toggle (§2) or `prefers-reduced-motion` on, sections simply render in place with no transition — content is identical either way, only the reveal animation is skipped.

**Nav:** added to primary nav (`SiteHeader.tsx`) and `sitemap.ts`, immediately after "Take a Look Inside" — both are experiential/photo-led content, so grouping them keeps the nav's logic legible (Home → Services → Take a Look Inside → A Day at Beaconsfield House → Who We Support → Our Team → Reviews → Contact Us).

## 5. Explicitly out of scope

- **Any new photography, video, or client-sourced testimonial content.** Everything above works from what's already on the site.
- **The two-person conversation format** (a resident/family member and staff talking together) — the single most distinctive idea from the sensitive-sector research, but it needs real filming/recording with full consent and probably a support worker present. This is a future content project requiring the client's direct involvement, not a design change. Flagged here so it isn't lost, not attempted in this pass.
- **High-contrast mode** — named as a current gap on the `/accessibility` page rather than built now (per the "just text size + motion for now" decision made during brainstorming).
- **Statistic-led / crisis-framed copy of any kind** — explicitly rejected as a direction, named here so a future editor doesn't reintroduce it by accident.

## 6. Files touched (implementation-time detail, not exhaustive)

- New: `src/components/AccessibilityContext.tsx` (provider + hook), `src/components/AccessibilityControls.tsx` (header toggles), `src/app/accessibility/page.tsx`, `src/app/a-day-at-beaconsfield/page.tsx`, `src/content/dayAtBeaconsfield.ts` (references/re-exports the relevant `support.ts` copy rather than duplicating it verbatim, so the two stay in sync)
- Edited: `src/app/layout.tsx` (wrap `{children}` in `AccessibilityProvider`), `src/app/globals.css` (`--text-scale`, `[data-motion]` gates), `src/components/TestimonialQuote.tsx`, `src/app/page.tsx` (homepage strip), `src/components/SiteHeader.tsx` (nav entry + mount `AccessibilityControls`), `src/app/sitemap.ts`, `tests/e2e/smoke.spec.ts` and `tests/e2e/a11y.spec.ts` (add the two new routes to their `PAGES` arrays)

## 7. Verification plan

- `npm run build` clean.
- Text-size and reduced-motion toggles checked in a live browser: state persists across in-site `Link` navigation between pages, and correctly resets on a hard reload (no storage, by design).
- Reduced-motion checked with the toggle on AND with OS `prefers-reduced-motion` set, independently.
- New page checked at mobile and desktop widths.
- Existing pages (`/reviews`, `/`) re-checked after the testimonial hierarchy change for layout regressions.
- Deployed via `vercel deploy --prod` (this project has no GitHub integration — a `git push` alone does not deploy it) and re-verified live, same as every other change this session.
