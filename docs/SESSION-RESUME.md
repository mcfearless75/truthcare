# Truth Care Group rebuild — session resume

**Last updated:** 26 July 2026
**Repo:** `C:\Users\LAPTOP80\Desktop\_Apps_Code\ALL APPS\truthcare`
**Branch:** `main` (site code lives in `site/`)
**GitHub:** https://github.com/mcfearless75/truthcare (public)
**Live preview:** https://mcfearless75.github.io/truthcare/ (GitHub Pages, auto-deploys on push to `main`)

## What this is

Full static Next.js rebuild of truthcaregroup.co.uk (specialist brain-injury residential rehab, Weston-super-Mare, CQC-regulated). Replaces a 898 KB Wix site.

Read these first — they are the source of truth:
- Spec: `docs/superpowers/specs/2026-07-26-truthcare-rebuild-design.md`
- Plan: `docs/superpowers/plans/2026-07-26-truthcare-rebuild.md` (11 tasks)
- Client handover: `docs/HANDOVER.md`
- Task-by-task ledger: `.superpowers/sdd/progress.md` — gitignored but present on disk.

## Status: build complete, deployed to a public preview

All 11 plan tasks done, plus a real Giraffe360 virtual tour added mid-build, plus a whole-branch review with a 9-item fix pass, plus GitHub Pages deployment. Every stage went through an independent reviewer subagent with fix rounds until clean.

Built: scaffold with brand tokens, all page content transcribed verbatim from the live site, image pipeline (EXIF-stripped, responsive AVIF/WebP), site chrome, homepage, gallery + accessible lightbox, "Take a Look Inside" tour page (Giraffe360 embed behind a click-to-load facade + supporting photo gallery), services page, who-we-support with FAQPage schema, our-team, contact form (Formspree), UK GDPR legal pages, 404, sitemap/robots, sitewide LocalBusiness schema, 38-test Playwright suite (smoke + axe + keyboard activation + cookie/storage regression), and a GitHub Actions workflow that builds and deploys to Pages on every push to `main`.

Lighthouse (measured, not estimated): 100 Performance / 100 Accessibility / 96 Best Practices / 100 SEO. HTML weight 21–72 KB per page (live Wix site is 898 KB).

## How to run it

```bash
cd site && npm run build && npx serve out -l 4173
cd site && npm run test:e2e
```

## Decisions made — do not relitigate

- **Location is Weston-super-Mare**, not Bristol. Live Wix titles said Bristol; CQC-registered address is 11 Beaconsfield Rd, Weston-super-Mare, BS23 1YE. Used everywhere in chrome/metadata/schema. "Bristol" legitimately remains in team bios (Frenchay/Southmead are real Bristol hospitals).
- **No cookie consent banner.** Site sets zero cookies, zero storage, all resources same-origin. A Playwright test enforces this.
- **Giraffe360 tour is click-to-load**, not embedded on page view — keeps the zero-cookie claim true by default. Nothing from giraffe360.com loads until the visitor clicks. Cookie policy has a `NEEDS CONFIRMATION` flag on Giraffe360's actual cookie behaviour (unverified).
- **Contact form uses Formspree** (`https://formspree.io/f/xzdnklod`) and deliberately omits the postal address the old form collected (data minimisation).
- **`/virtual-tour` keeps its URL.** No URL changed anywhere on the site — no redirect map, no ranking risk.
- Orange `#F5921E` is fill only, never text on white. Orange text on white uses `#AD5A10`; on navy use `#F5921E`.
- **GitHub Pages hosting is subpath-aware but production isn't affected.** `next.config.ts` reads `NEXT_PUBLIC_BASE_PATH` (only set by the Pages workflow, to `/truthcare`); Vercel/production builds see no such var and stay at the domain root, exactly as scoped.

## Open items for Truth Care Group — see `docs/HANDOVER.md` for full detail

1. **15+ legal claims need sign-off**, each marked `NEEDS CONFIRMATION` in `site/src/content/legal.ts`. Load-bearing ones: Formspree's transfer mechanism, retention periods, company/ICO numbers, hosting provider (not chosen yet), Giraffe360's cookie behaviour.
2. **One test Formspree submission** needs deleting from the inbox ("TEST SUBMISSION - website rebuild").
3. **Image provenance**: `interior-lounge-piano` and `interior-sensory-room` sit at exactly 1536×1024, a characteristic AI-generated dimension. If either misrepresents Beaconsfield House's real interior, it must be pulled before launch — a regulatory issue, not a design one. (Three other flagged files — `lifestyle-cooking`, `lifestyle-dogwalk`, `graphic-conditions-overview` — turned out to be unused and were deleted during the final review pass.)
4. **Better headshots** wanted for Kumi Pillay and Alison Woods (currently capped at 480px so they hold up, but small originals).
5. **Geo coordinates and opening hours** for LocalBusiness schema — deliberately absent, not invented.
6. **Landline?** — confirm mobile-only or add one.
7. **The live Wix site's referral mailto is still broken** (`info@truthgroupcare.co.uk`, transposed domain) — separate manual fix on Wix, independent of this rebuild, worth doing today.
8. Stale local git branch `claude/modest-yalow-99c98f` exists from an earlier crashed background task — superseded, safe to delete, never pushed.

## Working method

Built with the superpowers `subagent-driven-development` skill: one fresh subagent implements each task from an extracted brief, an independent reviewer subagent gates it on spec compliance and code quality, fix rounds until clean, then a final whole-branch review before merge. Nothing further is planned — this file exists in case work resumes (e.g. once the client answers the open items above, or for the eventual DNS cutover to truthcaregroup.co.uk).
