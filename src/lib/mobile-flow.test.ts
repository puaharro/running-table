import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { RegistrationSummary } from "@/components/live-registration";
import { defaultFilters, parseFilters } from "./races";
import { resultsHref, safeResultsHref } from "./results-location";

const race = races.find((r) => r.id === "standard-chartered-hk-marathon-2027")!;
describe("mobile list and registration journey", () => {
  it("returns to the selected race with the same combined filters and sort order", () => {
    const filters = {
      ...defaultFilters,
      q: "主賽事",
      channels: ["charity" as const],
      statuses: ["open" as const],
      distances: ["半馬"],
      sort: "deadline" as const,
    };
    const href = resultsHref(filters, race.id);
    const url = new URL(safeResultsHref(href), "https://test.invalid");
    expect(parseFilters(url.searchParams)).toEqual(filters);
    expect(url.hash).toBe(`#race-${race.id}`);
  });
  it("keeps stored return destinations on the local list and provides a safe direct-entry fallback", () => {
    for (const unsafe of [
      null,
      "https://evil.invalid/",
      "//evil.invalid/",
      "/races/elsewhere/",
      "/\\evil.invalid/",
    ]) {
      expect(safeResultsHref(unsafe)).toBe("/#race-list");
    }
    expect(safeResultsHref("/?channel=charity#unexpected")).toBe("/?channel=charity#race-list");
    expect(resultsHref(defaultFilters)).toBe("/#race-list");
  });
  it("makes each multi-channel distance collapsible while showing price, deadline and qualification together", () => {
    const html = renderToStaticMarkup(
      createElement(RegistrationSummary, { race, initialNow: "2026-10-27T01:00:00+08:00" }),
    );
    expect(html.match(/class="summary-distance"/g) ?? []).toHaveLength(3);
    expect(html).not.toContain('class="summary-distance" open=""');
    expect(html).toContain("最低籌款額");
    expect(html).toContain("套票價格");
    expect(html).toContain("HK$ 2,500");
    expect(html).toContain("申請截止 · 香港時間");
    expect(html).toContain("查看完整條件及官方資料");
    expect(html).toContain("待核實");
    expect(html).toContain("2–3人");
    expect(html).toContain("HK$100");
    expect(html.indexOf("channel-schkm-2027-half-charity-herfund")).toBeLessThan(
      html.indexOf("channel-schkm-2027-half-general"),
    );
  });
});
