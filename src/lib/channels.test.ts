import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { assertCatalog } from "./catalog";
import {
  channelStatus,
  defaultFilters,
  parseFilters,
  registrationCountdown,
  selectRaces,
  serializeFilters,
  statusSummary,
} from "./races";
import type { Race, Filters } from "./types";

const now = "2026-10-26T14:00:00+08:00";
const source = races.find((race) => race.id === "standard-chartered-hk-marathon-2027")!;
function event(): Race {
  const race = structuredClone(source);
  // Keep these synthetic filter scenarios independent of newly researched NGO channels.
  for (const group of race.groups) {
    group.channels = group.channels.filter(
      (channel) => !channel.id.endsWith("-avs") && !channel.id.endsWith("-kely"),
    );
    const hotel = group.channels.find((channel) => channel.type === "hotel");
    if (hotel) hotel.status = "unknown";
  }
  const charity = race.groups[0].channels.find((channel) => channel.type === "charity")!;
  charity.status = "open";
  charity.registrationClosesAt = "2026-11-06T23:59:00+08:00";
  charity.registrationVerifiedAt = now;
  return race;
}
const filters = (overrides: Partial<Filters>) => ({ ...defaultFilters, ...overrides });

describe("independent registration channels", () => {
  it("requires type and status to match the same channel", () => {
    const race = event();
    expect(
      selectRaces([race], filters({ channels: ["general"], statuses: ["open"] }), now),
    ).toEqual([]);
    const result = selectRaces([race], filters({ channels: ["charity"], statuses: ["open"] }), now);
    expect(result).toHaveLength(1);
    expect(result[0].groups).toHaveLength(1);
    expect(result[0].groups[0].channels.map((channel) => channel.type)).toEqual(["charity"]);
    expect(race.groups[0].channels).toHaveLength(4);
  });
  it("does not match distance on one group with an open channel on another", () => {
    const race = event();
    const halfGeneral = race.groups[1].channels[0];
    halfGeneral.status = "open";
    halfGeneral.registrationClosesAt = "2026-10-30T12:00:00+08:00";
    halfGeneral.deadline = "2026-10-30";
    expect(
      selectRaces(
        [race],
        filters({ distances: ["全馬"], channels: ["general"], statuses: ["open"] }),
        now,
      ),
    ).toEqual([]);
  });
  it("counts each race and group once when several channels match", () => {
    const race = event();
    const result = selectRaces([race], filters({ channels: ["general", "charity", "hotel"] }), now);
    expect(result).toHaveLength(1);
    expect(result[0].groups.map((group) => group.id)).toEqual(race.groups.map((group) => group.id));
    expect(result[0].groups[0].channels).toHaveLength(3);
    expect(statusSummary(race, race.groups, now)).toEqual({
      key: "open",
      label: "部分渠道接受申請",
    });
  });
  it("only counts down matching actionable channels and includes channel identity", () => {
    const race = event();
    const result = selectRaces(
      [race],
      filters({ channels: ["charity"], statuses: ["open"] }),
      now,
    )[0];
    expect(registrationCountdown(race, result.groups, now)?.channelName).toBe(
      "其他慈善機構（逐間確認）",
    );
    expect(registrationCountdown(race, result.groups, now)?.deadline).toBe(
      "2026-11-06T23:59:00+08:00",
    );
    expect(
      registrationCountdown(
        race,
        selectRaces([race], filters({ channels: ["general"] }), now)[0].groups,
        now,
      ),
    ).toBeNull();
  });
  it("keeps result and payment dates separate from the application deadline", () => {
    const race = event(),
      group = race.groups[0];
    const channel = {
      ...group.channels[0],
      resultAnnouncedAt: "2026-10-29T14:00:00+08:00",
      paymentClosesAt: "2026-11-02T12:00:00+08:00",
    };
    expect(channelStatus(race, group, channel, now)).toBe("closed");
  });
  it("roundtrips channel selections and rejects unknown query values", () => {
    const selected = filters({
      channels: ["priority", "hotel"],
      statuses: ["unknown"],
      sort: "deadline",
    });
    expect(parseFilters(new URLSearchParams(serializeFilters(selected)))).toEqual(selected);
    expect(
      parseFilters(new URLSearchParams("channel=invalid&channel=hotel&channel=hotel")).channels,
    ).toEqual(["hotel"]);
  });
});
describe("channel-specific publication contracts", () => {
  it("preserves the 14 groups while each channel owns its own price and evidence", () => {
    expect(races.reduce((total, race) => total + race.groups.length, 0)).toBe(14);
    expect(source.groups[0].channels.find((channel) => channel.type === "hotel")).toMatchObject({
      price: 2942,
      priceType: "package",
      priceUnit: "每位／一晚",
      status: "open",
    });
    expect(source.groups[0]).not.toHaveProperty("price");
    expect(
      source.groups[0].channels.find((channel) => channel.type === "charity")?.price,
    ).toBeNull();
  });
  it("rejects duplicate channel IDs, broken source references and missing package units", () => {
    let data = structuredClone(races);
    data[0].groups[0].channels.push(structuredClone(data[0].groups[0].channels[0]));
    expect(() => assertCatalog(data)).toThrow("duplicate channel");
    data = structuredClone(races);
    data[0].groups[0].channels[0].sourceIds = ["missing"];
    expect(() => assertCatalog(data)).toThrow("source");
    data = structuredClone(races);
    const hotel = data
      .find((race) => race.id === source.id)!
      .groups[0].channels.find((channel) => channel.type === "hotel")!;
    hotel.priceUnit = "";
    expect(() => assertCatalog(data)).toThrow("price unit");
  });
  it("rejects payment deadlines before the announced result", () => {
    const data = structuredClone(races),
      channel = data[0].groups[0].channels[0];
    channel.resultAnnouncedAt = "2026-10-29T14:00:00+08:00";
    channel.paymentClosesAt = "2026-10-28T12:00:00+08:00";
    expect(() => assertCatalog(data)).toThrow("payment deadline");
  });
});
