"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { withBasePath } from "@/lib/basePath";
import { SITE } from "@/lib/site";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/services-facilities", label: "Services & Facilities" },
  { href: "/virtual-tour", label: "Take a Look Inside" },
  { href: "/who-we-support", label: "Who We Support" },
  { href: "/our-team", label: "Our Team" },
  { href: "/reviews", label: "Reviews" },
  { href: "/contact-us", label: "Contact Us" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Subtle depth cue once the page scrolls under the sticky header — the
  // border alone reads flat against busy hero photography.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 border-b border-navy/10 bg-paper/95 backdrop-blur transition-shadow duration-300 ${
        scrolled ? "shadow-sm" : "shadow-none"
      }`}
    >
      {/* max-w-7xl, not max-w-6xl like the body content below — this is
          header chrome, not a text column, so it can use more of the row
          before the logo and the brochure button start crowding toward the
          middle. */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:py-5">
        {/* shrink-0: without it, flexbox lets this text-containing link
            shrink below its natural width before the nav gives up any of
            its own space, which wrapped "Truth Care Group" onto two lines
            at 1024-1440px even though the row had room for everything on
            one line — the wrong element was absorbing the squeeze. */}
        <Link href="/" className="group flex shrink-0 items-center gap-4" onClick={() => setOpen(false)}>
          <img
            src={withBasePath("/images/brand-logo/480.webp")}
            alt="Truth Care Group"
            width={64}
            height={64}
            className="h-12 w-12 shrink-0 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-105 sm:h-14 sm:w-14 md:h-16 md:w-16"
          />
          <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">Truth Care Group</span>
        </Link>

        {/* Grouped so justify-between on the row above treats "nav + brochure
            button" as one block against the logo, instead of spreading three
            items apart. A hairline rule + wider gap sets the button visibly
            apart from the nav rather than reading as a seventh link jammed
            against "Contact Us". Outline style, not solid orange: the accent
            colour is already doing work in the logo and the nav's underline,
            and this is a secondary resource, not the site's primary action. */}
        <div className="hidden items-center gap-5 lg:flex">
          <nav aria-label="Main navigation">
            <ul className="flex gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={`relative rounded-full px-4 py-2.5 text-[0.95rem] font-medium transition-colors duration-200 hover:bg-navy/5 after:absolute after:inset-x-4 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-orange after:transition-transform after:duration-300 after:ease-[var(--ease-out-expo)] hover:after:scale-x-100 ${
                      pathname === item.href ? "text-orange-text after:scale-x-100" : "text-navy"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <span aria-hidden="true" className="h-6 w-px bg-navy/15" />

          <a
            href={withBasePath(SITE.brochureUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border-2 border-navy px-4 py-2 text-sm font-semibold text-navy transition duration-200 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:bg-navy hover:text-paper hover:shadow-navy-md active:translate-y-0 active:shadow-none"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
            </svg>
            Brochure
          </a>
        </div>

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

      <nav
        id="mobile-nav"
        aria-label="Main navigation"
        hidden={!open}
        className="lg:hidden border-t border-navy/10 bg-paper"
      >
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

        <div className="border-t border-navy/10 px-5 py-4">
          <a
            href={withBasePath(SITE.brochureUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-full border-2 border-navy px-4 py-3.5 text-lg font-semibold text-navy transition duration-200 hover:bg-navy hover:text-paper"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v12m0 0-4-4m4 4 4-4M4 19h16" />
            </svg>
            Download Brochure
          </a>
        </div>
      </nav>
    </header>
  );
}
