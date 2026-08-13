# Handover: truthcaregroup.co.uk rebuild

26 July 2026 — updated 13 August 2026: **the site is live.** DNS cut over on 13 August; `truthcaregroup.co.uk` now serves this rebuild on Vercel, not Wix. The "Before you launch" section below is kept for the record but has been superseded by "Status since launch" — read that first.

This is the client-facing handover for the rebuilt site. It covers what was built, how to run it, the measured results, and the open items that still need your answer.

## What was built

A static Next.js rebuild of truthcaregroup.co.uk: 8 content pages (home, services & facilities, virtual tour, who we support, our team, contact us, privacy notice, cookie policy) plus a 404 page, sitemap and robots.txt. No server, no database, no cookies, no third-party requests on page load. The enquiry form posts to Formspree. The virtual tour is a real Giraffe360 360° tour behind a click-to-load button, so nothing is requested from Giraffe360 until a visitor chooses to load it.

Stack: Next.js (App Router, static export), Tailwind, TypeScript, Playwright for testing. Content lives in `site/src/content/*.ts` as plain data files, separate from markup. Editing copy does not mean touching page code.

### Running it

```bash
cd site
npm install
npm run dev        # local dev server, http://localhost:3000
npm run build      # static export to site/out/
npm run test:e2e   # builds, then runs the full Playwright suite
```

`npm run build` produces `site/out/`, a folder of plain HTML/CSS/JS/images that any static host can serve. That folder is what goes live.

## Measured results

### Lighthouse (desktop preset, against the production build)

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| `/` (home) | 100 | 100 | 96 | 100 |
| `/virtual-tour` (heaviest page) | 100 | 100 | 96 | 100 |

Target was Performance ≥95 and Accessibility 100. Both pages clear that comfortably, at maximum score.

The Best Practices 96 is not a real issue. The site pins `next@16.2.12`, a stable release, not a canary — the prefetch 404 below is a genuine behaviour of that stable version, not a canary quirk. The client-side router prefetches other pages' data using a filename pattern (`page.__PAGE__.txt`) that doesn't quite match what the static export writes to disk, so hovering a nav link logs a harmless 404 in the console. It doesn't affect anything a visitor sees or does; full page navigation still works. Fixing it means patching Next.js router internals, which is out of scope for a content rebuild. Worth knowing about, not worth chasing.

### HTML weight per page (built output, `site/out/`)

| Page | Size |
|---|---|
| `index.html` | 72 KB |
| `virtual-tour.html` | 62 KB |
| `who-we-support.html` | 60 KB |
| `our-team.html` | 58 KB |
| `privacy-policy.html` | 68 KB |
| `services-facilities.html` | 45 KB |
| `cookie-policy.html` | 46 KB |
| `contact-us.html` | 28 KB |
| `404.html` | 21 KB |

Target was every page under 120 KB. The heaviest page is 72 KB, 61% under target and 92% lighter than the live Wix homepage's 898 KB.

### Tests

38 of 38 Playwright tests pass: accessibility (axe), keyboard-only navigation, the no-cookies-set assertion on every page, the virtual tour's click-to-load facade, form validation, and visual regression on the reveal animations.

### TypeScript

`npx tsc --noEmit` is clean.

## Status since launch (13 August 2026)

**Resolved:**
- Legal name confirmed against your actual CQC Certificate of Registration (item 1 below)
- Image provenance confirmed — the two flagged photos are genuine (item 3 below)
- "Last updated" date set to the real launch date (item 14 below)
- Landline added (item 7 below) — you provided `01934 753233`
- Security headers set at the host (item 8 below) — Vercel, via `vercel.json`
- Phone number resynced to your current one (`07483 483955`) across the whole site
- Team page resynced to match your live changes (Emma Merriman now appears in place of Alison Woods)

**Also resolved 13 August, by checking the public registers instead of waiting on you:**
- **Your company number is 15651211** — taken from the Companies House register, verified, and now stated in the privacy notice as it should be.
- **The Bristol address question is answered.** 339 Two Mile Hill Road, BS15 1AN is your registered office on the Companies House register. That's exactly the role it now plays in the privacy notice. Beaconsfield House remains the address anyone actually writes to; nothing visitor-facing changed.
- **The CQC rating question is answered too, and the answer changes the job** — see item 1 below.

**Still open, in priority order:**

**Done since, on 13 August:**

