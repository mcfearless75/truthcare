# Truth Care Group Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild truthcaregroup.co.uk as a fully static, premium-quality Next.js site — six scoped pages plus legal pages, editorial gallery, Formspree contact form.

**Architecture:** Next.js App Router with `output: 'export'` (zero server). Content lives in typed TS content files (`src/content/`), pages are thin compositions of small components. Images pre-processed once by a sharp script into responsive AVIF/WebP served through a `<Pic>` picture-element component.

**Tech Stack:** Next.js 15 + TypeScript, Tailwind CSS v4, next/font (Fraunces + Figtree), sharp (build-time image pipeline), Formspree, Playwright (smoke tests).

## Global Constraints

- All work happens in repo root: `C:\Users\LAPTOP80\Desktop\_Apps_Code\ALL APPS\truthcare` (site code in `site/` subfolder so docs stay clean).
- Brand tokens verbatim from spec §4: `--navy:#0F2C3F` `--orange:#F5921E` `--orange-text:#AD5A10` `--orange-text-lg:#C4661A` `--ink:#1A1A1A` `--paper:#FFFFFF` `--muted:#5A6570`.
- **Orange `#F5921E` is never used as text colour on white.** Buttons: navy text on orange fill, or white on navy.
- Same six public URLs as live site: `/`, `/services-facilities`, `/virtual-tour`, `/who-we-support`, `/our-team`, `/contact-us`. Plus `/privacy-policy`, `/cookie-policy`, 404.
- Content is copied **verbatim** from the live site (https://truthcaregroup.co.uk) — no rewriting of client copy. Alt text IS rewritten (spec §5).
- Formspree endpoint: `https://formspree.io/f/xzdnklod`.
- Zero cookies set by us → no consent banner needed (cookie policy page still ships).
- Targets: HTML <120 KB/page, Lighthouse Perf ≥95, A11y 100, tap targets ≥24px, `prefers-reduced-motion` respected.
- British English in all copy we author (labels, legal pages, alt text).
- Commit after every task with conventional commit messages.

---

### Task 1: Scaffold, tokens, fonts, global layout shell

**Files:**
- Create: `site/` via create-next-app, then `site/src/app/globals.css`, `site/src/app/layout.tsx`, `site/next.config.ts` (modify generated), `site/src/lib/site.ts`

**Interfaces:**
- Produces: `SITE` constant (`site/src/lib/site.ts`) — `{ name, url, phone, email, address, cqcUrl }` consumed by footer, contact page, schema.
- Produces: Tailwind theme tokens `navy, orange, orange-text, orange-text-lg, ink, paper, muted`, font vars `--font-display`, `--font-body`.

- [ ] **Step 1: Scaffold**

```bash
cd "C:\Users\LAPTOP80\Desktop\_Apps_Code\ALL APPS\truthcare"
npx -y create-next-app@latest site --ts --app --tailwind --eslint --no-src-dir=false --src-dir --import-alias "@/*" --use-npm --turbopack
```

Expected: `site/` exists, `npm run dev` starts. (If prompted, answer to match flags.)

- [ ] **Step 2: Static export config**

Replace `site/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: false,
  images: { unoptimized: true }, // images pre-processed by scripts/process-images.mjs
};

export default nextConfig;
```

- [ ] **Step 3: Tokens + base styles**

Replace `site/src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-navy: #0f2c3f;
  --color-orange: #f5921e;
  --color-orange-text: #ad5a10;
  --color-orange-text-lg: #c4661a;
  --color-ink: #1a1a1a;
  --color-paper: #ffffff;
  --color-muted: #5a6570;

  --font-display: var(--font-fraunces);
  --font-body: var(--font-figtree);

  --text-hero: clamp(2.5rem, 1.4rem + 4.5vw, 4.5rem);
  --text-h2: clamp(1.75rem, 1.3rem + 1.8vw, 2.75rem);
  --text-h3: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
  --text-lede: clamp(1.0625rem, 1rem + 0.3vw, 1.25rem);

  --space-section: clamp(4rem, 3rem + 5vw, 8rem);

  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}

html {
  scroll-behavior: smooth;
}

body {
  @apply bg-paper text-navy font-body antialiased;
}

::selection {
  background: var(--color-orange);
  color: var(--color-navy);
}

:focus-visible {
  outline: 3px solid var(--color-orange-text);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* scroll reveal (Task 3 wires the observer) */
.reveal {
  opacity: 0;
  transform: translateY(1.25rem);
  transition: opacity 0.7s var(--ease-out-expo), transform 0.7s var(--ease-out-expo);
}
.reveal.is-visible { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
}
```

- [ ] **Step 4: Site constants**

Create `site/src/lib/site.ts` (phone/address verbatim from live site footer/contact page — fetch with `curl -s https://truthcaregroup.co.uk/contact-us` if unsure):

```ts
export const SITE = {
  name: "Truth Care Group",
  url: "https://truthcaregroup.co.uk",
  phone: "+44 7XXX XXXXXX", // REPLACE with the number shown on the live contact page before committing
  email: "info@truthcaregroup.co.uk",
  address: {
    name: "Beaconsfield House",
    locality: "Bristol",
    region: "England",
    country: "GB",
  },
  formspree: "https://formspree.io/f/xzdnklod",
} as const;
```

**The `7XXX` placeholder must be replaced with the real number from the live site in this task — do not commit the placeholder.** Same for any address lines shown on the live contact page.

- [ ] **Step 5: Root layout with fonts**

Replace `site/src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/site";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Truth Care Group | Brain Injury Residential Rehabilitation Bristol",
    template: "%s | Truth Care Group",
  },
  description:
    "Personalised, community-based residential rehabilitation for adults living with acquired or traumatic brain injury in Bristol.",
  openGraph: {
    type: "website",
    siteName: "Truth Care Group",
    locale: "en_GB",
    images: [{ url: "/images/beaconsfield-house-exterior-front/1200.jpg", width: 1200, height: 900 }],
  },
};
// Each page exports its own `metadata` with page-specific title + description;
// OG image inherits from here unless a page overrides it.

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${fraunces.variable} ${figtree.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Verify build**

```bash
cd site && npm run build
```

Expected: build succeeds, `site/out/index.html` exists.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js static export with brand tokens and fonts"
```

---

### Task 2: Content extraction from live site

**Files:**
- Create: `site/src/content/types.ts`, `site/src/content/home.ts`, `site/src/content/services.ts`, `site/src/content/support.ts`, `site/src/content/team.ts`, `site/src/content/contact.ts`
- Create (scratch, not committed): raw page dumps in the session scratchpad

**Interfaces:**
- Produces: typed content objects — `HOME`, `SERVICES`, `SUPPORT` (incl. `faqs: Faq[]`), `TEAM: TeamMember[]`, `CONTACT`. Page tasks import these; they never hardcode copy.

- [ ] **Step 1: Dump all six live pages to scratch**

```bash
for p in "" services-facilities virtual-tour who-we-support our-team contact-us; do
  curl -sL "https://truthcaregroup.co.uk/$p" -o "$CLAUDE_SCRATCHPAD/live-${p:-home}.html"
done
```

Expected: six HTML files. (If `$CLAUDE_SCRATCHPAD` unset, use the session scratchpad path from the system prompt.)

- [ ] **Step 2: Define content types**

Create `site/src/content/types.ts`:

```ts
export interface Faq {
  question: string;
  answer: string; // may contain \n\n for paragraphs
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string; // key into image manifest, e.g. "team-caz-icke"
}

export interface ServiceValue {
  title: string; // e.g. "WELL LED"
  body: string;
  icon: string; // image key, e.g. "icon-well-led"
}

export interface GalleryImage {
  key: string; // image key
  alt: string; // rewritten, human alt text
  caption?: string;
}
```

- [ ] **Step 3: Transcribe content verbatim into content files**

Read each scratch HTML dump (extract visible text) and populate the five content files. Copy client copy **verbatim** — punctuation, casing, the lot. Known homepage content for cross-checking (already verified live):

- Hero: "Specialist Residential Brain Injury Rehabilitation" / "Personalised, community-based rehabilitation for adults living with acquired or traumatic brain injury." / CTAs "Arrange a Visit" + "Make a Referral"
- Strips: "EXPERIENCED SPECIALIST MDT", "GOAL FOCUSED COMMUNITY REHABILITATION", "OPTIMISING INDEPENDENCE"
- Mission: three paragraphs beginning "Truth Care Group develops specialist residential services…"
- Five values: WELL LED, RESPONSIVE, SAFE, EFFECTIVE, CARING with their one-line bodies
- Beaconsfield teaser bullets: "Six, spacious en-suite bedrooms", "Dedicated therapy spaces", "Communal living areas", "Secure outdoor garden and dining areas"

Shape (example, `site/src/content/home.ts`):

```ts
import type { ServiceValue } from "./types";

export const HOME = {
  hero: {
    title: "Specialist Residential Brain Injury Rehabilitation",
    lede: "Personalised, community-based rehabilitation for adults living with acquired or traumatic brain injury.",
    ctas: [
      { label: "Arrange a Visit", href: "/contact-us" },
      { label: "Make a Referral", href: "/contact-us?type=referral" },
    ],
  },
  strips: [
    "Experienced specialist MDT",
    "Goal focused community rehabilitation",
    "Optimising independence",
  ],
  mission: { /* heading + paragraphs verbatim */ },
  values: [ /* five ServiceValue entries verbatim */ ] as ServiceValue[],
  beaconsfield: { /* heading + four bullets verbatim */ },
} as const;
```

`support.ts` must contain **all six FAQs** verbatim from `/who-we-support`. `team.ts` must contain **all six bios** verbatim from `/our-team`.

- [ ] **Step 4: Verify no invented copy**

Spot-check three random strings from each content file against the scratch dumps (`grep -F "the string" $CLAUDE_SCRATCHPAD/live-*.html`). Expected: every string found.

- [ ] **Step 5: Commit**

```bash
git add site/src/content && git commit -m "feat: extract all page content verbatim from live site"
```

---

### Task 3: Image pipeline

**Files:**
- Create: `site/scripts/fetch-assets.mjs`, `site/scripts/process-images.mjs`, `site/src/lib/images.ts`, `site/src/components/Pic.tsx`
- Create (generated): `site/public/images/**`, `site/assets-src/**` (originals, gitignored)

**Interfaces:**
- Produces: `IMAGES` manifest (`site/src/lib/images.ts`) — `Record<string, { widths: number[]; aspect: number; alt: string }>` keyed by semantic name.
- Produces: `<Pic imageKey alt? sizes? priority? className?>` component rendering `<picture>` with AVIF/WebP/JPEG srcsets and explicit width/height.

- [ ] **Step 1: Install sharp + write fetch script**

```bash
cd site && npm i -D sharp
```

Create `site/scripts/fetch-assets.mjs`:

```js
// Scrapes static.wixstatic.com asset URLs from the live pages, strips the
// /v1/... transform segment to get source resolution, downloads to assets-src/.
import { mkdir, writeFile } from "node:fs/promises";

const PAGES = ["", "services-facilities", "virtual-tour", "who-we-support", "our-team", "contact-us"];
const found = new Map();

for (const p of PAGES) {
  const html = await (await fetch(`https://truthcaregroup.co.uk/${p}`)).text();
  for (const m of html.matchAll(/https:\/\/static\.wixstatic\.com\/media\/[a-z0-9_~.]+/gi)) {
    const src = m[0].split("/v1/")[0];
    found.set(src.split("/media/")[1], src);
  }
}

