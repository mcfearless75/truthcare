import type { Metadata } from "next";
import { COOKIES } from "@/content/legal";
import { LegalProse } from "@/components/LegalProse";

export const metadata: Metadata = {
  title: "Cookie Policy",
  // Trimmed from 187 to 138 chars 2026-09-01 (SEO check) — was past Google's
  // snippet truncation point. Dropped "and no local storage"; the page body
  // still states it in full.
  description:
    "truthcaregroup.co.uk sets no cookies — no analytics, advertising tags or third-party embeds — and explains why there is no consent banner.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return <LegalProse page={COOKIES} related={{ href: "/privacy-policy", label: "our privacy notice" }} />;
}
