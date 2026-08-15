import type { Metadata } from "next";
import { ACCESSIBILITY } from "@/content/legal";
import { LegalProse } from "@/components/LegalProse";

export const metadata: Metadata = {
  title: "Accessibility",
  description:
    "How truthcaregroup.co.uk supports accessible browsing — text size and motion controls, descriptive alt text and full keyboard operability — and what isn't built yet.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return <LegalProse page={ACCESSIBILITY} related={{ href: "/contact-us", label: "our contact page" }} />;
}