- **The CQC question is settled, and the site now handles it honestly.** There is no rating to display: Beaconsfield House was registered on 30 December 2025 and **has not been inspected yet**. Both SEO audits framed this as "the rating isn't on the site" — that framing was wrong, and no amount of chasing you would have produced a rating that doesn't exist. Your homepage now carries a short regulation block that states your registration facts, says plainly that no rating exists yet and why, and links to your CQC entry as the authoritative source. Families check CQC regardless; getting ahead of it reads as confidence where silence reads as concealment.
- **The nursing wording is fixed.** CQC registered you with an explicit condition that Beaconsfield House **must not provide nursing care**, while your team page was headed "Specialists across neuropsychiatry, therapy and nursing". The heading now says "clinical care", and the line beneath it spells out the distinction: your team's backgrounds do span nursing, but the service is registered for personal care rather than nursing care. Your clinicians' individual nursing registrations stay in their bios, untouched.
- **The privacy notice no longer sends people to a role nobody holds.** It used to direct data protection requests to "the registered manager". Since that title is vacant, those requests now go to the management team at Beaconsfield House.
- **I checked the rest of the site against your conditions of registration.** Your "six bedrooms" copy matches the maximum-of-six condition exactly, and you make no learning-disability or autism claims. Both clean, no action needed.

**Still open, in priority order:**

1. **You don't have a Google Search Console account for the site, and that's blocking everything to do with getting found.** I checked all three Google accounts signed in on your machine — none of them has a property for truthcaregroup.co.uk. That means nobody can submit your sitemap, ask Google to re-crawl the new site, or see which searches are finding you.

   You can see the effect already: search for yourself and Google still shows the **old Wix page title**, with "Bristol" in it. Nothing has told Google the site changed.

   I have to correct something I told you earlier in this document, and something in my own notes: I'd said to "request re-indexing in Search Console". That isn't possible yet, because the account doesn't exist. My notes also claimed Search Console was already connected with 90 days of data — that data was real, but it almost certainly came from Wix's own SEO dashboard, not Search Console. I'd rather flag that than let you rely on it.

   **What I need from you: which Google account should own this?** It's a business asset, so it's your call rather than mine. Once you tell me, setting it up is quick — I can verify ownership through the site's own code and submit the sitemap the same day.

2. **Your homepage claims a registered manager you don't currently have.** Under "Our Services Are", the WELL LED card reads *"Experienced registered manager aligned to our Values"*. That's your own copy carried over from the Wix site, and it's live right now while the Registered Manager post is vacant. **I've deliberately not rewritten it**, because if you have someone starting shortly it becomes true again and no change is needed. But of everything on this list it's the one carrying real regulatory exposure, because it's a specific factual claim about a CQC-significant role. Tell me which way to go: leave it, or reword it to lead on governance rather than on a person.

2. **Nobody is named as Registered Manager.** Confirmed genuinely vacant — you've told me Dr Pillay is the nominated individual rather than the Registered Manager, so the CQC register's "responsible for these services" line isn't the answer. When you appoint someone, tell me and I'll update the team page, the homepage card above, and the privacy notice together.

3. **Your Google Business Profile — phone was already fixed, but I found something worse and corrected it.** Both your numbers are on there correctly (`07483 483955` as primary, plus the landline), so that item is closed. **However, your profile's primary category was set to "Nursing home"** — which contradicts the CQC condition that Beaconsfield House must not provide nursing care, and was putting you in front of people searching for something you're not registered to offer. I've changed it to **"Rehabilitation Centre"**, which matches how you describe yourselves. Google shows it as pending review; it normally clears within minutes.

   **Two small things there still worth doing, which I couldn't complete:** add a **second category** so you still appear for care-home searches, and add **Bristol to your service area** (it currently lists Somerset, North Somerset and Weston-super-Mare only, despite real Bristol searches finding you).

   ⚠️ **On the second category — Google will reject anything you type by hand.** If you type "Care Home" you'll get *"We didn't understand your category."* You have to pick from the dropdown that appears as you type, because only Google's exact category names are accepted. Type `care` or `residential` and take whichever of their suggestions fits best.

   **Your profile description is also weak for search** — it's your mission statement, with no mention of where you are, what conditions you treat, or who should refer. Google gives you 750 characters and you're using 331 of them. Here's a replacement (746 characters, so it fits) that covers brain injury, stroke, alcohol-related brain damage, your location and catchment, your therapy disciplines, and your CQC registration — while carefully not claiming nursing care:

   > Truth Care Group provides specialist residential rehabilitation for adults living with acquired or traumatic brain injury, stroke and alcohol-related brain damage, at Beaconsfield House in Weston-super-Mare, North Somerset.
   >
   > Six en-suite bedrooms and therapy space support slow-stream neurorehabilitation from a multidisciplinary team spanning neuropsychiatry, neuropsychology, neurophysiotherapy, occupational therapy and speech and language therapy. Residents work towards personalised SMART goals, building independence and community reintegration.
   >
   > Registered with the Care Quality Commission for accommodation and personal care. We welcome referrals from case managers, commissioners and families across Somerset, Bristol and the South West.

   Paste that into **Edit profile → About → Description**. Don't add a phone number or web address to it — Google rejects descriptions containing those.

