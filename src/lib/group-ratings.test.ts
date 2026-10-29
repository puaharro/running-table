import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { GroupRatings } from "@/components/group-ratings";
import { assertCatalog } from "./catalog";
import { groupRatings } from "./group-ratings";
import { defaultFilters, selectRaces } from "./races";
const bridge = races.find((r) => r.id === "hzmb-half-marathon-2026")!;
const unicef = races.find((r) => r.id === "unicef-powerun-2027")!;
const main = races.find((r) => r.id === "standard-chartered-hk-marathon-2027")!;

describe("source-backed group ratings", () => {
  it("rates each distance separately and never borrows another group's transport", () => {
    expect(groupRatings(bridge, bridge.groups[0]).map((r) => r.value)).toEqual([
      "3 / 5",
      "中",
      "3 / 5",
    ]);
    expect(groupRatings(bridge, bridge.groups[1]).map((r) => r.value)).toEqual([
      "4 / 5",
      "中",
      "3 / 5",
    ]);
    expect(groupRatings(unicef, unicef.groups[0])[2].value).toBe("1 / 5");
    expect(groupRatings(unicef, unicef.groups[1])[2].value).toBe("未評");
    expect(groupRatings(main, main.groups[0])[2].value).toBe("未評");
  });
  it.each([
    [5, "低"],
    [5.01, "中"],
    [21.1, "中"],
    [21.11, "高"],
  ])("uses published distance thresholds at %s km", (km, expected) => {
    const g = { ...bridge.groups[0], distanceKm: Number(km) };
    expect(groupRatings(bridge, g)[1].value).toBe(expected);
  });
  it("keeps youth, mixed categories and unverified data unrated rather than zero or a short-distance high score", () => {
    expect(groupRatings(unicef, unicef.groups[3])[0].value).toBe("未評");
    expect(groupRatings(main, main.groups[1])[0].value).toBe("未評");
    const missing = { ...bridge.groups[0], ratingEvidence: undefined, sourceIds: [] };
    expect(groupRatings(bridge, missing).map((r) => r.value)).toEqual(["未評", "未評", "未評"]);
    expect(
      groupRatings({ ...bridge, verification: "pending" }, bridge.groups[0]).every(
        (r) => r.value === "未評",
      ),
    ).toBe(true);
  });
  it("requires actual limit evidence and caps restricted eligibility independently of a generous cutoff", () => {
    expect(groupRatings(unicef, unicef.groups[1])[0].value).toBe("2 / 5");
    const race = structuredClone(bridge);
    race.sources![0].fields = ["groups.distanceKm", "transport"];
    expect(groupRatings(race, race.groups[0])[0].value).toBe("未評");
    const group = { ...bridge.groups[0], distanceKm: 42.195 };
    expect(groupRatings(bridge, group)[0].value).toBe("1 / 5");
  });
  it("rejects missing sources, invalid cutoff values and transport without field evidence", () => {
    const data = structuredClone(races);
    const g = data[0].groups[0];
    g.ratingEvidence!.sourceIds = ["missing"];
    expect(() => assertCatalog(data)).toThrow("rating evidence");
    g.ratingEvidence!.sourceIds = ["hzmb-info"];
    g.ratingEvidence!.cutoffMinutes = 0;
    expect(() => assertCatalog(data)).toThrow("rating cutoff");
    g.ratingEvidence!.cutoffMinutes = 180;
    data[0].sources![0].fields = data[0].sources![0].fields.filter((f) => f !== "transport");
    expect(() => assertCatalog(data)).toThrow("transport evidence");
  });
  it("renders matched groups only with reasons, dated source links and no aggregate score", () => {
    const result = selectRaces(
      [main],
      { ...defaultFilters, distances: ["10K"] },
      "2026-10-29T12:00:00+08:00",
    )[0];
    const html = result.groups
      .map((group) => renderToStaticMarkup(createElement(GroupRatings, { race: main, group })))
      .join("");
    expect(result.groups).toHaveLength(1);
    expect(html).toContain("十公里組別評級");
    expect(html).not.toContain("全馬組別評級");
    expect(html).toContain("新手友善度");
    expect(html).toContain("體能挑戰");
    expect(html).toContain("交通便利度");
    expect(html).toContain("未評");
    expect(html).toContain("來源最後核對");
    expect(html).toContain("不設總分");
    expect(html).not.toContain("總分：");
    expect(html).toContain(
      main.sources!.find((s) => s.id === "schkm-10k")!.url.replaceAll("&", "&amp;"),
    );
  });
});
