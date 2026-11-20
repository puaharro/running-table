import { clockTime, hongKongToday, selectRaces, type Clock } from "./races";
import { listDeadline } from "./list-registration";
import { raceHref } from "./site";
import { distanceOptions, regions, type Filters, type Race, type RaceGroup } from "./types";

export type RaceResult = { race: Race; groups: RaceGroup[] };
const racesPerPage = 10;
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

export function calendarResults(races: Race[], filters: Filters, now: Clock, savedOnly: boolean) {
  if (filters.sort === "deadline") {
    return orderByListedDeadline(selectRaces(races, { ...filters, sort: "date" }, now), now);
  }
  const results = selectRaces(races, filters, now);
  return savedOnly && filters.sort === "date" ? orderSavedResults(results, now) : results;
}

export function calendarOptionCounts(races: Race[], filters: Filters, now: Clock) {
  return {
    regions: regions.map(
      (region) => selectRaces(races, { ...filters, countries: [], regions: [region] }, now).length,
    ),
    distances: distanceOptions.map(
      (distance) => selectRaces(races, { ...filters, distances: [distance] }, now).length,
    ),
  };
}

export function activeCalendarFilterCount(filters: Filters) {
  return (
    Number(Boolean(filters.from || filters.to)) +
    Number(Boolean(filters.month)) +
    Number(Boolean(filters.min || filters.max)) +
    Number(filters.family) +
    Number(filters.themed) +
    filters.countries.length +
    filters.regions.length +
    filters.distances.length +
    filters.sports.length +
    filters.statuses.length +
    filters.channels.length
  );
}

export function calendarFilterRelaxation(races: Race[], filters: Filters, now: Clock) {
  const candidates = [
    ["month", filters.month, { month: "" }],
    ["date", filters.from || filters.to, { from: "", to: "" }],
    [
      "location",
      filters.countries.length || filters.regions.length,
      { countries: [], regions: [] },
    ],
    [
      "distance",
      filters.distances.length || filters.min || filters.max,
      { distances: [], min: "", max: "" },
    ],
    ["themed", filters.themed, { themed: false }],
    ["family", filters.family, { family: false }],
    ["status", filters.statuses.length, { statuses: [] }],
    ["channel", filters.channels.length, { channels: [] }],
    ["query", filters.q, { q: "" }],
  ] as const satisfies ReadonlyArray<
    readonly [string, string | number | boolean, Partial<Filters>]
  >;
  const options = candidates.flatMap(([kind, active, patch]) =>
    active ? [{ kind, next: { ...filters, ...patch } }] : [],
  );
  return options.find(({ next }) => selectRaces(races, next, now).length > 0) ?? options[0];
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
