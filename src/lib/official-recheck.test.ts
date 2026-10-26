import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { channelStatus, defaultFilters, selectRaces } from "./races";

const now = "2026-10-27T01:00:00+08:00";
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
    const result = selectRaces(
      [main],
      { ...defaultFilters, channels: ["charity"], statuses: ["open"] },
      now,
    );
    expect(result.flatMap((r) => r.groups.flatMap((g) => g.channels.map((c) => c.id)))).toEqual([
      "schkm-2027-half-charity-herfund",
      "schkm-2027-10k-charity-herfund",
    ]);
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

// Further official evidence: each applicable group and NGO keeps its own scope.
describe("remaining official evidence review", () => {
  it("matches all four UNICEF starts to Islands without turning the unlisted half marathon open", () => {
    const race = races.find((r) => r.id === "unicef-powerun-2027")!;
    const result = selectRaces([race], { ...defaultFilters, regions: ["離島"] }, now);
    expect(result).toHaveLength(1);
    expect(result[0].groups).toHaveLength(4);
    expect(
      result[0].groups.every(
        (g) =>
          g.venue === "香港迪士尼樂園旅遊巴士停車場" && g.sourceIds?.includes("unicef-start-faq"),
      ),
    ).toBe(true);
    expect(
      selectRaces(
        [race],
        { ...defaultFilters, regions: ["離島"], distances: ["半馬"], statuses: ["open"] },
        now,
      ),
    ).toEqual([]);
    expect(
      selectRaces(
        [race],
        { ...defaultFilters, regions: ["離島"], distances: ["10K"], statuses: ["open"] },
        now,
      )[0].groups.map((g) => g.id),
    ).toEqual(["unicef-2027-10k"]);
  });

  it("separates school-only 10K minimum fundraising from the same NGO's public marathon channels", () => {
    const channels = main.groups.map((g) => g.channels.find((c) => c.id.endsWith("-laviolet"))!);
    expect(channels.map((c) => c.price)).toEqual([3800, 3800, 10000]);
    expect(channels.every((c) => c.priceType === "minimum-donation" && c.status === "closed")).toBe(
      true,
    );
    expect(channels[2].eligibility).toContain("只限學校");
    expect(
      channels.every((c) => c.deadline === "2026-10-14" && c.registrationClosesAt === undefined),
    ).toBe(true);
  });

  it("does not invent other distances or reopen NGO recruitment for the organiser's November registration", () => {
    expect(
      main.groups.filter((g) => g.channels.some((c) => c.id.endsWith("-feedinghk"))),
    ).toHaveLength(1);
    const half = main.groups.find((g) => g.distanceKm === 21.0975)!;
    const feeding = half.channels.find((c) => c.id.endsWith("-feedinghk"))!;
    expect(feeding.registrationClosesAt).toBe("2026-10-09T23:59:00+08:00");
    expect(channelStatus(main, half, feeding, now)).toBe("closed");
    const acsvaw = main.groups.map((g) => g.channels.find((c) => c.id.endsWith("-acsvaw"))!);
    expect(acsvaw.map((c) => c.price)).toEqual([4000, 3500, 2500]);
    expect(
      acsvaw.every((c) => c.deadline === "2026-10-15" && c.registrationClosesAt === undefined),
    ).toBe(true);
    const result = selectRaces(
      [main],
      { ...defaultFilters, channels: ["charity"], statuses: ["open"] },
      now,
    );
    expect(result.flatMap((r) => r.groups.flatMap((g) => g.channels.map((c) => c.id)))).toEqual([
      "schkm-2027-half-charity-herfund",
      "schkm-2027-10k-charity-herfund",
    ]);
  });
});

describe("additional NGO evidence without extrapolating availability or prices", () => {
  it("offers only the two verified HER Fund distances when filtering open charity applications", () => {
    const result = selectRaces(
      [main],
      { ...defaultFilters, channels: ["charity"], statuses: ["open"] },
      now,
    );
    expect(result).toHaveLength(1);
    expect(result[0].groups.map((g) => g.distanceKm)).toEqual([21.0975, 10]);
    expect(
      result[0].groups.every(
        (g) =>
          g.channels.length === 1 &&
          g.channels[0].price === 2500 &&
          g.channels[0].deadline === "2026-11-02" &&
          !g.channels[0].registrationClosesAt,
      ),
    ).toBe(true);
    expect(
      selectRaces(
        [main],
        { ...defaultFilters, distances: ["全馬"], channels: ["charity"], statuses: ["open"] },
        now,
      ),
    ).toEqual([]);
  });
  it("keeps APF individual and team rates independent and discloses the extra per-person reservation charge", () => {
    const half = main.groups[1].channels.find((c) => c.id.endsWith("-apf-individual"))!;
    const ten = main.groups[2].channels.find((c) => c.id.endsWith("-apf-individual"))!;
    const team = main.groups[2].channels.find((c) => c.id.endsWith("-apf-team"))!;
    expect([half.price, ten.price, team.price]).toEqual([2800, 2600, 4000]);
    expect(team.eligibility).toContain("2–3人");
    expect(
      [half, ten, team].every(
        (c) =>
          c.priceNote?.includes("HK$100") &&
          c.deadline === "2026-10-12" &&
          channelStatus(main, main.groups[2], c, now) === "closed",
      ),
    ).toBe(true);
  });
  it("preserves the family foundation sold-out evidence without inventing a minimum from its fundraising target", () => {
    for (const group of main.groups) {
      const channel = group.channels.find((c) => c.id.endsWith("-familyvalue"))!;
      expect(channelStatus(main, group, channel, now)).toBe("full");
      expect(channel.price).toBeNull();
      expect(channel.priceNote).toContain("籌款目標HK$10,000");
    }
  });
  it("uses the breast cancer foundation recruitment deadline, not the later organiser registration", () => {
    const channels = main.groups
      .slice(1)
      .map((g) => g.channels.find((c) => c.id.endsWith("-hkbcf"))!);
    expect(channels.map((c) => c.price)).toEqual([2600, 2200]);
    expect(
      channels.every(
        (c) => c.registrationClosesAt === "2026-10-11T23:59:00+08:00" && c.status === "closed",
      ),
    ).toBe(true);
  });
});

describe("27 October review preserves unresolved official evidence", () => {
  it("keeps the completed family recruitment separate from its unverified minimum donation", () => {
    for (const group of main.groups) {
      const channel = group.channels.find((c) => c.id.endsWith("-familyvalue"))!;
      expect(channel.sourceIds).toContain("schkm-familyvalue-form");
      expect(channel.registrationNote).toContain("招募已完成");
      expect(channelStatus(main, group, channel, now)).toBe("full");
      expect(channel.price).toBeNull();
    }
    const half = races.find((r) => r.id === "unicef-powerun-2027")!.groups[0].channels[0];
    expect(half.status).toBe("unknown");
  });
});