await mkdir("assets-src", { recursive: true });
for (const [name, url] of found) {
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  await writeFile(`assets-src/${name}`, buf);
  console.log(name, buf.length);
}
console.log(`\n${found.size} assets downloaded`);
```

- [ ] **Step 2: Run fetch, then rename semantically**

```bash
node scripts/fetch-assets.mjs
```

Expected: ~30+ files in `site/assets-src/`. Then inspect each (dimensions via `node -e "import('sharp').then(async s=>{...}"` or by eye in the dumps' surrounding markup) and rename per spec §5 semantics: `beaconsfield-house-exterior-front.jpg`, `beaconsfield-house-ensuite-bedroom-01.jpg`, `team-caz-icke.jpg`, `icon-well-led.png`, `brand-logo.png`, etc. **Delete `exterior-blue-sky` (768×512 — dropped per spec).** Add `assets-src/` to `.gitignore`.

- [ ] **Step 3: Write processing script**

Create `site/scripts/process-images.mjs`:

```js
// EXIF-strip + responsive AVIF/WebP/JPEG generation + manifest emit.
import sharp from "sharp";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = "assets-src";
const OUT = "public/images";
const WIDTHS = [480, 768, 1200, 1600, 2000];
const manifest = {};

await mkdir(OUT, { recursive: true });
for (const file of await readdir(SRC)) {
  const key = path.parse(file).name;
  const img = sharp(path.join(SRC, file)).rotate(); // .rotate() bakes orientation, EXIF is dropped on output
  const meta = await img.metadata();
  const widths = WIDTHS.filter((w) => w <= (meta.width ?? 0));
  if (widths.length === 0) widths.push(meta.width ?? 480);
  await mkdir(path.join(OUT, key), { recursive: true });
  for (const w of widths) {
    const base = img.clone().resize({ width: w });
    await base.clone().avif({ quality: 55 }).toFile(path.join(OUT, key, `${w}.avif`));
    await base.clone().webp({ quality: 72 }).toFile(path.join(OUT, key, `${w}.webp`));
    await base.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(OUT, key, `${w}.jpg`));
  }
  manifest[key] = { widths, aspect: (meta.width ?? 1) / (meta.height ?? 1) };
  console.log(key, widths.join(","));
}
await writeFile("src/lib/images.json", JSON.stringify(manifest, null, 2));
```

Run: `node scripts/process-images.mjs`. Expected: per-image folders under `public/images/`, `src/lib/images.json` written.

- [ ] **Step 4: Manifest module + Pic component**

Create `site/src/lib/images.ts`:

```ts
import manifest from "./images.json";

