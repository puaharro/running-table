import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { races } from "@/data/races";
import { RaceExplorer } from "@/components/race-explorer";
import { defaultFilters, selectRaces } from "./races";
import {
  filteredRaceHref,
  orderByListedDeadline,
  orderSavedResults,
  paginateResults,
} from "./list-view";
import { resultsEntry, resultsHref, safeResultsHref } from "./results-location";
const now = "2026-11-07T02:00:00Z";
it("renders ten races per page and preserves all results without overlap or omissions", () => {
  const results = Array.from({ length: 21 }, (_, id) => id);
  const first = paginateResults(results, 1),
    second = paginateResults(results, 2),
    last = paginateResults(results, 3);
  expect([first.items.length, second.items.length, last.items.length]).toEqual([10, 10, 1]);
  expect([...first.items, ...second.items, ...last.items]).toEqual(results);
  expect([second.from, second.to, second.pages]).toEqual([11, 20, 3]);
  expect(paginateResults(results, 99).page).toBe(3);
  expect(paginateResults([], 99)).toMatchObject({ page: 1, from: 0, to: 0, items: [] });
  for (const page of [-1, 0, NaN, Infinity, 1.5])
    expect(paginateResults(results, page).page).toBe(1);
});
it("keeps page and race anchor through a safe detail return while saved-list entry resets to page one", () => {
  const filters = { ...defaultFilters, q: "跑", distances: ["半馬"] };
  const href = resultsHref(filters, "race-two", 2);
  const entry = resultsEntry(new URL(safeResultsHref(href), "https://test.invalid").searchParams);
  expect(entry.page).toBe(2);
  expect(entry.filters).toEqual(filters);
  expect(safeResultsHref(href)).toContain("#race-race-two");
  expect(resultsEntry(new URLSearchParams("saved=1&page=3")).page).toBe(1);
  for (const page of ["0", "-1", "1.5", "NaN", "9999999999", "2evil"])
    expect(resultsEntry(new URLSearchParams(`page=${page}`)).page).toBe(1);
});
it("shows matched distances and links directly to the matched half-marathon group", () => {
  const filters = { ...defaultFilters, view: "all" as const, q: "主賽事", distances: ["半馬"] };
  const result = selectRaces(races, filters, now)[0];
  expect(result.groups.every((g) => Math.abs(g.distanceKm - 21.0975) < 0.1)).toBe(true);
  expect(filteredRaceHref(result.race, result.groups, filters)).toContain(
    `#group-${result.groups[0].id}`,
  );
  expect(filteredRaceHref(result.race, result.race.groups, defaultFilters)).not.toContain("#");
  expect(result.groups.length).toBeLessThan(result.race.groups.length);
});
it("keeps upcoming saved races first, past saved races newest first, and does not mutate the source", () => {
  const base = races[0];
  const make = (id: string, date: string) => ({
    race: { ...base, id, date, endDate: date, status: "scheduled" as const },
    groups: [{ ...base.groups[0], date, endDate: undefined }],
  });
  const input = [
    make("old", "2025-01-01"),
    make("later", "2026-12-01"),
    make("recent", "2026-10-01"),
    make("next", "2026-11-08"),
  ];
  expect(orderSavedResults(input, now).map((r) => r.race.id)).toEqual([
    "next",
    "later",
    "recent",
    "old",
  ]);
  expect(input[0].race.id).toBe("old");
});
it("exports only ten list cards while retaining total count and accessible next-page controls", () => {
  const html = renderToStaticMarkup(createElement(RaceExplorer, { races, initialNow: now }));
  expect(html.match(/class="calendar-race-card"/g)).toHaveLength(10);
  expect(html).toContain('aria-label="賽事列表分頁"');
  expect(html).toContain("下一頁");
  expect(html).toContain("上一頁");
  expect(html).toContain("共 ");
});

it("orders by the displayed verified deadline even when live registration is unconfirmed", () => {
  const base = races[0];
  const make = (id: string, deadline?: string) => {
    const channel = {
      ...base.groups[0].channels[0],
      status: "unknown" as const,
      deadline,
      registrationClosesAt: undefined,
      sourceIds: ["official"],
    };
    return {
      race: {
        ...base,
        id,
        sources: [
          {
            id: "official",
            title: "Official",
            url: "https://example.test/",
            fields: ["channels.registration"],
            checkedAt: now,
          },
        ],
      },
      groups: [{ ...base.groups[0], channels: [channel] }],
    };
  };
  const input = [make("none"), make("later", "2026-11-10"), make("sooner", "2026-11-08")];
  expect(orderByListedDeadline(input, now).map(({ race }) => race.id)).toEqual([
    "sooner",
    "later",
    "none",
  ]);
  expect(input[0].race.id).toBe("none");
});
