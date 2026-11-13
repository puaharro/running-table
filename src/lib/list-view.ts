import { clockTime, hongKongToday, type Clock } from "./races";
import { listDeadline } from "./list-registration";
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
export function orderByListedDeadline(results: RaceResult[], now: Clock) {
  return results
    .map((result) => {
      const date = listDeadline(result.race, result.groups, now)?.date;
      const deadline = date
        ? Date.parse(date.length === 10 ? `${date}T23:59:59.999+08:00` : date)
        : Infinity;
      return { result, deadline };
    })
    .sort((a, b) => a.deadline - b.deadline || a.result.race.date.localeCompare(b.result.race.date))
    .map(({ result }) => result);
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