export interface ImageEntry { widths: number[]; aspect: number }
export const IMAGES = manifest as Record<string, ImageEntry>;
```

Create `site/src/components/Pic.tsx`:

```tsx
import { IMAGES } from "@/lib/images";

interface PicProps {
  imageKey: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}

export function Pic({ imageKey, alt, sizes = "100vw", priority = false, className }: PicProps) {
  const entry = IMAGES[imageKey];
  if (!entry) throw new Error(`Unknown image key: ${imageKey}`);
  const { widths, aspect } = entry;
  const max = widths[widths.length - 1];
  const srcSet = (fmt: string) =>
    widths.map((w) => `/images/${imageKey}/${w}.${fmt} ${w}w`).join(", ");

  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
      <img
        src={`/images/${imageKey}/${max}.jpg`}
        srcSet={srcSet("jpg")}
        sizes={sizes}
        alt={alt}
        width={max}
        height={Math.round(max / aspect)}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={className}
      />
    </picture>
  );
}
```

- [ ] **Step 5: Verify EXIF gone + build passes**

```bash
node -e "import('sharp').then(async ({default:s}) => { const m = await s('public/images/beaconsfield-house-exterior-front/1200.jpg').metadata(); console.log('exif:', m.exif ? 'PRESENT — FAIL' : 'stripped OK'); })"
npm run build
```

Expected: `exif: stripped OK`, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: image pipeline - fetch, EXIF-strip, responsive AVIF/WebP, Pic component"
```

---

### Task 4: Header, footer, nav, reveal hook

