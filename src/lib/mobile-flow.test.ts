import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { RegistrationSummary, RegistrationGroups } from "@/components/live-registration";
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
    expect(url.pathname).toBe("/races/");
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
      expect(safeResultsHref(unsafe)).toBe("/races/#race-list");
    }
    expect(safeResultsHref("/?channel=charity#unexpected")).toBe(
      "/races/?channel=charity#race-list",
    );
    expect(resultsHref(defaultFilters)).toBe("/races/#race-list");
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

describe("collapsed detail channels", () => {
  it("keeps every channel closed with status, price and deadline in its summary", () => {
    const html = renderToStaticMarkup(
      createElement(RegistrationGroups, { race, initialNow: "2026-10-27T01:00:00+08:00" }),
    );
    const disclosures = [
      ...html.matchAll(/<details class="channel-details"([^>]*)>([\s\S]*?)<\/details>/g),
    ];
    expect(disclosures).toHaveLength(race.groups.reduce((n, g) => n + g.channels.length, 0));
    for (const [, attrs, content] of disclosures) {
      expect(attrs).not.toContain("open");
      const summary = content.slice(0, content.indexOf("</summary>"));
      expect(summary).toContain("status-badge");
      expect(summary).toContain("channel-toggle-facts");
      expect(summary).toMatch(/截止：(?:<time dateTime="[^"]+">|待核實)/);
      expect(summary).not.toContain("申請資格／條件");
      expect(summary).not.toContain("申請截止");
      expect(content).toContain("申請資格／條件");
      expect(content).toContain("此渠道最後核對");
      expect(content).toContain("此渠道核實依據");
    }
    expect(html).toContain("最低籌款額：HK$ 4,000");
    expect(html).toContain("套票價格：HK$ 2,942");
    expect(html).toContain("每位／一晚");
    expect(html).toContain('截止：<time dateTime="2026-09-20T19:00:00+08:00">');
  });
  it("preserves free and unverified prices without treating missing costs as zero", () => {
    for (const [price, label] of [
      [0, "免費"],
      [null, "待核實"],
    ] as const) {
      const clone = structuredClone(race);
      clone.groups = clone.groups.slice(0, 1);
      clone.groups[0].channels = clone.groups[0].channels.slice(0, 1);
      clone.groups[0].channels[0].price = price;
      const html = renderToStaticMarkup(
        createElement(RegistrationGroups, { race: clone, initialNow: "2026-10-27T01:00:00+08:00" }),
      );
      const summary = html
        .slice(html.indexOf('<summary class="channel-toggle">'))
        .split("</summary>")[0];
      expect(summary).toContain(label);
    }
  });
});

describe("consolidated race overview", () => {
  it("keeps date, distance, status and two local actions together", async () => {
    const { RaceOverview } = await import("@/components/live-registration");
    const html = renderToStaticMarkup(
      createElement(RaceOverview, {
        race,
        initialNow: "2026-10-27T01:00:00+08:00",
        experienceHref: "#ratings-schkm-2027-marathon",
        experienceLabel: "參賽體驗",
      }),
    );
    for (const text of [
      "比賽日期",
      "參賽組別",
      "報名概況",
      "接受申請不代表獲得名額",
      "#registration-groups",
      "#ratings-schkm-2027-marathon",
    ])
      expect(html).toContain(text);
    expect(html).toContain("2027");
    expect(html).toContain("全馬 / 半馬 / 10K");
  });
});
