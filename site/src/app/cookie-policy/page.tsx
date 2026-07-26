import type { Metadata } from "next";
import { COOKIES } from "@/content/legal";
import { LegalProse } from "@/components/LegalProse";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "truthcaregroup.co.uk sets no cookies: no analytics, no advertising tags, no third-party embeds and no local storage. This page explains what that means and why there is no consent banner.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return <LegalProse page={COOKIES} related={{ href: "/privacy-policy", label: "our privacy notice" }} />;
}