**Files:**
- Create: `site/src/components/SiteHeader.tsx`, `site/src/components/SiteFooter.tsx`, `site/src/components/Reveal.tsx`, `site/src/components/Buttons.tsx`
- Modify: `site/src/app/layout.tsx` (wrap children with header/footer)

**Interfaces:**
- Consumes: `SITE` (Task 1), `Pic` (Task 3).
- Produces: `<SiteHeader/>`, `<SiteFooter/>`, `<Reveal>{children}</Reveal>` (IntersectionObserver adds `.is-visible`), `<ButtonPrimary href label/>` (navy on orange), `<ButtonSecondary href label/>` (navy outline).

- [ ] **Step 1: Buttons**

Create `site/src/components/Buttons.tsx`:

```tsx
import Link from "next/link";

const base =
  "inline-flex items-center justify-center rounded-full px-7 py-3.5 font-semibold text-base transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 min-h-12";

export function ButtonPrimary({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={`${base} bg-orange text-navy hover:brightness-105`}>
      {label}
    </Link>
  );
}

export function ButtonSecondary({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={`${base} border-2 border-navy text-navy hover:bg-navy hover:text-paper`}>
      {label}
    </Link>
  );
}
```

- [ ] **Step 2: Header with accessible mobile nav**

Create `site/src/components/SiteHeader.tsx` (client component):

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/services-facilities", label: "Services & Facilities" },
  { href: "/virtual-tour", label: "Take a Look Inside" },
  { href: "/who-we-support", label: "Who We Support" },
  { href: "/our-team", label: "Our Team" },
  { href: "/contact-us", label: "Contact Us" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-paper/95 backdrop-blur border-b border-navy/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src="/images/brand-logo/480.webp" alt="Truth Care Group" width="48" height="48" />
          <span className="font-display text-lg font-semibold tracking-tight">Truth Care Group</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden lg:block">
          <ul className="flex gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`rounded-full px-4 py-2.5 text-[0.95rem] font-medium transition-colors hover:bg-navy/5 ${
                    pathname === item.href ? "text-orange-text" : "text-navy"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className="lg:hidden flex h-12 w-12 items-center justify-center rounded-full hover:bg-navy/5"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen(!open)}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main navigation" className="lg:hidden border-t border-navy/10 bg-paper">
          <ul className="px-5 py-4 space-y-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={`block rounded-xl px-4 py-3.5 text-lg font-medium ${
                    pathname === item.href ? "bg-navy/5 text-orange-text" : "text-navy"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
```

- [ ] **Step 3: Footer**

Create `site/src/components/SiteFooter.tsx`:

```tsx
import Link from "next/link";
import { SITE } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-paper">
      <div className="mx-auto max-w-6xl px-5 py-14 grid gap-10 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-semibold">Truth Care Group</p>
          <p className="mt-3 text-paper/80 max-w-xs">
            Specialist residential brain injury rehabilitation at Beaconsfield House, Bristol.
          </p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wider text-sm text-paper/60">Contact</p>
          <ul className="mt-3 space-y-2 text-paper/90">
            <li><a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="hover:underline">{SITE.phone}</a></li>
            <li><a href={`mailto:${SITE.email}`} className="hover:underline">{SITE.email}</a></li>
            <li>{SITE.address.name}, {SITE.address.locality}</li>
          </ul>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wider text-sm text-paper/60">Legal</p>
          <ul className="mt-3 space-y-2 text-paper/90">
            <li><Link href="/privacy-policy" className="hover:underline">Privacy Policy</Link></li>
            <li><Link href="/cookie-policy" className="hover:underline">Cookie Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-sm text-paper/60">
          © {new Date().getFullYear()} Truth Care Group. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Reveal component**

Create `site/src/components/Reveal.tsx`:

```tsx
"use client";
import { useEffect, useRef } from "react";

export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Wire into layout**

In `site/src/app/layout.tsx`, wrap: `<body><SiteHeader /><main>{children}</main><SiteFooter /></body>` (add imports).

- [ ] **Step 6: Verify + commit**

`npm run build` → succeeds. Start `npm run dev`, check header/footer render, mobile nav opens/closes with keyboard (Tab + Enter), focus rings visible.

```bash
git add -A && git commit -m "feat: header, footer, mobile nav, reveal animation"
```

---

### Task 5: Homepage

**Files:**
- Create: `site/src/components/SectionHeading.tsx`, `site/src/components/ValueCard.tsx`
- Replace: `site/src/app/page.tsx`

**Interfaces:**
- Consumes: `HOME` (Task 2), `Pic`, `Reveal`, `ButtonPrimary/Secondary`.
- Produces: `<SectionHeading eyebrow? title lede? align?>` and `<ValueCard value={ServiceValue}/>` — reused on other pages.

- [ ] **Step 1: SectionHeading**

```tsx
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow && (
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-text">{eyebrow}</p>
      )}
      <h2 className="mt-3 font-display text-[length:var(--text-h2)] font-semibold leading-[1.1] tracking-tight">
        {title}
      </h2>
      {lede && <p className="mt-5 text-[length:var(--text-lede)] text-muted leading-relaxed">{lede}</p>}
    </div>
  );
}
```

- [ ] **Step 2: ValueCard**

```tsx
import { Pic } from "./Pic";
import type { ServiceValue } from "@/content/types";

