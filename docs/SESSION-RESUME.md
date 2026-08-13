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

## Indexing and structured data, audited 2026-08-13

**Verified healthy, no action needed:** `robots.txt` allows all crawlers and points at the sitemap; `sitemap.xml` lists all 8 real pages with absolute URLs and lastmod; all 8 carry correct self-referencing canonicals; `404`/`_not-found` are correctly `noindex` and correctly absent from the sitemap; JSON-LD on all 10 built pages parses cleanly.

**Structured data strengthened** (`lib/schema.ts`) — `sameAs` → CQC record + Companies House record (both verified HTTP 200 live), plus `legalName`, the company number as an `identifier`, a stable `@id` that the FAQPage now references, `image`, `logo` and `areaServed`. Deliberately still absent, each with the reasoning in code comments: `geo` (the GBP map pin is what Google trusts), `openingHours` (24/7 describes staffing, would read as visiting hours), `priceRange` (fees not published).

`MedicalBusiness` was re-checked and is correct. **There is no `schema.org/ResidentialCare` type** — it 404s — so don't "fix" it to that.

**Meta descriptions** trimmed on `our-team` (203→147) and `virtual-tour` (206→154), both of which were certain to truncate mid-sentence. `privacy-policy` (196) and `cookie-policy` (187) are still long and deliberately left — nobody searches for them.

## Still open

1. **Registered Manager — still vacant, and now confirmed vacant.** Alison Woods held it and has gone. The CQC register names **Kumarasen Pillay as responsible for the regulated activity**, which looked like a lead, but the client confirmed 2026-08-13 that he is the **nominated individual / provider, NOT the Registered Manager**. Do not relitigate this — the title genuinely has no holder. Consequences already handled: the privacy notice no longer routes data protection requests to that vacant role (now "the management team at Beaconsfield House"). **Consequence NOT yet handled: `home.ts` `values[0]` still claims "Experienced registered manager aligned to our Values" on the homepage — see item 11.** When someone is appointed, update `team.ts`, `home.ts` values[0], and the privacy notice's contact paragraph together.
2. **Google Business Profile — RESOLVED 2026-08-13, and corrected a worse problem while in there.** Checked the live profile directly in the client's Chrome session rather than trusting the earlier write-up.
   - **Phone was already fixed.** The profile carries `07483 483955` as PRIMARY *and* `01934 753233` as the landline. The old `07966 284872` is gone. No action needed — the previous session's "still open" note was stale.
   - **Correct the record on where it lives:** this profile IS in the 218-business agency dashboard at `business.google.com/locations` (shop code `05551056806223735835`), contrary to the earlier note that it was only reachable through the lightweight in-search panel. Search "Truth Care" in that dashboard to find it.
   - **NEW PROBLEM FOUND AND FIXED: the primary category was "Nursing home".** That directly contradicts the CQC condition barring nursing care at this location, and was pulling the profile into the wrong local searches. **Changed to "Rehabilitation Centre"**, which matches the service's own positioning ("Specialist Residential Brain Injury Rehabilitation") and claims nothing CQC hasn't registered. Submitted 2026-08-13, showing as PENDING Google review — **verify it went live rather than assuming**.
   - **Not done: a secondary "Care home" category.** Intended, so the profile still surfaces for care-home searches alongside the rehab positioning. The environment's classifier blocked keyboard input into that field, so it needs doing by hand: dashboard → pencil icon → Business category → Add another category.
   - Also verified correct and needing no action: address and map pin, website URL, WhatsApp click-to-chat, description, and service area (Somerset / North Somerset / Weston-super-Mare). **Bristol is NOT in the service area** despite real GSC impressions for Bristol ABI searches — worth adding.
3. **CQC rating — RESOLVED AND SHIPPED 2026-08-13.** An honest registration block is now live on the homepage (`HOME.cqc`, rendered in `app/page.tsx` directly after the values cards): registration facts, an explicit "we do not have a rating yet and here is why", and an outbound link to the CQC register described as the authoritative source. The client chose this over silence. **When the first inspection happens, replace `HOME.cqc.rating` with the real published rating.** Original finding, kept for context:

   **RESOLVED AS "THERE IS NO RATING".** Checked the live CQC location page (`1-26270675575`) directly rather than continuing to chase the client for a rating. Beaconsfield House was **registered on 30 December 2025 and has not yet been inspected**; the page carries CQC's standard new-service wording ("New services are assessed to check they are likely to be safe, effective, caring, responsive, and well-led… Follow-up inspections of new services are undertaken regularly following registration") in the slot where a rating would appear. **Both SEO audits were wrong to frame this as "the rating isn't displayed" — there is nothing to display.** The remaining decision is presentational: whether to add an honest "CQC registered, awaiting first inspection" trust block, which is likely stronger than silence since families will check CQC anyway. Awaiting the client's call.
