"use client";

import { useEffect } from "react";
import { defaultFilters, parseFilters, serializeFilters } from "@/lib/races";
import { safeResultsHref } from "@/lib/results-location";

export function LegacySearchRedirect() {
  useEffect(() => {
    const query = serializeFilters(parseFilters(new URLSearchParams(window.location.search)));
    const hasFilters = query !== serializeFilters(defaultFilters);
    if (hasFilters || /^#race-[a-z0-9-]+$/.test(window.location.hash)) {
      window.location.replace(safeResultsHref(`/${window.location.search}${window.location.hash}`));
    }
  }, []);
  return null;
}