export function ValueCard({ value }: { value: ServiceValue }) {
  return (
    <div className="group rounded-2xl border border-navy/10 bg-paper p-7 transition-shadow hover:shadow-lg hover:shadow-navy/5">
      <div className="h-14 w-14 rounded-xl bg-orange/15 p-2.5">
        <Pic imageKey={value.icon} alt="" sizes="56px" />
      </div>
      <h3 className="mt-5 font-display text-[length:var(--text-h3)] font-semibold tracking-tight">
        {value.title}
      </h3>
      <p className="mt-2.5 text-muted leading-relaxed">{value.body}</p>
    </div>
  );
}
```

- [ ] **Step 3: Homepage composition**

Replace `site/src/app/page.tsx`. Structure (all copy from `HOME`, no hardcoding):

1. **Hero** — full-bleed section, `beaconsfield-house-exterior-front` as `<Pic priority sizes="100vw">` under a navy gradient scrim (`bg-gradient-to-t from-navy/80 via-navy/40 to-navy/20`), white display headline at `--text-hero`, lede, both CTA buttons (`ButtonPrimary` "Arrange a Visit", secondary variant restyled white-outline for dark bg).
2. **Proof strip** — the three `HOME.strips` items in a single row (wrap on mobile), small-caps sans, separated by orange dot markers.
3. **Mission** — two-column editorial: `SectionHeading` (eyebrow "Our Mission") + paragraphs left, `interior-lounge-wide` photo right, offset with `md:mt-12` for editorial asymmetry. Wrapped in `Reveal`.
4. **Values** — `SectionHeading` (eyebrow "Our Services Are", centred) + responsive grid of five `ValueCard`s (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, fifth card spanning via `lg:col-start-2` or a 3+2 layout). Wrapped in `Reveal`.
5. **Beaconsfield teaser** — navy section (`bg-navy text-paper`), heading "Step inside Beaconsfield House", the four bullets with orange check icons, `ButtonPrimary` "Take a Look Inside" → `/virtual-tour`, photo `garden-patio` right.
6. **Support teaser** — `SectionHeading` + short excerpt of the support intro + `ButtonSecondary` "See Who We Support" → `/who-we-support`.

Each section: `py-[length:var(--space-section)]`, content in `mx-auto max-w-6xl px-5`.

- [ ] **Step 4: Verify + commit**

`npm run build` passes; dev-server visual check at 375px and 1440px: no horizontal scroll, hero text legible over image, all five value cards render icons.

```bash
git add -A && git commit -m "feat: homepage - hero, mission, values, teasers"
```

---

### Task 6: Gallery + Lightbox + tour and services pages

**Files:**
- Create: `site/src/components/Gallery.tsx`, `site/src/components/Lightbox.tsx`, `site/src/content/gallery.ts`
- Replace/Create: `site/src/app/virtual-tour/page.tsx`, `site/src/app/services-facilities/page.tsx`

**Interfaces:**
- Consumes: `IMAGES`, `Pic`, `SERVICES` content, `SectionHeading`.
- Produces: `<Gallery images={GalleryImage[]}/>` (masonry-ish responsive grid, click opens lightbox).

- [ ] **Step 1: Gallery content file**

Create `site/src/content/gallery.ts` — the ten real property photos with **rewritten human alt text**, e.g.:

```ts
import type { GalleryImage } from "./types";

export const GALLERY: GalleryImage[] = [
  { key: "beaconsfield-house-exterior-front", alt: "The front of Beaconsfield House, a detached period property with mature planting", caption: "Beaconsfield House" },
  { key: "beaconsfield-house-ensuite-bedroom-01", alt: "A bright en-suite bedroom with a single bed, wardrobe and garden view", caption: "En-suite bedroom" },
  // ...all ten property photos, borderline-resolution images included
  // (they are constrained to grid-cell widths, satisfying the spec's
  // "contained widths only" rule)
];
```

Alt text rule: describe what a visitor would understand from the photo — never generated-vision descriptions.

- [ ] **Step 2: Lightbox (accessible)**

Create `site/src/components/Lightbox.tsx` (client): a `<dialog>`-based lightbox. Requirements implemented in full:

```tsx
"use client";
import { useEffect, useRef, useCallback } from "react";
import { Pic } from "./Pic";
import type { GalleryImage } from "@/content/types";

interface LightboxProps {
  images: GalleryImage[];
  index: number | null;
  onClose: () => void;
  onNavigate: (next: number) => void;
}