4. **ICO registration number** — the one legal item I genuinely could not resolve from the public registers, because the ICO's is only searchable through a form. If you're registered, send me the reference and I'll add it. If you believe you're exempt, tell me and I'll note the exemption instead. (Company number and DPO are dealt with above.)

5. **Delete the test Formspree submission** (item 2 below) — never confirmed done.

6. **Provider ID placement** — your CQC certificate carries a provider-level ID distinct from the site's location-level one. Still your call whether it appears anywhere. (The Bristol address half of this question is now resolved, above.)

Full detail on all of this lives in `docs/SESSION-RESUME.md` and the latest SEO audit, `docs/SEO-AUDIT-2026-08-13.md`.

## Before you launch: everything that needs your answer

*(Original pre-launch checklist — kept for the record. Several items above are now resolved; see "Status since launch.")*

Nothing below is a defect. It's either a fact only you can confirm, or a decision that's yours to make.

### 1. Legal pages: 18 flagged claims

The privacy notice and cookie policy are new; the live site has no privacy notice at all. Several of the specifics in the new ones were written as **defensible standard positions**, not facts you gave me. Each is marked `NEEDS CONFIRMATION` in a comment in `site/src/content/legal.ts`, right above the sentence it applies to, so nothing here is buried.

| # | Claim as written | What needs confirming |
|---|---|---|
| 1 | Data controller is "Truth Care Group Ltd" | The exact registered legal name, sourced from a CQC register comment, not from you. |
| 2 | Company registration number: omitted | Needs adding. |
| 3 | ICO registration: omitted | Most controllers must pay the ICO data protection fee. Needs the registration number, or confirmation of exemption. |
| 4 | No DPO claimed; enquiries go to "the registered manager" | Confirm whether a DPO is appointed and who the named responsible person actually is. |
| 5 | "Separate privacy information given to residents when a placement begins" | Rewritten so it no longer claims a specific document exists. If one does exist (or should), name and link it. |
| 6 | Lawful basis: Art 6(1)(f) legitimate interests | Standard and appropriate, but a documented Legitimate Interests Assessment should exist to back it up. |
| 7 | Special category basis: Art 9(2)(h) + DPA 2018 Sch 1 Pt 1 para 2 | The right route for a CQC provider, but needs an Appropriate Policy Document confirmed to exist. |
| 8 | Formspree transfer under the UK IDTA/Addendum to the EU SCCs | Verify against Formspree's actual current DPA and sign it. Written from general knowledge, not from reading their live terms. |
| 9 | 12-month retention for enquiries that go nowhere | Invented figure, needs sign-off against your own records policy. |
| 10 | Converted enquiries kept under the Records Management Code of Practice | Confirm that's actually the schedule you follow. |
| 11 | Email provider and web hosting provider: unnamed | Both are data processors and should be named once hosting is fixed (see DNS section below). |
| 12 | "We will tell the ICO within 72 hours" | Statutory and safe to state, but confirm you actually have an incident process to deliver it. |
| 13 | "Access limited to staff who need it" | Confirm mailbox and Formspree account access is genuinely restricted. |
| 14 | "Last updated 26 July 2026" | Placeholder. Change to the real publication date at launch. |
| 15 | "No analytics" (cookie policy) | True of this build. Becomes false the moment you add analytics; update the page then. |
| 16 | Server access logs paragraph is deliberately generic | Once hosting is chosen, confirm what it actually logs, for how long, and tighten the wording. |
| 17 | Giraffe360's own cookie/storage behaviour once the tour is loaded | Not verified against Giraffe360's documentation. Check it and either name what they set or confirm it's nothing. |
| 18 | New in this pass: virtual tour discloses the visitor's IP to Giraffe360 | The privacy notice now states this as a certain fact (any connection discloses IP) without claiming anything about what Giraffe360 does with it. If there's more to say once item 17 is checked, add it here too. |

