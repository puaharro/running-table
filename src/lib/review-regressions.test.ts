import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { assertCatalog } from "./catalog";
import { defaultFilters, channelStatus, nextScheduledRace, selectRaces } from "./races";
import type { Race } from "./types";

const now = "2026-10-25T12:00:00+08:00";

describe("searching group starting points", () => {
  it("finds the actual marathon start and combines it with distance filters", () => {
    const results = selectRaces(races, { ...defaultFilters, q: "彌敦道" }, now);
    expect(results).toHaveLength(1);
    expect(results[0].groups.map((group) => group.venue)).toEqual(["尖沙咀彌敦道", "尖沙咀彌敦道"]);
    expect(
      selectRaces(races, { ...defaultFilters, q: "彌敦道", distances: ["10K"] }, now),
    ).toHaveLength(0);
    expect(
      selectRaces(races, { ...defaultFilters, q: "彌敦道", distances: ["全馬"] }, now),
    ).toHaveLength(1);
  });
});

describe("timestamp-only registration opening", () => {
  const race: Race = {
    ...races[0],
    groups: [
      {
        ...races[0].groups[0],
        channels: [
          {
            ...races[0].groups[0].channels[0],
            status: "upcoming",
            registrationStart: undefined,
            registrationOpensAt: "2026-10-25T10:00:00+08:00",
            registrationClosesAt: "2026-10-26T12:00:00+08:00",
            deadline: "2026-10-26",
            registrationVerifiedAt: "2026-10-25T09:00:00+08:00",
          },
        ],
      },
    ],
  };
  it("keeps future openings upcoming and requires verification at the exact opening instant", () => {
    expect(() => assertCatalog([race])).not.toThrow();
    const group = race.groups[0].channels[0];
    expect(channelStatus(race, race.groups[0], group, "2026-10-25T09:59:59+08:00")).toBe(
      "upcoming",
    );
    expect(channelStatus(race, race.groups[0], group, "2026-10-25T02:00:00Z")).toBe("unknown");
    expect(channelStatus(race, race.groups[0], group, now)).toBe("unknown");
    expect(channelStatus(race, race.groups[0], group, "2026-10-26T12:00:00+08:00")).toBe("closed");
    expect(channelStatus(race, race.groups[0], { ...group, status: "open" }, now)).toBe("open");
  });
});

describe("next race selection as the Hong Kong date changes", () => {
  const first: Race = { ...races[0], date: "2026-10-25", endDate: "2026-10-25" };
  const second: Race = { ...races[1], date: "2026-10-26", endDate: "2026-10-26" };
  it("moves to the next event at HK midnight even when input is unsorted", () => {
    const events = [second, first];
    expect(nextScheduledRace(events, "2026-10-25T15:59:59Z")).toBe(first);
    expect(nextScheduledRace(events, "2026-10-25T16:00:00Z")).toBe(second);
    expect(events).toEqual([second, first]);
    expect(nextScheduledRace(events, "2026-10-26T16:00:00Z")).toBeUndefined();
  });
  it("keeps ongoing multi-day races and skips unavailable events", () => {
    const ongoing = { ...first, date: "2026-10-24", endDate: "2026-10-26" };
    expect(nextScheduledRace([second, ongoing], now)).toBe(ongoing);
    for (const status of ["completed", "cancelled", "postponed"] as const) {
      expect(nextScheduledRace([{ ...first, status }, second], now)).toBe(second);
    }
    expect(nextScheduledRace([], now)).toBeUndefined();
  });
});