export function Lightbox({ images, index, onClose, onNavigate }: LightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (index !== null && !dialog.open) dialog.showModal();
    if (index === null && dialog.open) dialog.close();
  }, [index]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (index === null) return;
      if (e.key === "ArrowRight") onNavigate((index + 1) % images.length);
      if (e.key === "ArrowLeft") onNavigate((index - 1 + images.length) % images.length);
    },
    [index, images.length, onNavigate]
  );

  if (index === null) return null;
  const img = images[index];

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onKeyDown={handleKey}
      onClick={(e) => e.target === ref.current && onClose()}
      className="backdrop:bg-navy/90 bg-transparent p-0 max-w-5xl w-[92vw] open:flex flex-col items-center"
      aria-label={img.alt}
    >
      <Pic imageKey={img.key} alt={img.alt} sizes="92vw" className="rounded-xl max-h-[80vh] w-auto object-contain" />
      <div className="mt-4 flex items-center gap-4 text-paper">
        <button type="button" onClick={() => onNavigate((index - 1 + images.length) % images.length)} className="h-12 w-12 rounded-full border border-paper/40 hover:bg-paper/10" aria-label="Previous photo">←</button>
        <p className="text-sm">{img.caption ?? img.alt} · {index + 1} of {images.length}</p>
        <button type="button" onClick={() => onNavigate((index + 1) % images.length)} className="h-12 w-12 rounded-full border border-paper/40 hover:bg-paper/10" aria-label="Next photo">→</button>
        <button type="button" onClick={onClose} className="h-12 w-12 rounded-full border border-paper/40 hover:bg-paper/10" aria-label="Close gallery">✕</button>
      </div>
    </dialog>
  );
}
```

(`<dialog>` gives focus trapping, Esc-to-close and backdrop natively.)

- [ ] **Step 3: Gallery grid**

Create `site/src/components/Gallery.tsx` (client): responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`), each cell a `<button>` wrapping `<Pic sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw">` with hover scale (`transition-transform hover:scale-[1.02]` on inner image, `overflow-hidden rounded-xl` on button). Manages `openIndex` state, renders `<Lightbox>`.

- [ ] **Step 4: Tour page**

`site/src/app/virtual-tour/page.tsx`: metadata title "Take a Look Inside"; `SectionHeading` (eyebrow "Beaconsfield House", title "Take a Look Inside", lede drawn verbatim from live tour-page bullets composed as a short intro list); the four facility bullets from live page rendered as a feature row; `<Gallery images={GALLERY}/>`.

- [ ] **Step 5: Services page**

`site/src/app/services-facilities/page.tsx`: content from `SERVICES` verbatim, values grid reusing `ValueCard` if the live page repeats them, gallery **subset rendered once** (six strongest photos: `<Gallery images={GALLERY.slice(0, 6)}/>`).

- [ ] **Step 6: Verify + commit**

Build passes. Dev check: lightbox opens on click, arrows + Esc + backdrop close work, keyboard-only operation works, focus returns to trigger on close (native dialog behaviour).

```bash
git add -A && git commit -m "feat: gallery with accessible lightbox, tour and services pages"
```

---

### Task 7: Who We Support page + FAQ accordion + FAQPage schema

**Files:**
- Create: `site/src/components/FaqAccordion.tsx`, `site/src/lib/schema.ts`, `site/src/app/who-we-support/page.tsx`

**Interfaces:**
- Consumes: `SUPPORT` content incl. `faqs` (Task 2).
- Produces: `faqPageJsonLd(faqs: Faq[]): object` and `localBusinessJsonLd(): object` in `schema.ts` (latter consumed by Task 9).

- [ ] **Step 1: Schema builders**

Create `site/src/lib/schema.ts`:

```ts
import { SITE } from "./site";
import type { Faq } from "@/content/types";

export function faqPageJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function localBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: SITE.name,
    url: SITE.url,
    telephone: SITE.phone,
    email: SITE.email,
    address: {
      "@type": "PostalAddress",
      name: SITE.address.name,
      addressLocality: SITE.address.locality,
      addressRegion: SITE.address.region,
      addressCountry: SITE.address.country,
    },
    // geo + openingHours added when client confirms (spec open question 5)
  };
}
```

- [ ] **Step 2: FaqAccordion (native details)**

```tsx
import type { Faq } from "@/content/types";

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="divide-y divide-navy/10 border-y border-navy/10">
      {faqs.map((faq) => (
        <details key={faq.question} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold [&::-webkit-details-marker]:hidden">
            {faq.question}
            <span aria-hidden="true" className="text-orange-text transition-transform duration-300 group-open:rotate-45 text-2xl leading-none">+</span>
          </summary>
          {faq.answer.split("\n\n").map((p) => (
            <p key={p.slice(0, 32)} className="mt-3 text-muted leading-relaxed max-w-prose">{p}</p>
          ))}
        </details>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Page**

`site/src/app/who-we-support/page.tsx`: metadata; intro sections verbatim from `SUPPORT`; the conditions list (Acquired Brain Injury, Stroke, Personal Care Needs) as a styled row; `FaqAccordion faqs={SUPPORT.faqs}`; JSON-LD via:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageJsonLd(SUPPORT.faqs)) }}
/>
```

(Static build-time serialisation of our own content — no user input, XSS-safe.)

- [ ] **Step 4: Verify + commit**

Build passes. Paste rendered JSON-LD into https://validator.schema.org (or check structure by eye: 6 Question entities). All six FAQs toggle by keyboard.

```bash
git add -A && git commit -m "feat: who-we-support page with FAQ accordion and FAQPage schema"
```

---

### Task 8: Our Team page

**Files:**
- Create: `site/src/components/TeamCard.tsx`, `site/src/app/our-team/page.tsx`

**Interfaces:**
- Consumes: `TEAM` (Task 2), `Pic`, `SectionHeading`.

- [ ] **Step 1: TeamCard**

