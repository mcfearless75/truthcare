# Truth Care Group — site

Static Next.js rebuild of [truthcaregroup.co.uk](https://truthcaregroup.co.uk): six marketing pages plus a privacy notice, cookie policy and 404, for Truth Care Group's CQC-regulated brain injury residential rehabilitation service at Beaconsfield House, Weston-super-Mare.

Stack: Next.js (App Router, static export via `output: "export"`), TypeScript, Tailwind CSS v4, Playwright for E2E testing. Fonts are Fraunces (display) and Figtree (body) — not the create-next-app default Geist.

## Running it

```bash
npm install
npm run dev        # local dev server, http://localhost:3000
npm run build      # static export to out/ — this is what ships
npm run test:e2e   # builds, then runs the full Playwright suite against out/
```

`npm run build` writes a static export to `out/`: plain HTML/CSS/JS/images that any static host can serve as-is. That folder is what goes live.

## Three things a new developer must know

**1. All copy lives in `src/content/*.ts`, never inline in a page.** Pages import typed content objects (`CONTACT`, `HOME`, `SUPPORT`, `SERVICES`, `TEAM`, `GALLERY`, `TOUR`, `NOT_FOUND`, legal pages) and render them — they don't hardcode strings. If you're editing what a page says, edit the matching file in `src/content/`, not the `.tsx` file.

**2. Images are generated, not committed as-is.** Source photos/graphics live in `assets-src/`. Running `node scripts/process-images.mjs` strips EXIF, bakes in orientation, and generates AVIF/WebP/JPEG at several widths into `public/images/<key>/`, plus a manifest at `src/lib/images.json` (dimensions and available widths per image key). Pages never reference `public/images/` paths directly — they use the `<Pic imageKey="..." alt="..." />` component, which reads the manifest and emits the right `<picture>` markup. To add or replace a photo: drop the file in `assets-src/`, re-run the script, then reference its filename (without extension) as `imageKey`.

**3. The brand orange is fill-only, never text on white.** `#F5921E` (`--color-orange` / `bg-orange`) is for backgrounds, rules and icons — it fails contrast as text on a white/paper background. For orange text on white, use `#AD5A10` (`--color-orange-text` / `text-orange-text`). `#F5921E` itself is fine as text on navy. Don't add a new orange text usage without checking which surface it sits on.

## Other things worth knowing

- No server, no database, no cookies, and no third-party network request on page load (verified by a Playwright test on every page). The virtual tour is a real Giraffe360 tour behind a click-to-load button — nothing is requested from Giraffe360 until a visitor presses play.
- The contact form posts to Formspree; no backend of our own.
- `docs/HANDOVER.md` (repo root) is the client-facing handover: what was built, measured Lighthouse/test results, and everything that needs the client's sign-off before DNS cutover.
