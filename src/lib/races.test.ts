import { describe, expect, it } from "vitest";
import { races } from "../../tests/fixtures/races";
import {
  defaultFilters,
  filterError,
  groupStatus,
  hongKongToday,
  parseFilters,
  selectRaces,
  serializeFilters,
  statusSummary,
  validDate,
} from "./races";
import type { Filters } from "./types";
const today = "2026-10-21";
const choose = (overrides: Partial<Filters>) =>
  selectRaces(races, { ...defaultFilters, ...overrides }, today);
describe("matching a race and its groups", () => {
  it("combines region, distance, date and registration on the same group", () => {
    const result = choose({
      regions: ["新界"],
      distances: ["10K"],
      statuses: ["open"],
      from: "2026-11-01",
      to: "2026-11-30",
    });
    expect(result.map((x) => x.race.id)).toEqual(["river-loop-2026"]);
  });
  it("does not use an open full marathon to match a closed 10K", () => {
    expect(choose({ q: "冬日", distances: ["10K"], statuses: ["open"] })).toHaveLength(0);
    expect(choose({ q: "冬日", distances: ["全馬"], statuses: ["open"] })).toHaveLength(1);
  });
  it("does not match distance on one day with date on another", () => {
    expect(
      choose({ q: "春日", distances: ["5K"], from: "2027-02-07", to: "2027-02-07" }),
    ).toHaveLength(0);
    expect(
      choose({ q: "春日", distances: ["10K"], from: "2027-02-07", to: "2027-02-07" }),
    ).toHaveLength(1);
  });
  it("uses OR within a filter and lists a multi-group event once", () => {
    const result = choose({ q: "親子同", distances: ["5K", "其他"] });
    expect(result).toHaveLength(1);
    expect(result[0].groups).toHaveLength(2);
  });
  it("searches English names and places", () => {
    expect(choose({ q: "RIVER LOOP" })[0].race.id).toBe("river-loop-2026");
    expect(choose({ q: "沙田" })).toHaveLength(1);
  });
  it("handles past and all views", () => {
    expect(choose({ view: "past" }).map((x) => x.race.id)).toEqual(["autumn-community-2026"]);
    expect(choose({ view: "all" })).toHaveLength(races.length);
  });
  it("sorts actionable deadlines first and unknown deadlines last", () => {
    const result = choose({ sort: "deadline" });
    expect(result[0].race.id).toBe("harbour-morning-2026");
    expect(result.findIndex((x) => x.race.id === "winter-long-run-2026")).toBeLessThan(
      result.findIndex((x) => x.race.id === "island-breeze-2026"),
    );
  });
});
describe("statuses and Hong Kong dates", () => {
  it("closes registration after its deadline, but keeps date-only deadline inclusive", () => {
    const race = races[0],
      group = race.groups[0];
    expect(groupStatus(race, group, "2026-10-30")).toBe("open");
    expect(groupStatus(race, group, "2026-10-31")).toBe("closed");
  });
  it("never leaves cancelled or completed races open", () => {
    const race = races[0],
      group = race.groups[0];
    expect(groupStatus({ ...race, status: "cancelled" }, group, today)).toBe("closed");
    expect(groupStatus(race, group, "2026-11-09")).toBe("closed");
    expect(groupStatus({ ...race, status: "postponed" }, group, today)).toBe("unknown");
  });
  it("does not invent an open status when an announced opening date arrives", () => {
    const race = races.find((x) => x.id === "new-year-stride-2027")!;
    expect(groupStatus(race, race.groups[0], "2026-12-02")).toBe("unknown");
  });
  it("marks partial availability and produces the correct HK day", () => {
    expect(statusSummary(races[0], races[0].groups, today).label).toBe("部分渠道接受申請");
    expect(hongKongToday(new Date("2026-10-20T16:00:00Z"))).toBe(today);
    expect(hongKongToday(new Date("2026-10-20T15:59:59Z"))).toBe("2026-10-20");
  });
});
describe("shareable filters and invalid input", () => {
  it("roundtrips multi-value filters", () => {
    const f: Filters = {
      ...defaultFilters,
      q: "海濱",
      from: today,
      to: "2027-02-28",
      distances: ["5K", "半馬"],
      regions: ["港島", "新界"],
      sports: ["路跑"],
      statuses: ["open", "unknown"],
      min: "3",
      max: "50",
      view: "all",
      sort: "deadline",
    };
    expect(parseFilters(new URLSearchParams(serializeFilters(f)))).toEqual(f);
  });
  it("rejects unknown query values and impossible dates", () => {
    const f = parseFilters(
      new URLSearchParams(
        "region=火星&status=invalid&from=2026-02-30&min=-1&view=wrong&sport=越野",
      ),
    );
    expect(f).toEqual(defaultFilters);
    expect(validDate("2028-02-29")).toBe(true);
    expect(validDate("2026-02-29")).toBe(false);
  });
  it("returns helpful errors for reversed or negative ranges", () => {
    expect(filterError({ ...defaultFilters, from: "2026-12-01", to: today })).not.toBe("");
    expect(filterError({ ...defaultFilters, min: "10", max: "5" })).not.toBe("");
    expect(filterError({ ...defaultFilters, min: "-1" })).not.toBe("");
    expect(choose({ min: "10", max: "5" })).toEqual([]);
  });
});
