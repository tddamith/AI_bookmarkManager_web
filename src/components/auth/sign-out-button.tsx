"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/auth/signout", { method: "POST" });
        router.push("/signin");
        router.refresh();
      }}
      className="inline-flex h-11 cursor-pointer items-center rounded-pill border-[1.5px] border-ink px-5 font-medium hover:bg-white disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
