import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { channelStatus, defaultFilters, selectRaces } from "./races";

const now = "2026-10-26T14:00:00+08:00";
const main = races.find((race) => race.id === "standard-chartered-hk-marathon-2027")!;

describe("official channel review on 26 October", () => {
  it("keeps named charity recruitment closed before the organiser runner-registration deadline", () => {
    for (const group of main.groups) {
      const avs = group.channels.find((channel) => channel.id.endsWith("-avs"))!;
      const kely = group.channels.find((channel) => channel.id.endsWith("-kely"))!;
      expect(avs.deadline).toBe("2026-10-15");
      expect(avs.registrationClosesAt).toBeUndefined(); // Official AVS page publishes no time.
      expect(kely.registrationClosesAt).toBe("2026-10-16T23:59:00+08:00");
      expect(channelStatus(main, group, avs, now)).toBe("closed");
      expect(channelStatus(main, group, kely, now)).toBe("closed");
    }
    expect(main.groups.map((g) => g.channels.find((c) => c.id.endsWith("-avs"))!.price)).toEqual([
      7000, 6000, 5000,
    ]);
    expect(main.groups.map((g) => g.channels.find((c) => c.id.endsWith("-kely"))!.price)).toEqual([
      5000, 5000, 3000,
    ]);
    expect(
      selectRaces([main], { ...defaultFilters, channels: ["charity"], statuses: ["open"] }, now),
    ).toEqual([]);
  });

  it("limits currently actionable hotel results to the verified full-marathon application", () => {
    const results = selectRaces(
      [main],
      {
        ...defaultFilters,
        channels: ["hotel"],
        statuses: ["open"],
      },
      now,
    );
    expect(results).toHaveLength(1);
    expect(results[0].groups.map((group) => group.distanceKm)).toEqual([42.195]);
    const hotel = results[0].groups[0].channels[0];
    expect(hotel.price).toBe(2942);
    expect(hotel.priceType).toBe("package");
    expect(hotel.sourceIds).toContain("schkm-hotel-entry");
    expect(hotel.registrationNote).toContain("不保證");
    expect(
      selectRaces(
        [main],
        {
          ...defaultFilters,
          distances: ["半馬"],
          channels: ["hotel"],
          statuses: ["open"],
        },
        now,
      ),
    ).toEqual([]);
  });

  it("keeps the closed harbour ballot out of open results during its result/payment window", () => {
    const race = races.find((race) => race.id === "schkm-harbourfront-2027")!;
    expect(race.groups[0].channels[0].status).toBe("closed");
    expect(selectRaces([race], { ...defaultFilters, statuses: ["open"] }, now)).toEqual([]);
    expect(
      channelStatus(race, race.groups[0], race.groups[0].channels[0], "2026-10-29T14:00:00+08:00"),
    ).toBe("closed");
  });
});
