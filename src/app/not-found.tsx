import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main id="main" className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link href="/" className="underline">
        Back to home
      </Link>
    </main>
  );
}
