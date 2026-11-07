import { defaultFilters, parseFilters, serializeFilters } from "./races";
import type { Filters } from "./types";

export const favoriteResultsHref = "/races/?saved=1#race-list";
export function resultsPage(params: URLSearchParams) {
  const value = params.get("page") ?? "1";
  return /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1;
}

export function resultsEntry(params: URLSearchParams) {
  const savedOnly = params.get("saved") === "1";
  return {
    savedOnly,
    page: savedOnly ? 1 : resultsPage(params),
    filters: savedOnly ? { ...defaultFilters, view: "all" as const } : parseFilters(params),
  };
}

export function resultsHref(filters: Filters = defaultFilters, raceId?: string, page = 1) {
  const params = new URLSearchParams(serializeFilters(filters));
  if (Number.isSafeInteger(page) && page > 1 && page <= 999999) params.set("page", String(page));
  const query = params.toString();
  const anchor = raceId && /^[a-z0-9-]+$/.test(raceId) ? `race-${raceId}` : "race-list";
  return `/races/${query ? `?${query}` : ""}#${anchor}`;
}

export function safeResultsHref(saved: string | null) {
  if (!saved || !saved.startsWith("/") || saved.startsWith("//")) return "/races/#race-list";
  try {
    const url = new URL(saved, "https://results.invalid");
    if (
      url.origin !== "https://results.invalid" ||
      !["/", "/races/", "/races"].includes(url.pathname)
    )
      return "/races/#race-list";
    const raceId = /^#race-([a-z0-9-]+)$/.exec(url.hash)?.[1];
    return resultsHref(
      parseFilters(url.searchParams),
      raceId === "list" ? undefined : raceId,
      resultsPage(url.searchParams),
    );
  } catch {
    return "/races/#race-list";
  }
}
