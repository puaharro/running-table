import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { defaultFilters, parseFilters, selectRaces, serializeFilters } from "./races";
import {
  dateShortcutIsActive,
  dateShortcutRange,
  toggleDateShortcut,
  toggleDeadlineShortcut,
  toggleFamilyShortcut,
  toggleOpenShortcut,
} from "./filter-shortcuts";
import type { Filters } from "./types";

const now = "2026-10-27T12:00:00+08:00";
const combined: Filters = {
  ...defaultFilters,
  q: "渣打",
  distances: ["5K"],
  regions: ["九龍"],
  channels: ["general"],
  sort: "recent",
  view: "all",
};

describe("independent, reversible search shortcuts", () => {
  it("toggles accepting applications without resetting other statuses or the view", () => {
    const before: Filters = { ...combined, statuses: ["closed"] };
    const enabled = toggleOpenShortcut(before);
    expect(enabled.statuses).toEqual(["closed", "open"]);
    expect(toggleOpenShortcut(enabled)).toEqual(before);
  });

  it("combines family with a typed search and restores it unchanged on the second click", () => {
    const enabled = toggleFamilyShortcut(combined);
    expect(enabled.q).toBe("渣打");
    expect(selectRaces(races, enabled, now).map(({ race }) => race.id)).toEqual([
      "schkm-harbourfront-2027",
    ]);
    expect(toggleFamilyShortcut(enabled)).toEqual(combined);
    expect(selectRaces(races, { ...enabled, q: "UNICEF" }, now)).toEqual([]);
  });

  it("toggles deadline sorting independently from accepting applications", () => {
    const enabled = toggleDeadlineShortcut(combined, combined.sort);
    expect(enabled).toEqual({ ...combined, sort: "deadline" });
    expect(enabled.statuses).toEqual([]);
    expect(toggleDeadlineShortcut(enabled, combined.sort)).toEqual(combined);
  });

  it("keeps family and accepting applications when deadline sorting is cancelled", () => {
    const before = toggleFamilyShortcut(toggleOpenShortcut(combined));
    const enabled = toggleDeadlineShortcut(before, before.sort);
    expect(toggleDeadlineShortcut(enabled, before.sort)).toEqual(before);
    expect(toggleOpenShortcut(enabled).family).toBe(true);
    expect(toggleFamilyShortcut(enabled).statuses).toEqual(["open"]);
  });

  it.each(["weekend", "month", "next", "year", "next-year"] as const)(
    "%s can be enabled and cancelled without replacing search, region or sort",
    (kind) => {
      const enabled = toggleDateShortcut(combined, kind, now);
      expect(dateShortcutIsActive(enabled, kind, now)).toBe(true);
      expect(toggleDateShortcut(enabled, kind, now)).toEqual(combined);
    },
  );

  it("switches date shortcuts and clears the active one on another click", () => {
    const next = toggleDateShortcut(toggleDateShortcut(combined, "month", now), "next", now);
    expect(next.from).toBe("2026-11-01");
    expect(next.to).toBe("2026-11-30");
    expect(dateShortcutIsActive(next, "month", now)).toBe(false);
    expect(toggleDateShortcut(next, "next", now)).toEqual(combined);
  });

  it("uses Hong Kong dates at month/year boundaries and the remaining Sunday", () => {
    expect(dateShortcutRange("month", "2026-12-31T16:30:00Z")).toEqual({
      from: "2027-01-01",
      to: "2027-01-31",
    });
    expect(dateShortcutRange("weekend", "2026-11-01T12:00:00+08:00")).toEqual({
      from: "2026-11-01",
      to: "2026-11-01",
    });
  });

  it("preserves family and combined filters through sharing and treats invalid values as off", () => {
    const selected = toggleFamilyShortcut(toggleOpenShortcut(combined));
    expect(parseFilters(new URLSearchParams(serializeFilters(selected)))).toEqual(selected);
    expect(parseFilters(new URLSearchParams("family=false")).family).toBe(false);
    expect(parseFilters(new URLSearchParams("family=1")).family).toBe(true);
  });
});

describe("calendar year and country search", () => {
  it("uses the Hong Kong year at midnight and handles next year independently", () => {
    expect(dateShortcutRange("year", "2026-12-31T16:00:00Z")).toEqual({
      from: "2027-01-01",
      to: "2027-12-31",
    });
    expect(dateShortcutRange("next-year", "2026-12-31T15:59:59Z")).toEqual({
      from: "2027-01-01",
      to: "2027-12-31",
    });
  });
  it("combines country with dates and distance without including other countries", () => {
    const hongKong = races.find((race) => race.id === "hzmb-half-marathon-2026")!;
    const japan = { ...hongKong, id: "japan-fixture", country: "日本" as const };
    const selected: Filters = {
      ...defaultFilters,
      countries: ["日本"],
      distances: ["10K"],
      from: "2026-11-01",
      to: "2026-11-30",
    };
    expect(selectRaces([hongKong, japan], selected, now).map(({ race }) => race.id)).toEqual([
      "japan-fixture",
    ]);
    expect(selectRaces(races, selected, now)).toEqual([]);
    expect(parseFilters(new URLSearchParams(serializeFilters(selected)))).toEqual(selected);
    expect(
      parseFilters(new URLSearchParams("country=invalid&country=日本&country=日本")).countries,
    ).toEqual(["日本"]);
  });
});

it("combines a month with a calendar year and preserves it in shared search links", () => {
  const filters = {
    ...defaultFilters,
    ...dateShortcutRange("year", now),
    month: "12",
    view: "all" as const,
  };
  expect(selectRaces(races, filters, now).map(({ race }) => race.id)).toEqual([
    "mizuno-hk-run-fest-2026",
  ]);
  expect(selectRaces(races, { ...filters, month: "1" }, now)).toEqual([]);
  expect(parseFilters(new URLSearchParams(serializeFilters(filters)))).toEqual(filters);
  expect(parseFilters(new URLSearchParams("month=13")).month).toBe("");
  expect(parseFilters(new URLSearchParams("month=1")).month).toBe("1");
});
