import { expect, it } from "vitest";
import { races } from "@/data/races";
import { listRegistration } from "./list-registration";
const now = "2026-11-07T02:00:00Z";
function fixture() {
  const race = structuredClone(races[0]);
  race.status = "scheduled";
  race.endDate = "2027-01-01";
  race.verification = "verified";
  race.sources = [
    {
      id: "official",
      title: "Official",
      url: "https://example.com",
      fields: ["channels.registration"],
      checkedAt: now,
    },
  ];
  const group = race.groups[0];
  race.groups = [group];
  group.date = "2027-01-01";
  group.channels = [
    {
      ...group.channels[0],
      id: "general",
      type: "general",
      status: "closed",
      sourceIds: ["official"],
      registrationVerifiedAt: now,
      registrationOpensAt: undefined,
      registrationStart: undefined,
      registrationClosesAt: undefined,
      deadline: "2026-11-01",
    },
    {
      ...group.channels[0],
      id: "charity",
      type: "charity",
      status: "open",
      registrationClosesAt: undefined,
      registrationOpensAt: undefined,
      registrationStart: undefined,
      sourceIds: ["official"],
      registrationVerifiedAt: now,
      deadline: "2026-12-01",
    },
  ];
  return race;
}
it("keeps closed general and open charity separate, without claiming guaranteed places", () => {
  const race = fixture();
  expect(listRegistration(race, race.groups, now)).toBe("慈善報名接受申請 · 一般報名已截止");
});
it("uses only matching groups and channels", () => {
  const race = fixture();
  expect(
    listRegistration(race, [{ ...race.groups[0], channels: [race.groups[0].channels[1]] }], now),
  ).toBe("慈善報名接受申請");
});
it("requires field-specific official provenance, including for expired deadlines", () => {
  const race = fixture();
  race.sources![0].fields = ["date"];
  expect(listRegistration(race, race.groups, now)).toBe("報名待核實");
  race.sources![0].fields = ["channels.registration"];
  race.sources![0].checkedAt = "2026-11-08T02:00:00Z";
  expect(listRegistration(race, race.groups, now)).toBe("報名待核實");
});
it("keeps stale availability unknown alongside verified closed channels", () => {
  const race = fixture();
  race.groups[0].channels[1].registrationVerifiedAt = "2026-11-01T02:00:00Z";
  expect(listRegistration(race, race.groups, now)).toBe("慈善報名待核實 · 一般報名已截止");
});
it("does not hide unknown groups behind an open channel of the same type", () => {
  const race = fixture();
  race.groups[0].channels[0].type = "charity";
  race.groups[0].channels[0].deadline = undefined;
  race.groups[0].channels[0].status = "unknown";
  expect(listRegistration(race, race.groups, now)).toBe("慈善報名部分接受申請，部分待核實");
});
it("limits visible categories and flags further channels", () => {
  const race = fixture();
  race.groups[0].channels.push({ ...race.groups[0].channels[1], id: "hotel", type: "hotel" });
  expect(listRegistration(race, race.groups, now)).toBe(
    "慈善報名接受申請 · 住宿連名額接受申請 · 另 1 類渠道",
  );
});
it("gives lifecycle changes precedence over registration", () => {
  const race = fixture();
  race.status = "cancelled";
  expect(listRegistration(race, race.groups, now)).toBe("賽事取消");
  race.status = "postponed";
  expect(listRegistration(race, race.groups, now)).toBe("賽事延期 · 報名待核實");
  race.status = "completed";
  expect(listRegistration(race, race.groups, now)).toBe("賽事已完成");
});
