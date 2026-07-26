# Truth Care Group — Rebuild Scope v2.1

**Supersedes:** `truth-care-group-rebuild-brief.md` and `truth-care-group-investor-addendum.md`. Both parked, not deleted.
**Scope:** like-for-like rebuild of the existing six pages, clean and fast. No new sections, no features.
**Updated:** 26 July 2026 — now includes measured brand tokens and full asset inventory.

---

## 1. The call

**Static Next.js build, six pages, images self-hosted. ~2 days.**

**Confirmed:** site is owner-controlled — no client self-editing requirement, so no CMS. This removes the only condition that would have argued for staying on Wix.

---

## 2. Pages — same six, same URLs, same content

| URL | Change |
|-----|--------|
| `/` | Same content, same order. Cleaner spacing and type. |
| `/services-facilities` | Same. Gallery rendered once, not three times. |
| `/virtual-tour` | Needs a decision — see §6 |
| `/who-we-support` | Same, including all six FAQs |
| `/our-team` | Same six bios verbatim |
| `/contact-us` | Same. Form delivers to email + stored record. |

No URL changes → no redirect map, no ranking risk.

---

## 3. Design tokens — measured from the existing brand assets

Sampled directly from `brand-logo.png`, `brand-mark-head.png` and the decorative elements.

```css
--navy:          #0F2C3F;  /* primary. 14.5:1 on white */
--orange:        #F5921E;  /* brand accent. 2.4:1 on white — FILL ONLY */
--orange-text:   #AD5A10;  /* darkened for text on white. 4.94:1 — AA pass */
--orange-text-lg:#C4661A;  /* large text (18pt+/14pt bold) only. 3.99:1 */
--ink:           #1A1A1A;
--paper:         #FFFFFF;
--muted:         #5A6570;
```

**Contrast rules — these are the polish job, not optional niceties:**

| Combination | Ratio | Verdict |
|---|---|---|
| `--orange` text on white | 2.4:1 | ❌ Fails AA. Currently used on the live site. |
| `--orange-text` on white | 4.94:1 | ✅ Use for any orange text |
| `--navy` text on `--orange` | 6.2:1 | ✅ Correct button treatment |
| White text on `--navy` | 14.5:1 | ✅ |
| `--navy` on white | 14.5:1 | ✅ Body copy |

Orange is a fill, an accent and a graphic device. It never carries body text on white.

---

## 4. Asset inventory — all 32 files pulled at source resolution

Retrieved from the Wix CDN by stripping the transform segment. Brochure PDF also pulled (3.6 MB). **Status: done.**

**Healthy — 2000×1500 originals:**
`exterior-front`, `bedroom-01`, `bedroom-02`, `garden-patio`, `interior-living-sloped`, `interior-lounge-wide`
Plus `brand-logo` (2400×2400), the five service icons (2000×2000), `team-caz-icke` (1494×1906), `team-gerry-roxburgh` (1170×1715), `team-henk-swanepoel` (1034×1600), `team-emily-kerr` (1024×1536).

**Flagged:**

| File | Actual | Issue | Action |
|---|---|---|---|
| `team-kumi-pillay` | 600×800 | Too small for a portrait block | Request original, or crop tighter |
| `team-alison-woods` | 615×640 | Small, and it's the group *team photo* file doing duty as her portrait | Request a proper headshot |
| `exterior-blue-sky` | 768×512 | Unusable above thumbnail | Drop, or replace with `exterior-front` |
| `exterior-side` | 1383×922 | Borderline | Usable at contained widths only |
| `interior-lounge-piano` | 1536×1024 | Borderline | Usable at contained widths only |
| `interior-sensory-room` | 1536×1024 | Borderline | Usable at contained widths only |

### ⚠️ Provenance check — do this before launch

Several images land on exactly 1536×1024 and 768×512 — characteristic generated-image dimensions. `exterior-blue-sky` in particular is a 711 KB PNG at 768×512, which is not how a camera produces a photo.

