import { expect, it } from "vitest";
import { recentSortRaces, expectedRecentIds } from "../../tests/fixtures/recent-sort";
import { defaultFilters, selectRaces } from "./races";
import { paginateResults } from "./list-view";
import { resultsEntry, resultsHref } from "./results-location";
import type { Filters } from "./types";

const now = "2026-11-13T13:00:00Z";
const filters: Filters = { ...defaultFilters, sort: "recent" };
const ids = (selected: ReturnType<typeof selectRaces>) => selected.map(({ race }) => race.id);

it("sorts mixed update years/months newest first, breaking equal updates by race day", () => {
  expect(ids(selectRaces(recentSortRaces, filters, now))).toEqual(expectedRecentIds);
  expect(ids(selectRaces([...recentSortRaces].reverse(), filters, now))).toEqual(expectedRecentIds);
  expect(ids(selectRaces(recentSortRaces, defaultFilters, now))).not.toEqual(expectedRecentIds);
});

it("keeps recent order after keyword and distance filtering", () => {
  expect(ids(selectRaces(recentSortRaces, { ...filters, q: "組合" }, now))).toEqual([
    "qa-recent-newest",
    "qa-recent-november",
    "qa-recent-old-year",
  ]);
  expect(ids(selectRaces(recentSortRaces, { ...filters, distances: ["10K"] }, now))).toEqual(
    expectedRecentIds.filter((id) => !["qa-recent-newest", "qa-recent-oldest"].includes(id)),
  );
});

it("paginates the full sorted set without sorting each page separately or losing records", () => {
  const result = selectRaces(recentSortRaces, filters, now);
  const one = paginateResults(result, 1),
    two = paginateResults(result, 2);
  expect(ids(one.items)).toEqual(expectedRecentIds.slice(0, 10));
  expect(ids(two.items)).toEqual(expectedRecentIds.slice(10));
  expect(new Set([...ids(one.items), ...ids(two.items)]).size).toBe(12);
  const restored = resultsEntry(
    new URL(resultsHref(filters, undefined, 2), "https://example.test").searchParams,
  );
  expect(restored.page).toBe(2);
  expect(
    ids(paginateResults(selectRaces(recentSortRaces, restored.filters, now), restored.page).items),
  ).toEqual(expectedRecentIds.slice(10));
});

it("does not mutate the fixture or its groups when sorting repeatedly", () => {
  const original = structuredClone(recentSortRaces);
  for (const sort of ["recent", "date", "recent"] as const)
    selectRaces(recentSortRaces, { ...filters, sort }, now);
  expect(recentSortRaces).toEqual(original);
});
