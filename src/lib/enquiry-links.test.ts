import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { assertCatalog } from "./catalog";
import { defaultFilters, selectRaces } from "./races";

const main = races.find((r) => r.id === "standard-chartered-hk-marathon-2027")!;
const now = "2026-10-27T01:00:00+08:00";

describe("charity directory is an enquiry resource rather than a registration channel", () => {
  it("retains one source-backed directory while removing all three placeholder channels", () => {
    expect(main.enquiryLinks).toHaveLength(1);
    expect(main.enquiryLinks![0].url).toBe(
      "https://www.hkmarathon.com/about-the-charitable-organisations",
    );
    expect(main.enquiryLinks![0].sourceIds).toContain("schkm-charity-directory");
    expect(races.flatMap((r) => r.groups.flatMap((g) => g.channels))).toHaveLength(41);
    expect(main.groups.every((g) => !g.channels.some((c) => c.id === `${g.id}-charity`))).toBe(
      true,
    );
  });
  it("matches only real unresolved charity channels and keeps named open channels available", () => {
    const unresolved = selectRaces(
      [main],
      { ...defaultFilters, channels: ["charity"], statuses: ["unknown"] },
      now,
    );
    expect(unresolved).toEqual([]);
    const open = selectRaces(
      [main],
      { ...defaultFilters, channels: ["charity"], statuses: ["open"] },
      now,
    );
    expect(open.flatMap((r) => r.groups.flatMap((g) => g.channels.map((c) => c.id)))).toEqual([
      "schkm-2027-half-charity-herfund",
      "schkm-2027-10k-charity-herfund",
    ]);
  });
  it("keeps four genuinely unresolved entries and two separate deadline reminders in the review queue", () => {
    const queue = JSON.parse(
      execFileSync(process.execPath, ["scripts/review-queue.mjs", "--as-of", now], {
        encoding: "utf8",
      }),
    );
    expect(queue.items).toHaveLength(6);
    const missing = queue.items.filter((item: { reasons: string[] }) =>
      item.reasons.some((r) => r !== "7日內報名截止，優先覆核"),
    );
    expect(missing).toHaveLength(4);
    expect(missing.map((item: { channel: string }) => item.channel).sort()).toEqual(
      [
        "慈善報名（個人）",
        "慈善報名（維護家庭基金）",
        "慈善報名（維護家庭基金）",
        "慈善報名（維護家庭基金）",
      ].sort(),
    );
  });
  it("rejects unsafe enquiry links and broken evidence references", () => {
    const data = structuredClone(races);
    const entry = data.find((r) => r.id === main.id)!.enquiryLinks![0];
    entry.url = "javascript:alert(1)";
    expect(() => assertCatalog(data)).toThrow("HTTPS");
    entry.url = main.enquiryLinks![0].url;
    entry.sourceIds = ["missing"];
    expect(() => assertCatalog(data)).toThrow("enquiry source");
  });
});
