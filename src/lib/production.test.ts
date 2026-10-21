import { describe, expect, it } from "vitest";
import rawCatalog from "../data/catalog.json";
import { assertCatalog, publishedRaces } from "./catalog";
import { defaultFilters, groupStatus, selectRaces } from "./races";
import { releaseIssues } from "./release";
import { raceStructuredData, safeJsonLd } from "./structured-data";
import type { Race } from "./types";
const now = "2026-10-21T13:30:00+08:00";
function catalog() {
  const data: unknown = structuredClone(rawCatalog);
  assertCatalog(data);
  return data;
}
describe("real catalog publication and provenance", () => {
  it("validates deadlines as Hong Kong dates even when stored in UTC", () => {
    const data = catalog();
    const group = data.find((r) => r.id === "schkm-harbourfront-2027")!.groups[0];
    group.registrationClosesAt = "2026-10-25T16:30:00Z";
    expect(() => assertCatalog(data)).not.toThrow();
  });
  it("requires registration-specific field evidence for known statuses", () => {
    const data = catalog();
    data[0].sources![0].fields = ["date", "venue"];
    expect(() => assertCatalog(data)).toThrow("field evidence");
  });
  it("publishes six source-backed real events and no fixtures", () => {
    const data = catalog();
    expect(publishedRaces(data)).toHaveLength(6);
    expect(data.every((r) => r.verification === "verified" && r.sources!.length > 0)).toBe(true);
  });
  it("rejects duplicate IDs and broken source references", () => {
    const data = catalog();
    data[1].id = data[0].id;
    expect(() => assertCatalog(data)).toThrow("duplicate");
    const other = catalog();
    other[0].groups[0].sourceIds = ["missing"];
    expect(() => assertCatalog(other)).toThrow("source");
  });
  it("keeps drafts and demo records out of published results", () => {
    const data = catalog();
    data[0].publication = "draft";
    expect(publishedRaces(data)).toHaveLength(5);
    data[1].verification = "demo";
    expect(publishedRaces(data)).toHaveLength(4);
    expect(() => assertCatalog(data)).toThrow("verified");
  });
  it("rejects unsafe links, invalid timestamps and mismatched deadlines", () => {
    const data = catalog();
    data[0].groups[0].registrationUrl = "javascript:alert(1)";
    expect(() => assertCatalog(data)).toThrow("HTTPS");
    const other = catalog();
    other[0].verifiedAt = "2026-10-21";
    expect(() => assertCatalog(other)).toThrow("timestamp");
    const wrong = catalog();
    wrong[0].groups[0].deadline = "2026-07-03";
    expect(() => assertCatalog(wrong)).toThrow("disagree");
  });
  it("rejects negative fees and a registration window in reverse", () => {
    const data = catalog();
    data[0].groups[0].price = -1;
    expect(() => assertCatalog(data)).toThrow("price");
    const other = catalog();
    other[0].groups[0].registrationOpensAt = "2027-01-01T00:00:00+08:00";
    expect(() => assertCatalog(other)).toThrow("reversed");
  });
});
describe("exact deadlines, freshness and truthful channel statuses", () => {
  it("closes the 5K ballot exactly at noon HK time", () => {
    const r = catalog().find((r) => r.id === "schkm-harbourfront-2027")!;
    const g = { ...r.groups[0], registrationVerifiedAt: "2026-10-26T11:00:00+08:00" };
    expect(groupStatus(r, g, "2026-10-26T11:59:59+08:00")).toBe("open");
    expect(groupStatus(r, g, "2026-10-26T04:00:00Z")).toBe("closed");
  });
  it("turns stale status into unknown after 72 hours without inventing capacity", () => {
    const r = catalog().find((r) => r.id === "schkm-youth-2027")!;
    expect(groupStatus(r, r.groups[0], "2026-10-24T13:22:07+08:00")).toBe("open");
    expect(groupStatus(r, r.groups[0], "2026-10-24T13:22:08+08:00")).toBe("unknown");
  });
  it("preserves deadline closure even when its source is older", () => {
    const r = catalog()[0];
    expect(groupStatus(r, r.groups[0], now)).toBe("closed");
  });
  it("keeps unknown registration fees and status unknown", () => {
    const r = catalog().find((r) => r.id === "unicef-powerun-2027")!;
    expect(r.groups.every((g) => g.price === null && groupStatus(r, g, now) === "unknown")).toBe(
      true,
    );
  });
  it("honours an official sold-out notice rather than a directory tag", () => {
    const r = catalog().find((r) => r.id === "mizuno-hk-run-fest-2026")!;
    expect(r.groups.every((g) => groupStatus(r, g, now) === "full")).toBe(true);
  });
  it("matches the region and distance on the same group", () => {
    const r = catalog().find((r) => r.id === "standard-chartered-hk-marathon-2027")!;
    expect(
      selectRaces([r], { ...defaultFilters, regions: ["九龍"], distances: ["10K"] }, now),
    ).toHaveLength(0);
    expect(
      selectRaces([r], { ...defaultFilters, regions: ["九龍"], distances: ["全馬"] }, now),
    ).toHaveLength(1);
  });
});
describe("search release readiness and structured data", () => {
  it("allows private staging but gates public indexing on real site details", () => {
    expect(releaseIssues({ indexable: false })).toEqual([]);
    expect(releaseIssues({ indexable: true })).toHaveLength(3);
    expect(
      releaseIssues({
        indexable: true,
        origin: "https://rundates.test",
        contactEmail: "team@rundates.test",
        operatorName: "Test operator",
      }),
    ).toEqual([]);
    expect(
      releaseIssues({
        indexable: true,
        origin: "https://rundates.test/sub/",
        contactEmail: "invalid",
        operatorName: "",
      }),
    ).toHaveLength(3);
  });
  it("emits facts without guessed times, prices or availability", () => {
    const r = catalog()[0];
    const schema = raceStructuredData(r, "https://rundates.test")!;
    expect(schema.startDate).toBe("2026-11-15");
    expect(schema).not.toHaveProperty("offers");
    expect(raceStructuredData({ ...r, verification: "demo" }, "https://rundates.test")).toBeNull();
    expect(raceStructuredData(r)).toBeNull();
  });
  it("escapes script delimiters in JSON-LD", () => {
    expect(safeJsonLd({ title: "</script>" })).not.toContain("<");
    expect(JSON.parse(safeJsonLd({ title: "</script>" }))).toEqual({ title: "</script>" });
  });
});
