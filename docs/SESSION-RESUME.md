# Truth Care Group rebuild — session resume

**Last updated:** 13 August 2026
**Repo:** `C:\Users\LAPTOP80\Projects\truthcare` (moved from `C:\Users\LAPTOP80\Desktop\_Apps_Code\ALL APPS\truthcare` — same git history, same GitHub remote, just a different local clone path. If working from yet another path, memory for this project lives per-path; check the local `docs/` files first regardless of where you're running from, they're the source of truth.)
**Branch:** `main` (site code lives in `site/`)
**GitHub:** https://github.com/mcfearless75/truthcare (public)

## Status: LIVE IN PRODUCTION

**https://truthcaregroup.co.uk is the real site now.** DNS cut over 2026-08-13, hosted on Vercel (project `truthcaregroup` under the `paul-mcwilliams-projects` account, already authenticated on this machine — `npx vercel deploy --prod` from `site/` ships straight to production). GitHub Pages preview (`https://mcfearless75.github.io/truthcare/`) still exists and auto-deploys on push, but is no longer the thing that matters — it's a leftover preview, not the source of truth for "is this live."

**Deploy loop for any future change:** commit → push to `main` → `cd site && npx vercel deploy --prod`. Both need doing; pushing to GitHub alone does not update the live site (GH Actions only redeploys the Pages preview). Per standing feedback, push to `main` immediately after committing a real change — don't ask permission each time.

## What this is

Static Next.js rebuild of truthcaregroup.co.uk (specialist brain-injury residential rehab, Beaconsfield House, Weston-super-Mare, North Somerset, CQC-regulated). Originally replaced a 898 KB Wix site. Content lives in `site/src/content/*.ts`, separate from markup — editing copy doesn't mean touching page code.

Read these for full detail:
- Client handover: `docs/HANDOVER.md` — now reflects post-launch status, not a pre-launch checklist
- Latest SEO audit: `docs/SEO-AUDIT-2026-08-13.md` (supersedes `docs/SEO-AUDIT-2026-07-26.md`, which is still useful for the original competitor research)
- Original build spec/plan: `docs/superpowers/specs/` and `docs/superpowers/plans/`

## How to run it

```bash
cd site
npm run build && npx serve out -l 4173   # or: npm run dev
npm run test:e2e                          # 38 Playwright tests, all passing
```

## Everything resolved since the 26 July build-complete milestone

- **DNS cutover done.** `truthcaregroup.co.uk` and `www.truthcaregroup.co.uk` both point at Vercel (`76.76.21.21`), SSL live, verified all 8 pages return 200 directly against the domain (not assumed).
- **Security headers added** via `site/vercel.json` (HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options). Deliberately no CSP — `layout.tsx`'s inline `<head>` script would need a nonce first, or a strict CSP silently breaks every scroll-reveal animation.
- **Legal name confirmed** — "Truth Care Group Ltd" verified directly against the client's actual CQC Certificate of Registration, not just a register comment. Same certificate surfaced a **Provider ID (1-21880615075)** distinct from the Location ID already in `site.ts`, and a **registered/correspondence address (339 Two Mile Hill Road, Bristol)** different from Beaconsfield House's own address — both noted in `legal.ts` comments, placement not yet decided with the client.
- **Image provenance confirmed real** — client confirmed the two AI-dimension-flagged photos (lounge/piano, sensory room) are genuine.
- **"Last updated" date set** to the real launch date in `legal.ts`.
- **Phone number resync** — Wix had changed to a new primary number (`07483 483955`) since the original build snapshot; updated everywhere (site.ts, contact.ts, support.ts, legal.ts, metadata).
- **Landline added** (`01934 753233`), provided directly by the client — resolves the old "is there a landline?" open item.
- **Team resync** — Mrs Alison Woods (was "Registered Manager") no longer on the live team page; replaced with Emma Merriman (neuro-occupational therapist), verbatim bio + real headshot pulled from Wix, moved to the end of the roster per client request. **Registered Manager title is now unassigned — still open, see below.**
- **New Kumi Pillay headshot** — client supplied a proper 1086×1448 photo, replacing the old 480px-only source.
- **Brochure PDF added** — sourced from live Wix, hosted at `/downloads/truth-care-group-brochure.pdf`, linked from the header (own CTA button), Services & Facilities, Contact Us, and the footer.
- **Header polish** — brand-text wrap bug fixed (`shrink-0`), brochure button given its own visual space (divider, wider gap, hover state), header widened to `max-w-7xl` vs body's `max-w-6xl`.
- **Homepage hero fixed** — was cropping the roofline via `object-cover object-center` on a 4:3 photo in a much wider section; now `object-top`, plus a lighter scrim so more of the house actually shows.
- **Doubled section-gap bug fixed** on `our-team` and `who-we-support` (PageHeader's own bottom padding was stacking with the next section's top padding — same root cause as an earlier top-of-page version of the same bug, both now fixed).
- **North Somerset + wider catchment targeting added** to homepage/services/who-we-support meta descriptions and body copy, grounded in real Search Console query data (impressions for "Minehead" and "Bristol" ABI searches with zero clicks).
- **Alcohol-related brain damage added as a named condition** (conditions chip list, meta description, new FAQ entry) — client-confirmed in scope, grounded in 117 real GSC impressions with zero clicks on that exact phrase.
- **Google Search Console discovered already connected** in the client's Chrome session — 90 days of real performance data pulled (134 clicks, 1.08k impressions, top queries, per-page breakdown), used to ground the two content additions above instead of guessing.
- **Google Business Profile investigated** — exists, managed by the client's Google account (`paulmc18@gmail.com`, via the lightweight in-search panel, not the main 218-listing agency dashboard), genuine 5-star review, 328 tracked customer interactions. **Phone number on it is stale (old `07966 284872`) — still open, see below.**