If any image purporting to show **Beaconsfield House** is AI-generated rather than a real photograph, it must be pulled. Misrepresenting the physical premises on a CQC-regulated service's website is a regulatory issue, not a design one. Stock lifestyle imagery (`lifestyle-dogwalk`, `lifestyle-group`) is a different matter — tacky, but not misleading.

**Check first:** `exterior-blue-sky`, `interior-lounge-piano`, `interior-sensory-room`, `misc-header`.

### Processing pipeline
1. Strip EXIF from every photograph — embedded GPS on care-home property shots is a safeguarding issue
2. Rename semantically (`beaconsfield-house-ensuite-bedroom.jpg`, not `83a797_0193d9...~mv2.jpeg`)
3. Serve AVIF/WebP responsively via `next/image`, originals retained ≥2000px long edge
4. Rewrite every `alt` attribute — the current set describes what a vision model saw, not what the image is. The *Well Led* icon's alt text currently reads "Faint coordinate system diagram with sparse data points on a black background."

---

## 5. What "polish" means

- **Typography and spacing.** One type scale, consistent vertical rhythm, controlled measure. This is 80% of what makes a site read as expensive.
- **898 KB of HTML → under 120 KB.** Static, minimal JS.
- **Contrast fixed** per §3.
- **Images self-hosted**, EXIF-stripped, responsive.
- **Mobile pass.** Tap targets ≥24px, no layout shift.
- **Alt text rewritten** throughout.

---

## 6. `/virtual-tour` — needs a decision

The page currently has a heading, a decorative blob and four bullets. There is no tour. Copying that verbatim ships a broken promise on the highest-intent page.

| Option | Cost | Verdict |
|---|---|---|
| Rename "Take a Look Inside", populate with the ten real property photos | 1 hour | **Recommended** |
| Fold into `/services-facilities`, drop the nav item | 30 min | Acceptable |
| Commission a Matterport | £400–800 | Good, but a client spend decision |

---

## 7. The four things I'd still insist on

Three are under an hour. One is a legal requirement.

1. **The broken referral mailto.** `info@truthgroupcare.co.uk` on the homepage hero — domain transposed. Fix on the live site today, independent of the rebuild. Every referral sent from that button has bounced.
2. **FAQ schema on `/who-we-support`.** Six FAQs already written and sitting unmarked. `FAQPage` JSON-LD is 20 minutes and it's the highest-return SEO action available here.
3. **Complete the existing schema.** Current `LocalBusiness` block has no phone, no geo, no hours. Three fields. Feeds the knowledge panel.
4. **Privacy notice and cookie policy.** Not polish — the contact form collects personal data on a health service's site. A UK form with no privacy notice is an ICO exposure. Half a day including a basic consent banner.

---

## 8. Explicitly out of scope

Group pages, outcomes dashboard, investor room, careers, condition pages, area pages, blog, referral portal, live availability, chatbot, CMS, animation, data room. Parked in the two earlier documents if the picture changes.

---

## 9. Delivery

| Day | Work |
|---|---|
| 0 | Fix the live mailto. Answer §10. |
| 1 | Scaffold, process images, build all six pages |
| 2 | Type/spacing pass, contrast fix, schema, alt text, legal pages, Lighthouse, preview deploy |
| 3 | Review, amends, DNS cutover (not a Friday) |

**Targets:** HTML <120 KB · LCP <1.5s · Lighthouse Perf ≥95 · A11y 100

---

## 10. Open questions

1. **Landline** — is there one to add alongside the mobile, or confirm mobile-only?
2. **Contact form** — where does it deliver to? (`info@truthcaregroup.co.uk` assumed.)
3. **Virtual tour** — which of the three options in §6?
4. **Image provenance** — are the four flagged files real photographs of Beaconsfield House?
5. **Headshots** — can you get originals for Kumi and Alison, or work with what's there?
