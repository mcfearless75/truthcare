import type { Metadata } from "next";
import { PRIVACY } from "@/content/legal";
import { LegalProse } from "@/components/LegalProse";

export const metadata: Metadata = {
  title: "Privacy Notice",
  description:
    "How Truth Care Group handles the personal information you send through truthcaregroup.co.uk: what we collect, our lawful basis, who processes it, how long we keep it and your rights under UK GDPR.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return <LegalProse page={PRIVACY} related={{ href: "/cookie-policy", label: "our cookie policy" }} />;
}
