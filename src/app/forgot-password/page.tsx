import type { Metadata } from "next";
import { ForgotFlow } from "@/components/auth/forgot-flow";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Reset your Tidypin password with a 6-digit email code.",
  alternates: { canonical: "/forgot-password" },
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return <ForgotFlow />;
}
