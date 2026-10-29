import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { GroupRatings } from "@/components/group-ratings";
import { assertCatalog } from "./catalog";
import { groupEntryLabel, groupRatings } from "./group-ratings";
import { cutoffBand, cutoffCriteria, ratingPolicy } from "./rating-policy";
import { defaultFilters, selectRaces } from "./races";
const bridge = races.find((r) => r.id === "hzmb-half-marathon-2026")!;
const unicef = races.find((r) => r.id === "unicef-powerun-2027")!;
const main = races.find((r) => r.id === "standard-chartered-hk-marathon-2027")!;

describe("transparent per-group comparisons", () => {
  it("separates time, distance and factual transport without numerical ratings", () => {
    expect(groupRatings(bridge, bridge.groups[0]).map((r) => r.value)).toEqual([
      "一般",
      "中",
      "需大會接駁",
    ]);
    expect(groupRatings(bridge, bridge.groups[1]).map((r) => r.value)).toEqual([
      "較寬鬆",
      "中",
      "需大會接駁",
    ]);
    expect(groupRatings(unicef, unicef.groups[0])[2].value).toBe("需特別交通安排");
    expect(groupRatings(unicef, unicef.groups[1])[2].value).toBe("未評");
    expect(groupRatings(main, main.groups[0])[2].value).toBe("未評");
  });
  it.each([
    [5, "低"],
    [5.01, "中"],
    [21.1, "中"],
    [21.11, "高"],
  ])("retains distance-only thresholds at %s km", (km, label) => {
    expect(groupRatings(bridge, { ...bridge.groups[0], distanceKm: Number(km) })[1].value).toBe(
      label,
    );
  });
  it.each([
    [6.99, "緊"],
    [7, "較緊"],
    [8, "一般"],
    [9, "較寬鬆"],
    [10, "寬鬆"],
  ])("uses unrounded time thresholds at %s min/km", (pace, label) => {
    expect(cutoffBand(Number(pace))).toBe(label);
    expect(cutoffCriteria()).toContain(String(label));
  });
  it("does not penalise time generosity for race distance or eligibility", () => {
    const short = structuredClone(bridge.groups[1]);
    short.distanceKm = 5;
    short.ratingEvidence!.cutoffMinutes = 45;
    const long = structuredClone(short);
    long.distanceKm = 21.0975;
    long.ratingEvidence!.cutoffMinutes = 21.0975 * 9;
    expect(groupRatings(bridge, short)[0].value).toBe(groupRatings(bridge, long)[0].value);
    expect(groupRatings(unicef, unicef.groups[1])[0].value).toBe("較寬鬆");
    expect(groupEntryLabel(unicef, unicef.groups[1])).toContain("另有成績");
    expect(groupRatings(unicef, unicef.groups[3])[0].value).toBe("寬鬆");
    expect(groupEntryLabel(unicef, unicef.groups[3])).toBe("只限指定年齡少年");
  });
  it("keeps missing or unverified evidence unknown and does not infer eligibility", () => {
    expect(groupRatings(main, main.groups[1])[0].value).toBe("未評");
    const missing = { ...bridge.groups[0], ratingEvidence: undefined, sourceIds: [] };
    expect(groupRatings(bridge, missing).map((r) => r.value)).toEqual(["未評", "未評", "未評"]);
    expect(groupEntryLabel(bridge, missing)).toContain("未完整核對");
    expect(
      groupRatings({ ...bridge, verification: "pending" }, bridge.groups[0]).every(
        (r) => r.value === "未評",
      ),
    ).toBe(true);
    const transportOnly = structuredClone(bridge.groups[0]);
    delete transportOnly.ratingEvidence!.entry;
    expect(groupEntryLabel(bridge, transportOnly)).toContain("未完整核對");
  });
  it("requires limit evidence from the matching group", () => {
    const race = structuredClone(bridge);
    race.sources![0].fields = ["groups.distanceKm", "transport"];
    expect(groupRatings(race, race.groups[0])[0].value).toBe("未評");
    expect(groupRatings(bridge, { ...bridge.groups[0], sourceIds: [] })[0].value).toBe("未評");
  });
  it("rejects invalid cutoff, missing sources and transport without field evidence", () => {
    const data = structuredClone(races),
      g = data[0].groups[0];
    g.ratingEvidence!.sourceIds = ["missing"];
    expect(() => assertCatalog(data)).toThrow("rating evidence");
    g.ratingEvidence!.sourceIds = ["hzmb-info"];
    g.ratingEvidence!.cutoffMinutes = 0;
    expect(() => assertCatalog(data)).toThrow("rating cutoff");
    g.ratingEvidence!.cutoffMinutes = 180;
    data[0].sources![0].fields = data[0].sources![0].fields.filter((f) => f !== "transport");
    expect(() => assertCatalog(data)).toThrow("transport evidence");
  });
  it("renders matched-group evidence and scope without pretending to assess full difficulty", () => {
    const result = selectRaces(
      [main],
      { ...defaultFilters, distances: ["10K"] },
      "2026-10-30T12:00:00+08:00",
    )[0];
    const html = result.groups
      .map((group) => renderToStaticMarkup(createElement(GroupRatings, { race: main, group })))
      .join("");
    expect(result.groups).toHaveLength(1);
    expect(html).toContain("十公里組別比較");
    expect(html).not.toContain("全馬組別比較");
    for (const label of [
      "時限寬鬆度",
      "距離負荷",
      "集合交通要求",
      "完整難度：未評",
      "來源最後核對",
      ratingPolicy.version,
    ])
      expect(html).toContain(label);
    for (const obsolete of ["新手友善度", "體能挑戰", "交通便利度", " / 5", "總分："])
      expect(html).not.toContain(obsolete);
    expect(html).toContain("不設總分");
    expect(html).toContain(
      main.sources!.find((s) => s.id === "schkm-10k")!.url.replaceAll("&", "&amp;"),
    );
  });
});