4. **Provider ID placement** — still to be decided (see legal.ts comments). **The Bristol address half of this is RESOLVED:** 339 Two Mile Hill Road, BS15 1AN is the company's registered office per Companies House, and now appears in the privacy notice in exactly that role. It is still not the visitor-facing address.
5. **Company number — RESOLVED 2026-08-13: 15651211.** Verified against the Companies House public register (TRUTH CARE GROUP LTD, active, private limited company, incorporated 16 April 2024), not supplied by the client. Now live in the privacy notice's data controller section. **ICO registration number and DPO status remain genuinely open** — the ICO register is only searchable through a form, so it could not be resolved from public record and needs the client's registration reference. DPO is the same open question as the Registered Manager title (item 1): the privacy notice directs information requests to "the registered manager", a role nobody currently holds.
6. **Formspree test submission** — flagged as needing deletion pre-launch; never confirmed done.
7. **Outcomes/case-study content, funding/commissioning page** — both flagged in both SEO audits as the biggest remaining content gaps vs. competitors. Not started.
8. **Emma Merriman's headshot is low-res** (241px source, smaller than the rest of the team) — not yet flagged to the client, worth mentioning next time headshots come up.
9. **Gallery photo softness** (exterior-side, lounge-piano, sensory-room only have ≤1200px sources) — unresolved, needs higher-res originals.
10. **Geo coordinates / opening hours** for LocalBusiness schema. **Opening hours are now effectively answered**: the client's own Google Business Profile publishes **open 24 hours, all seven days**, which is what you'd expect of a 24/7-staffed residential service and is consistent with `home.ts` values ("Motivated staff team 24/7"). That is client-published data, so it can go into the schema — **but check first whether they want 24/7 stated as *visiting* hours**, which is the likelier reading by a family member and is probably not true. Ask before shipping. Geo coordinates are still not supplied, though the GBP map pin is correctly placed and coordinates could be read off it.
11. **NEW 2026-08-13 — the homepage claims a registered manager the service does not have.** `home.ts` `values[0]` ("WELL LED") reads *"Experienced registered manager aligned to our Values – Integrity, Respect, Kindness and Optimism"*. That is live on the homepage right now, and per item 1 the Registered Manager title is vacant and confirmed vacant. This is verbatim client marketing copy carried over from the live Wix site, so it was **flagged rather than silently rewritten** — the client may have an appointment imminent, which would make it true again. If not, it should be reworded (e.g. to lead on governance rather than on a named role). Raised with the client; awaiting their call. Of everything on this list this is the one with actual regulatory exposure, since it is a specific factual claim about a CQC-significant role.
12. **NEW 2026-08-13 — the Search Console property is on `www`, but the whole site canonicalises to the apex. Fix by adding a Domain property.**

    ⚠️ **Correction to an earlier version of this entry, which was wrong.** An earlier pass of this session recorded "there is no Search Console property" after `sc-domain:truthcaregroup.co.uk` 404'd and all three signed-in Google accounts showed the "add a website" welcome screen. **That conclusion was false.** The property exists — it is a **URL-prefix property for `https://www.truthcaregroup.co.uk/`** on `paulmc18@gmail.com`. The welcome screen is not proof of zero properties; **check the property selector dropdown, not the welcome page.** The original note that GSC was already connected with ~134 clicks was correct all along (the property shows 135), and the two content changes grounded in that data stand.

    **What the property actually shows** (checked live 2026-08-13):
    - Performance: 135 web search clicks over the trailing window.
    - **Sitemap submitted 13 Aug 2026, last read 13 Aug 2026, status Success, 8 pages discovered** — so cutover checklist step 8 *was* done, contrary to the earlier note here. Don't redo it.
    - Page indexing: 5 indexed, 2 not indexed ("Crawled – currently not indexed" ×1, "Discovered – currently not indexed" ×1). **Last updated 07/08/2026, i.e. before the 13 Aug cutover** — this describes the old Wix site, not this build. Re-read it in a week before drawing any conclusion.

    **The real problem — a hostname mismatch:**
    - `https://www.truthcaregroup.co.uk/` and `https://truthcaregroup.co.uk/` **both return HTTP 200. Neither redirects to the other.** Verified directly.
    - Every canonical on both hostnames points at the **apex**, and all 8 sitemap URLs are apex.
    - So Google will consolidate on the apex — and a **URL-prefix property only reports URLs beneath its own prefix**. As consolidation proceeds, the `www` property will report progressively *less*, going quiet exactly as the new site starts to rank. The data will look like a traffic collapse that isn't one.

    **Fix 2 — DONE 2026-08-13: www now 308-redirects to the apex.** Implemented in `site/vercel.json` as a `redirects` rule with a `has` host condition, rather than via the dashboard domain setting, so it is version-controlled and travels with the repo (same reasoning as the security headers). Verified against production: all 8 pages plus `sitemap.xml`, `robots.txt` and an arbitrary 404 path each return a single-hop 308 to the exact apex equivalent, and the apex still serves 200 directly with no loop.

    ⚠️ **Gotcha worth remembering:** the first attempt used one `"source": "/:path*"` rule. That redirected every sub-path correctly but left the **www homepage returning 200** — Vercel's `:path*` does not match the bare root here. It needs an explicit `"/"` rule plus `"/:path+"` for everything below. The homepage is the URL that matters most, so this would have been a bad miss; it was only caught by testing each path against production rather than assuming the wildcard covered them.

    **Fix 1 — DONE 2026-08-13. `sc-domain:truthcaregroup.co.uk` is created and VERIFIED under `paulmc18@gmail.com`.** The client added the TXT record at GoDaddy themselves.

    **Post-change DNS safety check passed** — confirmed by live lookup after the edit, because the risk here was overwriting rather than adding: the Google token is present, the SPF record is intact, the Microsoft 365 record is intact, and all three Proofpoint MX records are present. **Email was not disturbed.** Re-run that check any time DNS is touched.

    **Sitemap:** the apex sitemap `https://truthcaregroup.co.uk/sitemap.xml` has been submitted to the new Domain property. The property also inherited the older `https://www.truthcaregroup.co.uk/sitemap.xml` entry (Success, 8 pages) — harmless, and worth leaving until the apex one reads successfully.

    ⚠️ **The apex sitemap currently shows "Couldn't fetch" with no "Last read" date.** This is the normal transient state immediately after submission, not a failure. Verified independently that the file is genuinely fine: HTTP 200, `content-type: application/xml`, valid XML, 8 `<loc>` entries, no `x-robots-tag`, `robots.txt` allows everything and declares this exact URL, and it returns 200 to a Googlebot user-agent. **Re-check in a day; if it still says "Couldn't fetch" then, investigate for real rather than assuming it is still settling.**

    Historical detail retained below.

    **DNS facts, confirmed by live lookup 2026-08-13:**
    - Nameservers are `ns73/ns74.domaincontrol.com` → **GoDaddy**.
    - Apex A record and `www` both point at `76.76.21.21` (Vercel).
    - Existing apex TXT records that **must survive untouched**: the SPF record `v=spf1 include:_spf-usg1.ppe-hosted.com include:secureserver.net ~all`, and the Microsoft 365 record `NETORGFT16701657.onmicrosoft.com`.
    - MX points at Proofpoint Essentials (`mx1/mx2/mx3-usg1.ppe-hosted.com`). **This is live email — do not touch it.**

    **The record to add** (Type `TXT`, Name/Host `@`, TTL default):
    ```
    google-site-verification=wxnFcMuW9yNKTPFo5rZJhU2SCbWaq004FbgxKTHSV_k
    ```
    This is not a secret — verification tokens are published in public DNS by design.

    ⚠️ **The one way to get this badly wrong:** GoDaddy's UI invites you to *edit* the existing TXT record rather than add a second one. Overwriting the SPF record would break outbound email deliverability for the whole business. It must be a **new, additional** TXT record on `@`.

    Google also offered an automated path ("START VERIFICATION" authorises Google to access the GoDaddy DNS account via OAuth). **Deliberately not taken** — it is an OAuth grant against the client's registrar account and needs their GoDaddy login, so it is their decision, not one to make on their behalf. The manual TXT route reaches the same result with no third-party access granted.

    After the record propagates, click VERIFY in Search Console, then submit `https://truthcaregroup.co.uk/sitemap.xml` to the new Domain property. Keep the old www URL-prefix property for historical continuity.

    **Why this matters more since fix 2:** now that www 308s away, Google will stop indexing www URLs entirely, so the existing www-scoped property will go dark *faster* than it would have done.

    Still true and unchanged: **Google is still serving the pre-cutover Wix page title** ("…Rehabilitation **Bristol**"). That is expected this soon after cutover with the sitemap only just read; re-check in a week.
