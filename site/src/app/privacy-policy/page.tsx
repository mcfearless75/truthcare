import type { Metadata } from "next";
import { PRIVACY } from "@/content/legal";
import { LegalProse } from "@/components/LegalProse";

export const metadata: Metadata = {
  title: "Privacy Notice",
  // Trimmed from 196 to 150 chars 2026-09-01 (SEO check) — was past Google's
  // snippet truncation point. Dropped "who processes it" and "how long we
  // keep it"; both are still covered in full on the page itself.
  description:
    "How Truth Care Group handles the personal information you send through this website: what we collect, our lawful basis, and your rights under UK GDPR.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return <LegalProse page={PRIVACY} related={{ href: "/cookie-policy", label: "our cookie policy" }} />;
}
