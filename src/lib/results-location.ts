import { defaultFilters, parseFilters, serializeFilters } from "./races";
import { localPath } from "./english-races";
import type { Filters } from "./types";

export const favoriteResultsHref = "/races/?saved=1#race-list";
export const quickSearchQueryKey = "fromSearch";
const resultsStorageKey = "rundates:results";
function resultsPage(params: URLSearchParams) {
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

export function quickSearchResultsHref(query: string | null) {
  const q = query?.trim().slice(0, 100);
  return q ? resultsHref({ ...defaultFilters, q, view: "all" }) : null;
}

export function resultsAnchorRaceId(hash: string) {
  if (hash === "#race-list") return undefined;
  return /^#race-([a-z0-9-]+)$/.exec(hash)?.[1];
}

export function rememberResultsHref(href: string) {
  try {
    window.sessionStorage.setItem(resultsStorageKey, href);
  } catch {
    /* The current URL is still usable when browser storage is unavailable. */
  }
}

export function replaceResultsHref(href: string, english: boolean) {
  window.history.replaceState(null, "", localPath(href, english));
  rememberResultsHref(href);
}

export function readRememberedResultsHref() {
  try {
    return safeResultsHref(window.sessionStorage.getItem(resultsStorageKey));
  } catch {
    return resultsHref();
  }
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
    return resultsHref(
      parseFilters(url.searchParams),
      resultsAnchorRaceId(url.hash),
      resultsPage(url.searchParams),
    );
  } catch {
    return "/races/#race-list";
  }
}