13. **NEW 2026-08-13 — homepage `<title>` is 76 characters and will truncate in the SERP.** *"Truth Care Group | Brain Injury Residential Rehabilitation Weston-super-Mare"* — Google cuts around 60. The brand sits first, so the truncation eats the location, which is the part actually worth ranking for. A keyword-first version like *"Brain Injury Rehabilitation, Weston-super-Mare | Truth Care Group"* (63) would survive. **Not changed** — the current title was set deliberately with reasoning recorded in `app/page.tsx`, and reordering a homepage title is a branding call. Raise it with the client.
14. **NEW 2026-08-13 — `team.ts` nursing wording was changed, but the bios were not audited.** The page-level heading and lede now draw the personal-care-vs-nursing-care distinction correctly. The six individual bios below are the client's verbatim copy and were deliberately left untouched; they have **not** been read line-by-line against the no-nursing-care condition of registration. Worth doing next time the team page is open.

## Decisions made — do not relitigate

Everything from the original build (Weston-super-Mare not Bristol, no cookie banner, Giraffe360 click-to-load, Formspree without postal address, no URL changes) still stands — see `docs/HANDOVER.md` for the full list with reasoning. Additionally as of this session: **Vercel is the production host** (not GitHub Pages, not Netlify), decided explicitly by the client when asked.
