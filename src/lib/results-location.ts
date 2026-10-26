import { defaultFilters, parseFilters, serializeFilters } from "./races";
import type { Filters } from "./types";

export function resultsHref(filters: Filters = defaultFilters, raceId?: string) {
  const query = serializeFilters(filters);
  const anchor = raceId && /^[a-z0-9-]+$/.test(raceId) ? `race-${raceId}` : "race-list";
  return `/${query ? `?${query}` : ""}#${anchor}`;
}

export function safeResultsHref(saved: string | null) {
  if (!saved || !saved.startsWith("/") || saved.startsWith("//")) return "/#race-list";
  try {
    const url = new URL(saved, "https://results.invalid");
    if (url.pathname !== "/") return "/#race-list";
    const raceId = /^#race-([a-z0-9-]+)$/.exec(url.hash)?.[1];
    return resultsHref(parseFilters(url.searchParams), raceId === "list" ? undefined : raceId);
  } catch {
    return "/#race-list";
  }
}
