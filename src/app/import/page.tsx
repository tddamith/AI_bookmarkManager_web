import type { Metadata } from "next";
import { ImportProgress } from "@/components/import/import-progress";
import { OnboardingShell } from "@/components/import/onboarding-shell";

export const metadata: Metadata = {
  title: "Importing",
  description: "Tidypin is sorting your bookmarks.",
  alternates: { canonical: "/import" },
  robots: { index: false, follow: false },
};

export default function ImportPage() {
  return (
    <OnboardingShell step={2} bg="bg-paper" from="/import">
      <ImportProgress />
    </OnboardingShell>
  );
}
