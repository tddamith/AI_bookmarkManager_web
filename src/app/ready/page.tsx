import type { Metadata } from "next";
import { OnboardingShell } from "@/components/import/onboarding-shell";
import { ReadySummary } from "@/components/import/ready-summary";

export const metadata: Metadata = {
  title: "All sorted",
  description: "Your bookmarks are sorted.",
  alternates: { canonical: "/ready" },
  robots: { index: false, follow: false },
};

export default function ReadyPage() {
  return (
    <OnboardingShell step={3} bg="bg-sky" from="/ready">
      <ReadySummary />
    </OnboardingShell>
  );
}
