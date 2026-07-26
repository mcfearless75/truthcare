import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { SITE } from "@/lib/site";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

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
    default: "Truth Care Group | Brain Injury Residential Rehabilitation Weston-super-Mare",
    template: "%s | Truth Care Group",
  },
  description:
    "Personalised, community-based residential rehabilitation for adults living with acquired or traumatic brain injury in Weston-super-Mare.",
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
      <body>
        <Script id="js-flag" strategy="beforeInteractive">
          {`document.documentElement.classList.add('js')`}
        </Script>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