**Get a solicitor or your insurer to read the privacy notice before DNS cutover.** It's written to be reviewable, not to be treated as final legal advice.

### 2. A live TEST submission is sitting in your Formspree inbox

Someone (me, testing) submitted a test enquiry through the live form during the build. It's real, it's in your Formspree account now, and it needs deleting before launch so it isn't mistaken for a genuine enquiry.

### 3. Image provenance: this one is a regulatory issue, not a nice-to-have

Five image files in the build land on exactly 1536×1024 pixels, a dimension characteristic of AI image generation, not a camera:

- `interior-lounge-piano`
- `interior-sensory-room`
- `lifestyle-cooking`
- `lifestyle-dogwalk`
- `graphic-conditions-overview`

Of these, **two are live on the site and captioned as real photographs of Beaconsfield House**: the lounge/piano shot and the sensory room shot, both in the virtual-tour gallery with captions ("Lounge and dining area", "The sensory room") that present them as the actual rooms. The other three (`lifestyle-cooking`, `lifestyle-dogwalk`, `graphic-conditions-overview`) were never linked from any page, but they were not just unused files sitting harmlessly in the image pipeline: they still built into `site/out/images/` and were publicly fetchable by anyone who found or guessed the URL. That's now fixed — all three have been removed from `assets-src/` and no longer ship in the build. The lounge and sensory room images below are the only provenance question still open.

If the lounge and sensory room images are AI-generated rather than real photographs of the premises, **they must be pulled before launch.** Misrepresenting what a CQC-regulated care home's rooms actually look like is a regulatory problem, not a cosmetic one: a prospective family or a CQC inspector has a reasonable expectation that a photo captioned "the sensory room" is the sensory room. Please confirm the provenance of these two images specifically. If they're AI-generated, send me real photographs of the lounge/dining area and the sensory room and I'll swap them in; that's a five-minute fix once I have the files.

### 4. Better headshots wanted

Dr Kumi Pillay's and Mrs Alison Woods's headshots only have a single 480px-wide source image each, versus proper multi-resolution originals for the rest of the team. They display fine at current sizes but there's no room to display them any larger without softening. If you have higher-resolution originals, send them over and I'll reprocess.

### 5. Three gallery photos are slightly soft in the lightbox on high-resolution screens

The exterior side view, the lounge/piano shot and the sensory room shot only have source files up to 1200px wide, while the rest of the gallery goes up to 2000px. On a standard screen this is invisible; in the lightbox's full-size view on a retina/high-DPI display, these three are noticeably softer than the others. No fix is possible without a higher-resolution original of each. Not urgent, but worth knowing before this gets scrutinised on someone's screen at full size. (This is separate from item 3 above: the softness issue applies regardless of whether the images turn out to be real photos or not.)

### 6. Structured data: geo coordinates and opening hours needed

The site's schema markup (the structured data that helps Google show a proper business listing) is missing the location's latitude/longitude and opening hours, both left out because I don't have them. Send me the postcode-accurate coordinates (or I can look them up from the address) and your actual visiting/opening hours, and I'll add both.

### 7. Is there a landline?

The site currently only has the mobile number (07966 284872), pulled from the live site and the CQC register. If there's a landline you'd rather list as the primary contact number, tell me and I'll add or swap it.

### 8. Security headers need setting at the host