```tsx
import { Pic } from "./Pic";
import type { TeamMember } from "@/content/types";

export function TeamCard({ member }: { member: TeamMember }) {
  return (
    <article className="flex flex-col">
      <div className="overflow-hidden rounded-2xl bg-navy/5 aspect-[3/4]">
        <Pic
          imageKey={member.image}
          alt={`${member.name}, ${member.role} at Truth Care Group`}
          sizes="(min-width:1024px) 30vw, (min-width:640px) 45vw, 90vw"
          className="h-full w-full object-cover object-top"
        />
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold">{member.name}</h3>
      <p className="text-orange-text font-medium">{member.role}</p>
      <p className="mt-3 text-muted leading-relaxed">{member.bio}</p>
    </article>
  );
}
```

Note: `object-cover` inside a fixed `aspect-[3/4]` box is what makes the two small headshots (Kumi 600×800, Alison 615×640) presentable — they render at ~350px display width max.

- [ ] **Step 2: Page**

`site/src/app/our-team/page.tsx`: metadata; `SectionHeading`; grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14` of six `TeamCard`s. Bios verbatim.

- [ ] **Step 3: Verify + commit**

Build passes; six cards render; small headshots not pixelated at rendered size.

```bash
git add -A && git commit -m "feat: our-team page with six bios verbatim"
```

---

### Task 9: Contact page + Formspree form, legal pages, 404, SEO plumbing

**Files:**
- Create: `site/src/components/ContactForm.tsx`, `site/src/app/contact-us/page.tsx`, `site/src/app/privacy-policy/page.tsx`, `site/src/app/cookie-policy/page.tsx`, `site/src/app/not-found.tsx`, `site/src/app/sitemap.ts`, `site/src/app/robots.ts`
- Modify: `site/src/app/layout.tsx` (inject `localBusinessJsonLd` sitewide)

**Interfaces:**
- Consumes: `SITE`, `localBusinessJsonLd` (Task 7), `CONTACT` content.

- [ ] **Step 1: ContactForm**

Create `site/src/components/ContactForm.tsx` (client):

```tsx
"use client";
import { useState } from "react";
import { SITE } from "@/lib/site";

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    // honeypot — bots fill it, humans never see it
    if (data.get("_gotcha")) return;

    const next: Record<string, string> = {};
    if (!String(data.get("name")).trim()) next.name = "Please enter your name";
    const email = String(data.get("email")).trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Please enter a valid email address";
    if (!String(data.get("message")).trim()) next.message = "Please tell us how we can help";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStatus("submitting");
    try {
      const res = await fetch(SITE.formspree, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`Formspree ${res.status}`);
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div role="status" className="rounded-2xl bg-navy/5 p-8">
        <h3 className="font-display text-xl font-semibold">Thank you — we’ve received your message.</h3>
        <p className="mt-2 text-muted">We aim to respond within one working day.</p>
      </div>
    );
  }

  const field = "w-full rounded-xl border border-navy/20 px-4 py-3.5 focus:border-navy min-h-12";
  const err = (k: string) =>
    errors[k] ? <p id={`${k}-error`} className="mt-1.5 text-sm font-medium text-orange-text">{errors[k]}</p> : null;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1.5 block font-medium">Name</label>
          <input id="name" name="name" type="text" autoComplete="name" required aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-error" : undefined} className={field} />
          {err("name")}
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block font-medium">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} className={field} />
          {err("email")}
        </div>
        <div>
          <label htmlFor="phone" className="mb-1.5 block font-medium">Phone <span className="text-muted font-normal">(optional)</span></label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" className={field} />
        </div>
        <div>
          <label htmlFor="type" className="mb-1.5 block font-medium">Enquiry type</label>
          <select id="type" name="enquiry_type" className={field} defaultValue="general">
            <option value="general">General enquiry</option>
            <option value="visit">Arrange a visit</option>
            <option value="referral">Make a referral</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="message" className="mb-1.5 block font-medium">Message</label>
          <textarea id="message" name="message" rows={6} required aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-error" : undefined} className={field} />
          {err("message")}
        </div>
      </div>

      {status === "error" && (
        <p role="alert" className="mt-5 rounded-xl bg-orange/10 px-4 py-3 text-orange-text font-medium">
          Sorry — something went wrong sending your message. Please try again, or call us on {SITE.phone}.
        </p>
      )}

      <button type="submit" disabled={status === "submitting"} className="mt-7 inline-flex min-h-12 items-center rounded-full bg-orange px-8 py-3.5 font-semibold text-navy transition-transform hover:-translate-y-0.5 disabled:opacity-60">
        {status === "submitting" ? "Sending…" : "Send message"}
      </button>
      <p className="mt-4 text-sm text-muted">
        By submitting this form you agree to our <a href="/privacy-policy" className="underline">privacy policy</a>.
      </p>
    </form>
  );
}
```

Read `?type=referral` from the URL client-side with `useSearchParams` in a `<Suspense>` wrapper to pre-select the enquiry type (homepage CTA link).

- [ ] **Step 2: Contact page** — two-column: contact details (phone, email, address, from `SITE`/`CONTACT`) left, form right; stacks on mobile.

- [ ] **Step 3: Legal pages** — write a proper UK GDPR privacy notice for `/privacy-policy` covering: data controller (Truth Care Group), what the form collects (name, email, phone, message), purpose (responding to enquiries/referrals), lawful basis (legitimate interest), processor disclosure (Formspree, US-based, SCCs), retention, data subject rights, ICO complaint route. `/cookie-policy`: states the site sets **no cookies**; Formspree submission is the only data transfer. Standard prose pages using `SectionHeading` + `max-w-prose`.

- [ ] **Step 4: 404** — `not-found.tsx`: display heading "Page not found", one line, `ButtonPrimary` home.

- [ ] **Step 5: sitemap + robots + sitewide schema**

`site/src/app/sitemap.ts`:

```ts
import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/services-facilities", "/virtual-tour", "/who-we-support", "/our-team", "/contact-us", "/privacy-policy", "/cookie-policy"]
    .map((p) => ({ url: `${SITE.url}${p}`, lastModified: new Date() }));
}
```

`robots.ts` similarly (`allow: /`, sitemap URL). In `layout.tsx` `<body>`, add the `localBusinessJsonLd()` script tag.

- [ ] **Step 6: Verify + commit**

Build passes. Dev check: form validates inline (submit empty → three errors, focus states visible), success state renders after a real test submission to the Formspree endpoint, `?type=referral` pre-selects. `out/sitemap.xml` and `out/robots.txt` exist after build.

```bash
git add -A && git commit -m "feat: contact form, legal pages, 404, sitemap, LocalBusiness schema"
```

---

### Task 10: Playwright smoke tests

**Files:**
- Create: `site/playwright.config.ts`, `site/tests/e2e/smoke.spec.ts`, `site/tests/e2e/a11y.spec.ts`
- Modify: `site/package.json` (scripts)

- [ ] **Step 1: Install**

```bash
cd site && npm i -D @playwright/test @axe-core/playwright && npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  webServer: { command: "npx serve out -l 4173", port: 4173, reuseExistingServer: true },
  use: { baseURL: "http://localhost:4173" },
});
```

Add `"test:e2e": "next build && playwright test"` to scripts; `npm i -D serve`.

- [ ] **Step 2: Smoke spec**

`tests/e2e/smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const PAGES = ["/", "/services-facilities", "/virtual-tour", "/who-we-support", "/our-team", "/contact-us", "/privacy-policy", "/cookie-policy"];

