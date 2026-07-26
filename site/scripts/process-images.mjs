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
    // Flatten transparent PNGs onto white before JPEG encoding — JPEG has no
    // alpha channel, and without this sharp composites transparency onto
    // black, producing solid-black fallbacks for icon-*.png. AVIF/WebP keep
    // their transparency untouched (flatten only applies to this branch).
    await base
      .clone()
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toFile(path.join(OUT, key, `${w}.jpg`));
  }
  manifest[key] = { widths, aspect: (meta.width ?? 1) / (meta.height ?? 1) };
  console.log(key, widths.join(","));
}
await writeFile("src/lib/images.json", JSON.stringify(manifest, null, 2));
