import { expect, it } from "vitest";
import { races } from "@/data/races";

it("keeps emperor's edition name separate from its 2027 race date", () => {
  const race = races.find((r) => r.id === "emperor-marathon-crossing-2026")!;
  expect(race.date).toBe("2027-01-01");
  expect(race.groups.map((g) => g.distanceKm)).toEqual([42.195, 21.0975, 10, 2, 2]);
  expect(race.groups[0].startTime).toBe("2027-01-01T05:45:00+08:00");
  expect(race.groups.every((g) => g.channels[0].status === "unknown")).toBe(true);
});

it("excludes YMCA's virtual mileage and relays from individual distance filters", () => {
  const race = races.find((r) => r.id === "ymca-125-physical-run-2026")!;
  expect(race.groups.map((g) => g.distanceKm)).toEqual([12.5]);
  expect(race.groups[0].channels[0].price).toBe(320);
  expect(race.groups[0].startTime).toBeUndefined();
  expect(race.groups[0].channels[0].deadline).toBeUndefined();
});

it("separates Ocean Park timed running, family fees and unknown wave times from walking", () => {
  const race = races.find((r) => r.id === "ocean-park-run-for-survival-2026")!;
  expect(race.groups.map((g) => g.distanceKm)).toEqual([5, 4, 4, 1]);
  expect(race.groups.map((g) => g.channels[0].price)).toEqual([798, 798, 1950, 1950]);
  expect(race.groups.every((g) => !g.startTime && !g.name.includes("健步行"))).toBe(true);
  for (const g of race.groups) {
    expect(g.channels[0].status).toBe("unknown");
    expect(g.channels[0].registrationClosesAt).toBe("2026-11-27T23:59:00+08:00");
  }
});
