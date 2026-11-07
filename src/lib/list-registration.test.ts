import { expect, it } from "vitest";
import { races } from "@/data/races";
import { listDeadline, listRegistration } from "./list-registration";
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

it("selects only the nearest verified future application deadline, scoped to filtered channels", () => {
  const race = fixture();
  const [general, charity] = race.groups[0].channels;
  general.name = "一般報名";
  charity.name = "慈善報名";
  general.deadline = "2026-11-20";
  general.status = "unknown";
  charity.deadline = "2026-12-01";
  expect(listDeadline(race, race.groups, now)).toMatchObject({
    date: "2026-11-20",
    label: "11月20日截止（時刻待核實）",
    scope: `一般報名 · ${race.groups[0].name}`,
  });
  expect(listDeadline(race, [{ ...race.groups[0], channels: [charity] }], now)?.date).toBe(
    "2026-12-01",
  );
});
it("does not offer unsourced, conflicting, invalid or expired deadlines, or substitute results/payment dates", () => {
  const race = fixture();
  const channel = race.groups[0].channels[1];
  race.groups[0].channels = [channel];
  channel.sourceIds = [];
  expect(listDeadline(race, race.groups, now)).toBeNull();
  channel.sourceIds = ["official"];
  channel.registrationClosesAt = "2026-11-30T23:59:00+08:00";
  expect(listDeadline(race, race.groups, now)).toBeNull();
  channel.registrationClosesAt = "invalid";
  expect(listDeadline(race, race.groups, now)).toBeNull();
  channel.registrationClosesAt = undefined;
  channel.deadline = "2026-11-06";
  expect(listDeadline(race, race.groups, now)).toBeNull();
  channel.deadline = undefined;
  channel.resultAnnouncedAt = "2026-11-20T10:00:00+08:00";
  channel.paymentClosesAt = "2026-11-21T10:00:00+08:00";
  expect(listDeadline(race, race.groups, now)).toBeNull();
});
it("renders exact Hong Kong times, removes them at cutoff and retains date-only deadlines through that day", () => {
  const race = fixture();
  const channel = race.groups[0].channels[1];
  race.groups[0].channels = [channel];
  channel.status = "unknown";
  channel.deadline = "2026-11-07";
  channel.registrationClosesAt = "2026-11-07T11:30:00+08:00";
  expect(listDeadline(race, race.groups, now)?.label).toBe("11月7日 11:30 截止（香港時間）");
  expect(listDeadline(race, race.groups, "2026-11-07T03:30:00Z")).toBeNull();
  channel.registrationClosesAt = undefined;
  expect(listDeadline(race, race.groups, "2026-11-07T15:59:00Z")?.label).toBe(
    "11月7日截止（時刻待核實）",
  );
  expect(listDeadline(race, race.groups, "2026-11-07T16:00:00Z")).toBeNull();
});
it("groups identical channel deadlines without implying they apply to every group", () => {
  const race = fixture();
  const group = race.groups[0];
  group.channels = [group.channels[1]];
  race.groups.push({
    ...group,
    id: "second",
    channels: [{ ...group.channels[0], id: "second-channel" }],
  });
  race.groups.push({
    ...group,
    id: "third",
    channels: [{ ...group.channels[0], id: "third-channel", deadline: "2026-12-02" }],
  });
  expect(listDeadline(race, race.groups, now)?.scope).toBe(`${group.channels[0].name} · 2 個組別`);
});
it("omits deadlines for known closed/full channels and lifecycle changes", () => {
  const race = fixture();
  race.groups[0].channels[1].status = "full";
  expect(listDeadline(race, race.groups, now)).toBeNull();
  race.groups[0].channels[1].status = "closed";
  expect(listDeadline(race, race.groups, now)).toBeNull();
  race.groups[0].channels[1].status = "unknown";
  for (const status of ["cancelled", "postponed", "completed"] as const) {
    race.status = status;
    expect(listDeadline(race, race.groups, now)).toBeNull();
  }
});
