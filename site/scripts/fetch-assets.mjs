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
