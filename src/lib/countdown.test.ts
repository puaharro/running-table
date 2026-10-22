import { describe, expect, it } from "vitest";
import { races } from "../../tests/fixtures/races";
import { registrationCountdown } from "./races";
import type { Race, RaceGroup } from "./types";

const now = "2026-10-24T12:00:00+08:00";
function event(overrides: Partial<RaceGroup> = {}): Race {
  return {
    ...races[0],
    status: "scheduled",
    verification: "verified",
    date: "2026-11-15",
    endDate: "2026-11-15",
    groups: [
      {
        ...races[0].groups[0],
        date: "2026-11-15",
        status: "open",
        registrationStart: "2026-10-01",
        registrationOpensAt: "2026-10-01T10:00:00+08:00",
        registrationVerifiedAt: "2026-10-24T11:00:00+08:00",
        registrationClosesAt: "2026-10-27T12:00:00+08:00",
        deadline: "2026-10-27",
        ...overrides,
      },
    ],
  };
}
const countdown = (race: Race, time = now) => registrationCountdown(race, race.groups, time);

describe("registration deadline countdown", () => {
  it("counts complete remaining days, not calendar-day boundaries", () => {
    expect(countdown(event())?.label).toBe("仲有 3 日截止");
    expect(countdown(event(), "2026-10-24T12:00:01+08:00")?.label).toBe("仲有 2 日截止");
    expect(countdown(event())?.urgent).toBe(false);
  });
  it("switches to hours, minutes and less than a minute", () => {
    expect(countdown(event({ registrationClosesAt: "2026-10-25T11:30:00+08:00" }))?.label).toBe(
      "仲有 23 小時截止",
    );
    expect(countdown(event({ registrationClosesAt: "2026-10-24T12:59:00+08:00" }))?.label).toBe(
      "仲有 59 分鐘截止",
    );
    const imminent = countdown(event({ registrationClosesAt: "2026-10-24T12:00:30+08:00" }));
    expect(imminent?.label).toBe("不足 1 分鐘截止");
    expect(imminent?.urgent).toBe(true);
  });
  it("stops at the exact cutoff, including equivalent UTC timestamps", () => {
    expect(countdown(event({ registrationClosesAt: "2026-10-24T12:00:00+08:00" }))).toBeNull();
    expect(countdown(event({ registrationClosesAt: "2026-10-24T04:00:00Z" }))).toBeNull();
    expect(countdown(event({ registrationClosesAt: "2026-10-24T04:30:00Z" }))?.label).toBe(
      "仲有 30 分鐘截止",
    );
  });
  it("uses the Hong Kong end of day for date-only deadlines", () => {
    const race = event({ registrationClosesAt: undefined, deadline: "2026-10-24" });
    expect(countdown(race)?.label).toBe("仲有 11 小時截止");
    expect(countdown(race, "2026-10-25T00:00:00+08:00")).toBeNull();
  });
  it("does not advertise stale, unknown, full or not-yet-open registration", () => {
    for (const status of ["full", "closed", "unknown", "waitlist", "upcoming"] as const) {
      expect(countdown(event({ status }))).toBeNull();
    }
    expect(countdown(event({ registrationVerifiedAt: "2026-10-20T11:00:00+08:00" }))).toBeNull();
    expect(countdown(event({ registrationOpensAt: "2026-10-25T10:00:00+08:00" }))).toBeNull();
  });
  it("ignores unavailable groups and only considers groups matching the filters", () => {
    const race = event();
    const later = {
      ...race.groups[0],
      id: "later",
      name: "較後截止組別",
      registrationClosesAt: "2026-10-29T12:00:00+08:00",
    };
    const full = {
      ...race.groups[0],
      id: "full",
      status: "full" as const,
      registrationClosesAt: "2026-10-24T13:00:00+08:00",
    };
    race.groups.push(later, full);
    expect(countdown(race)?.label).toBe("仲有 3 日截止");
    expect(registrationCountdown(race, [later], now)?.label).toBe("仲有 5 日截止");
    expect(registrationCountdown(race, [later], now)?.groupName).toBe("較後截止組別");
  });
  it("does not invent a missing deadline or countdown for cancelled or postponed events", () => {
    expect(countdown(event({ registrationClosesAt: undefined, deadline: undefined }))).toBeNull();
    expect(countdown({ ...event(), status: "cancelled" })).toBeNull();
    expect(countdown({ ...event(), status: "postponed" })).toBeNull();
    expect(countdown(event(), "invalid")).toBeNull();
  });
});