for (const path of PAGES) {
  test(`${path} renders with h1 and no console errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("mobile nav opens and navigates", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: "Our Team" }).click();
  await expect(page).toHaveURL(/our-team/);
});

test("lightbox opens, navigates, closes with Escape", async ({ page }) => {
  await page.goto("/virtual-tour");
  await page.locator("button:has(img)").first().click();
  await expect(page.locator("dialog[open]")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
});

test("contact form shows inline validation errors", async ({ page }) => {
  await page.goto("/contact-us");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Please enter your name")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address")).toBeVisible();
});

test("FAQ schema present on who-we-support", async ({ page }) => {
  await page.goto("/who-we-support");
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(jsonLd.some((s) => s.includes('"FAQPage"'))).toBe(true);
});
```

- [ ] **Step 3: Axe spec**

`tests/e2e/a11y.spec.ts`:

```ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/", "/services-facilities", "/virtual-tour", "/who-we-support", "/our-team", "/contact-us"];

for (const path of PAGES) {
  test(`${path} has no serious/critical axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(bad).toEqual([]);
  });
}
```

- [ ] **Step 4: Run to green**

```bash
npm run test:e2e
```

Expected: all tests pass. Fix any failures in the implementation (not the tests) unless a locator is genuinely wrong.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test: Playwright smoke and axe accessibility suites"
```

---

### Task 11: Performance pass + deploy preview

**Files:**
- Modify: whatever the audits flag.

- [ ] **Step 1: Lighthouse against the static build**

```bash
cd site && npx serve out -l 4173 &
npx -y lighthouse http://localhost:4173 --preset=desktop --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=./lh-home.json --chrome-flags="--headless"
node -e "const r=require('./lh-home.json').categories; console.log(Object.entries(r).map(([k,v])=>k+': '+Math.round(v.score*100)).join('\n'))"
```

Targets: Performance ≥95, Accessibility 100. Repeat for `/virtual-tour` (image-heaviest page). Fix flagged issues (usual suspects: hero `sizes` too generous, font preload, missing `aria-label`).

- [ ] **Step 2: HTML weight check**

```bash
node -e "const fs=require('fs');for(const f of ['index.html','virtual-tour.html','who-we-support.html'])console.log(f,Math.round(fs.statSync('out/'+f).size/1024)+' KB')"
```

Expected: every page < 120 KB.

- [ ] **Step 3: Deploy preview**

Vercel (project exists in Paul's Vercel account via MCP) or Netlify CLI — deploy `site/` as a preview, **not** production/DNS. Confirm the preview URL loads all pages.

- [ ] **Step 4: Handover note**

Create `docs/HANDOVER.md`: preview URL; the four provenance-flagged images awaiting client confirmation (`interior-lounge-piano`, `interior-sensory-room`, `misc-header` — `exterior-blue-sky` already dropped); outstanding open questions (landline, geo/hours for schema, better headshots for Kumi/Alison); reminder that the live Wix mailto fix (spec §10) is a separate manual action; DNS cutover checklist (not a Friday).

- [ ] **Step 5: Final commit**

```bash
git add -A && git commit -m "chore: performance pass, deploy preview, handover note"
```
