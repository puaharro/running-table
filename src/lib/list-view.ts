import { clockTime, hongKongToday, type Clock } from "./races";
import { raceHref } from "./site";
import type { Filters, Race, RaceGroup } from "./types";

export type RaceResult = { race: Race; groups: RaceGroup[] };
export const racesPerPage = 10;
export function pastResult(result: RaceResult, now: Clock) {
  const today = hongKongToday(clockTime(now));
  return (
    result.race.status === "completed" ||
    result.groups.every((group) => (group.endDate ?? group.date) < today)
  );
}
export function orderSavedResults(results: RaceResult[], now: Clock) {
  const firstDate = (result: RaceResult) =>
    result.groups.map((group) => group.date).sort()[0] ?? result.race.date;
  return [...results].sort((a, b) => {
    const pastA = pastResult(a, now),
      pastB = pastResult(b, now);
    return (
      Number(pastA) - Number(pastB) ||
      (pastA ? firstDate(b).localeCompare(firstDate(a)) : firstDate(a).localeCompare(firstDate(b)))
    );
  });
}
export function paginateResults<T>(results: T[], requestedPage: number) {
  const pages = Math.max(1, Math.ceil(results.length / racesPerPage));
  const page = Math.min(
    pages,
    Math.max(1, Number.isSafeInteger(requestedPage) ? requestedPage : 1),
  );
  const start = (page - 1) * racesPerPage;
  return {
    page,
    pages,
    items: results.slice(start, start + racesPerPage),
    from: results.length ? start + 1 : 0,
    to: Math.min(start + racesPerPage, results.length),
  };
}
export function filteredRaceHref(race: Race, groups: RaceGroup[], filters: Filters) {
  const scoped =
    groups.length < race.groups.length ||
    filters.distances.length > 0 ||
    !!(filters.min || filters.max);
  return raceHref(race) + (scoped && groups[0] ? `#group-${groups[0].id}` : "");
}