A static export has no server of its own, so it cannot set its own HTTP response headers — whatever host you choose (Vercel, Netlify, or similar) needs these configured:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`

Vercel and Netlify both support this through a config file (`vercel.json` / `netlify.toml`); tell me which host you land on and I'll add it before cutover.

**One warning if a strict Content-Security-Policy gets added later:** `site/src/app/layout.tsx` ships a small inline `<script>` in `<head>` (it sets a flag class on `<html>` so scroll-reveal content stays visible if JavaScript is unavailable — see globals.css). A strict CSP without `'unsafe-inline'` blocks inline scripts by default, so that script would need a nonce added. Miss this and every scroll-reveal animation on the site silently stops working, with nothing in the console to point at why. The four headers above don't touch this; only a future CSP addition would.

## A separate fix, not part of this rebuild: do this today

**The current live Wix homepage's "Make a Referral" button points at `mailto:info@truthgroupcare.co.uk`.** That domain is transposed; it should be `truthcaregroup.co.uk`. Every referral anyone has sent by clicking that button has bounced, silently, with no error shown to the sender. This has nothing to do with the rebuild and doesn't need to wait for DNS cutover. Go into Wix today and fix that link. I'd treat this as the most urgent item in this whole document.

## Decisions made during the build you should know about

- **Every public URL is unchanged.** All six live URLs — the homepage plus `/services-facilities`, `/virtual-tour`, `/who-we-support`, `/our-team` and `/contact-us` — carry over to the rebuild exactly as they are now. That means no redirect map is needed and no ranking risk from the migration itself: search engines see the same URLs before and after cutover, just with new content behind them. You're approving a DNS cutover, not a URL migration, and that's the single biggest risk in a rebuild like this, so it's worth stating plainly rather than leaving you to assume it.
- **Weston-super-Mare, not Bristol, used throughout.** The live site's page titles say Bristol, but Beaconsfield House's actual CQC-registered address is in Weston-super-Mare. I've used the real address everywhere except the team bios, where "Bristol" correctly refers to hospitals staff previously worked at (Frenchay, Southmead); that's accurate and stays.
- **No cookie consent banner.** This build sets zero cookies and writes nothing to local or session storage, verified by an automated test that runs on every page. The virtual tour is click-to-load specifically so this stays true. Under UK PECR, a consent banner is only required when you're storing something on a visitor's device; since nothing is stored, a banner would just be a box people dismiss for no reason. If you ever add analytics, a booking widget, or anything else that sets a cookie, this decision needs revisiting and a real consent banner needs to go in before that ships.
- **The contact form no longer asks for a postal address.** The old Wix form collected first name, last name, email, address, phone and a message. The new form drops the postal address: a name, email and phone number is enough to start a conversation, and collecting a full postal address up front doesn't serve any real purpose for a first enquiry. This is data minimisation, done deliberately, not an oversight.

## DNS cutover checklist

Do this on a weekday, ideally Tuesday to Thursday, with a full working day ahead of you in case something needs a quick fix. **Not a Friday.** If something goes wrong with DNS propagation or the new host, you don't want to be finding that out on a Saturday with no one around to fix it.

1. Resolve every item in "Before you launch" above, especially the two AI-image provenance checks and the legal sign-off. Don't cut over with those outstanding.
2. Fix the live Wix mailto typo immediately (see above), independent of everything else. Do this first regardless of timing.
3. Choose and provision final hosting for the static build (Vercel, Netlify, or similar; see the deploy section below for a working example).
4. Set the real "last updated" date in `site/src/content/legal.ts` (item 14) and rebuild.
5. Delete the test Formspree submission (item 2).
6. Point the domain's DNS at the new host. Keep the current TTL low for 24 to 48 hours beforehand if you can, so the eventual cutover propagates fast.
7. Once DNS has propagated, check the live domain loads all 8 pages, the enquiry form submits successfully to your real Formspree inbox, and the virtual tour loads.
8. Submit the new sitemap to Google Search Console and request re-indexing of the homepage.
9. Keep the old Wix site accessible (unpublished from search, not deleted) for a couple of weeks in case you need to roll back.
10. Monitor the Formspree inbox and email deliverability for the first week after cutover.

## Deploy — this is now production, not a preview

**https://truthcaregroup.co.uk is live on Vercel.** DNS cut over on 13 August 2026: both the apex and `www` point at Vercel's `76.76.21.21`, verified propagated and all 8 pages returning 200 directly against the real domain. Your email (MX records, separate infrastructure) was untouched by this change.

Any future content or code change needs two steps to actually go live — pushing to GitHub alone only updates the GitHub Pages preview, not the real site:

```bash
# 1. commit and push (from the repo root)
git add <files>
git commit -m "..."
git push origin main

# 2. deploy to the live domain (from site/)
cd site
npx vercel deploy --prod
```

The Vercel CLI is already authenticated on this machine against the `truthcaregroup` project under your account, so `--prod` ships straight to `truthcaregroup.co.uk` with no further setup.
