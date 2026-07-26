# Truth Care Group — Rebuild Design Spec

**Date:** 26 July 2026
**Based on:** `truth-care-group-scope-v2.md` (v2.1), approved with two additions: richer gallery on the tour page, Formspree for the contact form.
**Live site:** https://truthcaregroup.co.uk (Wix)

---

## 1. Goal

Like-for-like rebuild of the existing six-page Wix site as a fully static Next.js build, executed to a premium visual standard. Same URLs, same content, cleaner everything. Two scope additions approved by Paul:

1. `/virtual-tour` becomes a proper editorial photo gallery ("Take a Look Inside") with lightbox — resolves scope §6.
2. Contact form via **Formspree** (email delivery + stored submissions, no backend). Account to be created with the truthcare email; build against a placeholder endpoint until supplied.

## 2. Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js, App Router, `output: 'export'` | Fully static, no server |
| Styling | Tailwind CSS | Brand tokens as CSS custom properties + Tailwind theme |
| Fonts | Self-hosted via `next/font` | Serif display + humanist sans, two families max, `font-display: swap` |
| Images | `next/image` with static export loader | AVIF/WebP, responsive sizes |
| Form | Formspree | Honeypot spam protection, no CAPTCHA |
| Deploy | Vercel or Netlify | DNS cutover after client review, not a Friday |

## 3. Pages

Same six URLs — no redirect map, no ranking risk. Plus two legal pages and a 404.

| URL | Content |
|---|---|
| `/` | Hero, three proof strips (MDT / goal-focused / independence), mission, five service values (Well Led, Responsive, Safe, Effective, Caring), Beaconsfield House teaser, who-we-support teaser |
| `/services-facilities` | Services content + gallery rendered **once** |
| `/virtual-tour` | "Take a Look Inside" — editorial gallery of the ten real property photos with lightbox. Heading/nav label updated; URL unchanged |
| `/who-we-support` | Content verbatim + all six FAQs, marked up with `FAQPage` JSON-LD |
| `/our-team` | Six bios verbatim |
| `/contact-us` | Formspree form + contact details, privacy notice link |
| `/privacy-policy` | UK GDPR privacy notice covering the form's data collection |
| `/cookie-policy` | Cookie policy + minimal consent banner (only if any non-essential storage exists; prefer zero cookies so the banner can be omitted) |
| `/404` | Branded not-found page |

## 4. Design system — warm editorial / light luxury

**Tokens (from scope §3, non-negotiable):**

```css
--navy:           #0F2C3F;  /* primary text, depth surfaces. 14.5:1 on white */
--orange:         #F5921E;  /* FILL ONLY — never body text on white */
--orange-text:    #AD5A10;  /* orange text on white. 4.94:1 AA */
--orange-text-lg: #C4661A;  /* large text (18pt+/14pt bold) only. 3.99:1 */
--ink:            #1A1A1A;
--paper:          #FFFFFF;
--muted:          #5A6570;
```

**Contrast rules:** orange text on white is banned. Buttons are navy text on orange fill (6.2:1) or white on navy (14.5:1). Any orange-coloured text uses `--orange-text`.

**Typography:** serif display for headings (Fraunces or Source Serif 4), humanist sans for body (Figtree or Inter). One modular type scale, measure capped ~65ch, consistent vertical rhythm via a spacing scale.

**Layout:** generous whitespace, editorial asymmetry where it earns its place (photo/text offsets on section breaks), no uniform card-grid monotony. Real photography given room.

**Motion:** subtle scroll-reveal fades and designed hover/focus/active states only. Compositor-friendly properties (`transform`, `opacity`). `prefers-reduced-motion` fully respected. No parallax, no scroll-jacking.

## 5. Images

Pipeline per scope §4:

1. Pull all 32 assets + brochure PDF from the Wix CDN at source resolution
2. Strip EXIF from every photograph (GPS on a care-home property is a safeguarding issue)
3. Rename semantically (`beaconsfield-house-ensuite-bedroom.jpg`)
4. Serve responsive AVIF/WebP; originals retained ≥2000px long edge
5. Rewrite every `alt` attribute to describe the image's meaning, not its pixels

**Constraints:**
- `exterior-blue-sky` — dropped (768×512, unusable)
- `team-kumi-pillay`, `team-alison-woods` — used at small/cropped sizes pending better originals
- `exterior-side`, `interior-lounge-piano`, `interior-sensory-room` — contained widths only
- Provenance-flagged images (`exterior-blue-sky`, `interior-lounge-piano`, `interior-sensory-room`, `misc-header`) ship only pending Paul's check with the client; listed in the handover note

## 6. Contact form

- Fields: name, email, phone (optional), enquiry type (visit / referral / general), message
- Client-side validation with clear inline errors; server rejection handled gracefully with the phone number shown as fallback
- Honeypot field for spam; no CAPTCHA
- Success state confirms delivery and sets response expectations
- Posts to Formspree endpoint (placeholder `FORMSPREE_ENDPOINT` constant until account exists)
- Privacy notice linked adjacent to the submit button

## 7. SEO & schema

- `LocalBusiness` JSON-LD completed: name, address, phone, geo, hours (placeholders clearly marked where unconfirmed — see open questions)
- `FAQPage` JSON-LD on `/who-we-support` from the six existing FAQs
- Per-page titles, meta descriptions, OG tags; canonical URLs
- `sitemap.xml`, `robots.txt`
- Semantic HTML throughout (`header`/`nav`/`main`/`section`/`footer`, one `h1` per page)

## 8. Performance & accessibility targets

- HTML <120 KB per page (vs 898 KB live)
- LCP <1.5s, CLS ≈ 0, Lighthouse Perf ≥95, A11y 100
- Tap targets ≥24px, visible focus states, keyboard-navigable lightbox and mobile nav
- Explicit dimensions on all images; hero image `fetchpriority="high"`, below-fold lazy

## 9. Component inventory

Small focused files, feature-organised:

- `SiteHeader` / `MobileNav` — sticky header, accessible disclosure nav
- `SiteFooter` — contact details, legal links, CQC reference
- `Hero` — homepage hero with CTA pair (Arrange a Visit / Make a Referral)
- `ValueCard` ×5 — the service values with existing icons
- `SectionHeading` — consistent eyebrow/heading/lede pattern
- `Gallery` + `Lightbox` — used on tour page; subset on services page
- `FaqAccordion` — six FAQs, native `<details>` based
- `TeamCard` ×6 — bio blocks
- `ContactForm` — Formspree integration
- `ConsentBanner` — only if a cookie exists; goal is zero cookies and no banner

## 10. Out of scope

Everything in scope doc §8 (group pages, dashboards, careers, blog, CMS, chatbot, etc.). Also out: fixing the live Wix mailto (scope §7.1 — Paul actions that directly on Wix, independent of this build).

## 11. Open questions (carried from scope §10)

1. Landline — add alongside mobile, or mobile-only?
2. Formspree endpoint — pending Paul's account setup
3. Image provenance — four flagged files need client confirmation
4. Better headshots for Kumi and Alison — or ship with constraints above
5. Confirmed hours/geo for `LocalBusiness` schema

None block the build — placeholders are used and flagged in the handover note.
