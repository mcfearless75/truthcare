# Truth Care Group rebuild — session resume

**Last updated:** 26 July 2026
**Repo:** `C:\Users\LAPTOP80\Desktop\_Apps_Code\ALL APPS\truthcare`
**Branch:** `build/site` (site code lives in `site/`)

## What this is

Full static Next.js rebuild of truthcaregroup.co.uk (specialist brain-injury residential rehab, Weston-super-Mare, CQC-regulated). Replaces a 898 KB Wix site.

Read these two documents first — they are the source of truth:
- Spec: `docs/superpowers/specs/2026-07-26-truthcare-rebuild-design.md`
- Plan: `docs/superpowers/plans/2026-07-26-truthcare-rebuild.md` (11 tasks)

Task-by-task progress ledger (which tasks are done, what each review found, what was carried forward): `.superpowers/sdd/progress.md` — **this is gitignored but present on disk. Read it before doing anything.**

## Status

Tasks 1-10 complete, each implemented by a subagent and passed through an independent review gate. Task 11 (performance pass + deploy preview + handover note) is the remaining work, followed by a whole-branch review.

Built so far: scaffold with brand tokens, all page content transcribed verbatim from the live site, image pipeline (31 assets, EXIF-stripped, responsive AVIF/WebP), site chrome, homepage, gallery + accessible lightbox, tour page, services page, who-we-support with FAQPage schema, our-team, contact form (Formspree), UK GDPR legal pages, 404, sitemap/robots, sitewide LocalBusiness schema, and a 35-test Playwright suite (smoke + axe + keyboard activation).

## How to run it

```bash
cd site && npm run build && npx serve out -l 4173
```

```bash
cd site && npm run test:e2e
```

## Decisions already made — do not relitigate

- **Location is Weston-super-Mare**, not Bristol. The live Wix site's SEO titles say Bristol; the CQC-registered address is 11 Beaconsfield Rd, Weston-super-Mare, BS23 1YE. Paul chose Weston-super-Mare everywhere in chrome, metadata and schema. "Bristol" legitimately remains in team bios (Frenchay and Southmead are Bristol hospitals).
- **No cookie consent banner.** The site sets zero cookies, writes no storage, and serves every resource same-origin (fonts self-hosted via `next/font`). A banner would be noise. This supersedes the original scope doc, which budgeted half a day for one. A Playwright test enforces the zero-cookie claim.
- **Contact form uses Formspree** (`https://formspree.io/f/xzdnklod`, in `SITE.formspree`) and deliberately omits the postal address the old Wix form collected — data minimisation.
- **`/virtual-tour` keeps its URL** but is now "Take a Look Inside", a real editorial gallery of nine property photos. No URL changed anywhere, so no redirect map and no ranking risk.
- Orange `#F5921E` is fill only, never text on white. Orange text on white uses `#AD5A10`; on navy use `#F5921E`.

## Open items for the client — carry these into the handover

1. **15 legal claims need Truth Care Group's sign-off** before launch. Each is marked `NEEDS CONFIRMATION` in `site/src/content/legal.ts` with the specific claim named. The load-bearing ones: the Formspree transfer mechanism, retention periods, company/ICO registration numbers, and the hosting provider (not yet chosen).
2. **One test submission sits in the Formspree inbox**, labelled "TEST SUBMISSION - website rebuild". Delete it.
3. **Image provenance.** Five files land on exactly 1536×1024, a characteristic generated-image dimension: `interior-lounge-piano`, `interior-sensory-room`, `lifestyle-cooking`, `lifestyle-dogwalk`, `graphic-conditions-overview`. If any purports to show Beaconsfield House and is AI-generated, it must be pulled — misrepresenting the premises of a CQC-regulated service is a regulatory issue. `exterior-blue-sky` was already dropped.
4. **Better headshots** for Kumi Pillay (600×800) and Alison Woods (615×640) — currently capped at 480 CSS px so they hold up, but originals would be better.
5. **Geo coordinates and opening hours** for the LocalBusiness schema — deliberately absent rather than invented.
6. **Landline** — is there one to add alongside the mobile?
7. **The live Wix site's referral mailto is still broken** (`info@truthgroupcare.co.uk`, domain transposed). That is a separate manual fix on Wix, independent of this rebuild. Every referral sent from that button has bounced.

## Working method

This build used the superpowers subagent-driven-development skill: one fresh subagent implements each task from an extracted brief, then an independent reviewer subagent gates it on spec compliance and code quality, with fix rounds until clean. To continue, invoke `superpowers:subagent-driven-development` and resume at the first task the ledger doesn't mark complete.
