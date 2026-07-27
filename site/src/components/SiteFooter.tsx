import Link from "next/link";
import { SITE } from "@/lib/site";
import { withBasePath } from "@/lib/basePath";

export function SiteFooter() {
  return (
    <footer className="bg-navy text-paper">
      <div className="mx-auto max-w-6xl px-5 py-14 grid gap-10 md:grid-cols-3">
        <div>
          <p className="font-display text-xl font-semibold">Truth Care Group</p>
          <p className="mt-3 text-paper/80 max-w-xs">
            Specialist residential brain injury rehabilitation at Beaconsfield House, Weston-super-Mare.
          </p>
        </div>
        <div>
          <p className="font-semibold uppercase tracking-wider text-sm text-paper/60">Contact</p>
          <ul className="mt-3 space-y-2 text-paper/90">
            <li><a href={`tel:${SITE.phone.replace(/\s/g, "")}`} className="hover:underline">{SITE.phone}</a></li>
            <li><a href={`mailto:${SITE.email}`} className="hover:underline">{SITE.email}</a></li>
            <li>
              <address className="not-italic">
                {SITE.address.name}, {SITE.address.street}
                <br />
                {SITE.address.locality}, {SITE.address.postcode}
              </address>
            </li>
            <li>
              <a href={withBasePath(SITE.brochureUrl)} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Download our brochure (PDF)
              </a>
            </li>
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
