import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { groupLocations } from "./group-locations";
import { defaultFilters, selectRaces } from "./races";

const race = races.find((race) => race.id === "standard-chartered-hk-marathon-2027")!;
const now = "2026-10-25T12:00:00+08:00";

describe("locations of the matching groups", () => {
  it("shows Nathan Road for a search or a Kowloon marathon filter", () => {
    for (const filters of [
      { ...defaultFilters, q: "彌敦道" },
      { ...defaultFilters, distances: ["全馬"], regions: ["九龍"] },
    ]) {
      const result = selectRaces([race], filters, now)[0];
      expect(groupLocations(result.race, result.groups)).toEqual([
        {
          venue: "尖沙咀彌敦道",
          region: "九龍",
          distances: filters.distances.length ? ["全馬"] : ["全馬", "半馬"],
        },
      ]);
    }
  });
  it("separates verified 10K and half marathon starts", () => {
    const result = selectRaces([race], { ...defaultFilters, distances: ["10K"] }, now)[0];
    expect(groupLocations(result.race, result.groups)).toEqual([
      { venue: "東區走廊", region: "港島", distances: ["10K"] },
    ]);
    expect(groupLocations(race, race.groups)).toEqual([
      { venue: "尖沙咀彌敦道", region: "九龍", distances: ["全馬", "半馬"] },
      { venue: "東區走廊", region: "港島", distances: ["10K"] },
    ]);
    const unknown = { ...race.groups[2], venue: undefined, region: undefined };
    expect(groupLocations(race, [unknown])).toEqual([
      { venue: null, region: null, distances: ["10K"] },
    ]);
  });
  it("combines shared starts without repeating the venue or distance", () => {
    const shared = races[0];
    expect(groupLocations(shared, [...shared.groups, shared.groups[0]])).toEqual([
      { venue: shared.venue, region: shared.region, distances: ["半馬", "10K"] },
    ]);
  });
  it("keeps explicitly unknown or different group starts separate from event defaults", () => {
    const shared = races[0];
    const group = { ...shared.groups[0], venue: undefined };
    expect(groupLocations(shared, [{ ...group, region: null }])[0].venue).toBeNull();
    expect(groupLocations(shared, [{ ...group, region: "九龍" }])[0].venue).toBeNull();
    expect(groupLocations(shared, [{ ...group, region: "九龍", venue: "尖沙咀" }])[0].venue).toBe(
      "尖沙咀",
    );
    expect(groupLocations(shared, [])).toEqual([]);
  });
});