## CQC registration facts, pulled from the live register 2026-08-13

Verified directly from `cqc.org.uk/location/1-26270675575` and its registration-details page. Worth keeping here because two of these are **conditions of registration** that the site's copy must not contradict:

- **Location ID** `1-26270675575` — matches `cqcUrl` in `lib/site.ts`. (The `legal.ts` comment previously transcribed this as `1-26270575575`; that typo is fixed, the live link was always correct.)
- **Registered** 30 December 2025. **Not yet inspected, therefore not yet rated.**
- **Regulated activity:** accommodation for persons who require nursing or personal care. **Kumarasen Pillay is named as responsible for these services** — this is a strong lead on the vacant Registered Manager question, but CQC's "responsible for" wording covers the registered person for the activity and does not by itself prove the Registered Manager title. Needs the client's confirmation before going on the site.
- **Condition: maximum 6 service users.** The site says "six bed" / "Six spacious en-suite bedrooms" — consistent, no action needed.
- **Condition: must NOT provide nursing care** at this location. Site copy checked — the only occurrence of "nursing" is the `team.ts:20` heading "Specialists across neuropsychiatry, therapy and nursing", which describes staff disciplines rather than offering nursing care. Defensible, but worth a client conversation given the explicit condition.
- **Condition: must NOT provide a specialist LD/autism service.** Site copy checked — makes no learning-disability or autism claims anywhere. Clean.
- **Service specialisms:** adults over 65, adults under 65, mental health conditions. **Local authority: North Somerset** — independently corroborates the North Somerset targeting added earlier.

## Still open

1. **Registered Manager** — nobody is currently named as holding this legally-significant CQC title (Alison Woods held it, she's gone). Flagged `NEEDS CONFIRMATION` in `team.ts`.
2. **Google Business Profile phone number** — needs updating from the old number to the new one. Client manages it and was offered a walkthrough; not done as of this write-up.
3. **CQC rating — RESOLVED AS "THERE IS NO RATING", 2026-08-13.** Checked the live CQC location page (`1-26270675575`) directly rather than continuing to chase the client for a rating. Beaconsfield House was **registered on 30 December 2025 and has not yet been inspected**; the page carries CQC's standard new-service wording ("New services are assessed to check they are likely to be safe, effective, caring, responsive, and well-led… Follow-up inspections of new services are undertaken regularly following registration") in the slot where a rating would appear. **Both SEO audits were wrong to frame this as "the rating isn't displayed" — there is nothing to display.** The remaining decision is presentational: whether to add an honest "CQC registered, awaiting first inspection" trust block, which is likely stronger than silence since families will check CQC anyway. Awaiting the client's call.
4. **Provider ID placement** — still to be decided (see legal.ts comments). **The Bristol address half of this is RESOLVED:** 339 Two Mile Hill Road, BS15 1AN is the company's registered office per Companies House, and now appears in the privacy notice in exactly that role. It is still not the visitor-facing address.
5. **Company number — RESOLVED 2026-08-13: 15651211.** Verified against the Companies House public register (TRUTH CARE GROUP LTD, active, private limited company, incorporated 16 April 2024), not supplied by the client. Now live in the privacy notice's data controller section. **ICO registration number and DPO status remain genuinely open** — the ICO register is only searchable through a form, so it could not be resolved from public record and needs the client's registration reference. DPO is the same open question as the Registered Manager title (item 1): the privacy notice directs information requests to "the registered manager", a role nobody currently holds.
6. **Formspree test submission** — flagged as needing deletion pre-launch; never confirmed done.
7. **Outcomes/case-study content, funding/commissioning page** — both flagged in both SEO audits as the biggest remaining content gaps vs. competitors. Not started.
8. **Emma Merriman's headshot is low-res** (241px source, smaller than the rest of the team) — not yet flagged to the client, worth mentioning next time headshots come up.
9. **Gallery photo softness** (exterior-side, lounge-piano, sensory-room only have ≤1200px sources) — unresolved, needs higher-res originals.
10. **Geo coordinates / opening hours** for LocalBusiness schema — still never supplied.

## Decisions made — do not relitigate

Everything from the original build (Weston-super-Mare not Bristol, no cookie banner, Giraffe360 click-to-load, Formspree without postal address, no URL changes) still stands — see `docs/HANDOVER.md` for the full list with reasoning. Additionally as of this session: **Vercel is the production host** (not GitHub Pages, not Netlify), decided explicitly by the client when asked.
