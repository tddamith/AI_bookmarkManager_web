"use client";

import { useEffect, useState } from "react";
import { getProPrice, type ProPrice } from "@/config/pricing";

/**
 * Pro price for client components. The first render assumes a promo with an end date is still running (no clock is read, so the
 * server and browser render identical HTML and Next can prerender the page); right after mount the real date is checked.
 */
export function useProPrice(): ProPrice {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => { void Promise.resolve().then(() => setNow(new Date())); }, []);
  return getProPrice(now ?? new Date(0));
}
