import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { registrationUncertaintyReason } from "./verification";
import { correctionUrl } from "./corrections";

const race = races.find((race) => race.id === "schkm-harbourfront-2027")!;
const group = {
  ...race.groups[0].channels[0],
  registrationVerifiedAt: "2026-10-21T13:22:07+08:00",
};
const checked = group.registrationVerifiedAt!;

describe("explanations for unconfirmed registration", () => {
  it("distinguishes missing verification from a recently checked but unknown status", () => {
    expect(
      registrationUncertaintyReason(
        race,
        race.groups[0],
        { ...group, status: "unknown", registrationVerifiedAt: undefined },
        checked,
      ),
    ).toContain("尚未完成");
    const reason = registrationUncertaintyReason(
      race,
      race.groups[0],
      { ...group, status: "unknown" },
      checked,
    );
    expect(reason).toContain("尚未能確認");
    expect(reason).not.toContain("未公布");
  });
  it("switches to stale only after 72 hours and identifies invalid or future timestamps", () => {
    const cutoff = new Date(Date.parse(checked) + 72 * 3600000);
    expect(registrationUncertaintyReason(race, race.groups[0], group, cutoff)).toBeNull();
    expect(
      registrationUncertaintyReason(race, race.groups[0], group, new Date(cutoff.getTime() + 1)),
    ).toContain("超過 72 小時");
    for (const timestamp of ["invalid", "2026-10-25T12:00:00+08:00"]) {
      expect(
        registrationUncertaintyReason(
          race,
          race.groups[0],
          { ...group, status: "unknown", registrationVerifiedAt: timestamp },
          checked,
        ),
      ).toContain("核對時間有待確認");
    }
  });
  it("explains arrival of an opening time and postponement without overriding closed status", () => {
    const upcoming = {
      ...group,
      status: "upcoming" as const,
      registrationStart: undefined,
      registrationOpensAt: "2026-10-25T10:00:00+08:00",
      registrationVerifiedAt: "2026-10-25T09:00:00+08:00",
    };
    expect(
      registrationUncertaintyReason(race, race.groups[0], upcoming, "2026-10-25T09:59:59+08:00"),
    ).toBeNull();
    expect(
      registrationUncertaintyReason(race, race.groups[0], upcoming, "2026-10-25T10:00:00+08:00"),
    ).toContain("已到預告開放時間");
    expect(
      registrationUncertaintyReason(
        { ...race, status: "postponed" },
        race.groups[0],
        group,
        checked,
      ),
    ).toContain("延期");
    expect(
      registrationUncertaintyReason(race, race.groups[0], group, "2026-10-26T12:00:00+08:00"),
    ).toBeNull();
  });
});

describe("reviewable correction destinations", () => {
  const input = {
    raceName: "測試賽事 & 10K",
    racePath: "/races/2027/test/",
    details: "截止時間由 10:00 改為 12:00\n需核對 & 更新",
    sourceUrl: "https://example.com/notice?a=1&b=2",
  };
  it("prefills a public GitHub issue with the selected race and evidence", () => {
    const url = new URL(correctionUrl(input));
    expect(url.origin + url.pathname).toBe("https://github.com/puaharro/running-table/issues/new");
    expect(url.searchParams.get("title")).toBe(`資料更正：${input.raceName}`);
    expect(url.searchParams.get("body")).toContain(input.details);
    expect(url.searchParams.get("body")).toContain(input.racePath);
    expect(url.searchParams.get("body")).toContain(input.sourceUrl);
  });
  it("uses the configured contact email and preserves newlines and literal query characters", () => {
    const url = new URL(correctionUrl({ ...input, contactEmail: "editor@example.com" }));
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe("editor@example.com");
    expect(url.searchParams.get("subject")).toBe(`資料更正：${input.raceName}`);
    expect(url.searchParams.get("body")).toContain(input.details);
  });
  it("rejects non-HTTPS or credential-bearing evidence links", () => {
    for (const sourceUrl of [
      "javascript:alert(1)",
      "http://example.com",
      "https://user:pass@example.com",
      "invalid",
    ]) {
      expect(() => correctionUrl({ ...input, sourceUrl })).toThrow();
    }
  });
});
