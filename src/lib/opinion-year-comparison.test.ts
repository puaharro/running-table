import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { OpinionYearComparison, comparisonComments } from "@/components/opinion-year-comparison";
import { runnerOpinions, runnerOpinionsForGroup } from "@/data/runner-opinions";
import { races } from "@/data/races";

it("separates missing editions from empty topics, preserving quotes and provenance", () => {
  const record = runnerOpinions[0];
  const rows = comparisonComments([record, record], 2025, "水站");
  expect(rows.hasEdition).toBe(true);
  expect(rows.entries).toHaveLength(2);
  expect(comparisonComments([record], 2025, "寄存")).toEqual({ hasEdition: true, entries: [] });
  expect(comparisonComments([record], 2026, "水站")).toEqual({ hasEdition: false, entries: [] });
  const html = renderToStaticMarkup(
    createElement(OpinionYearComparison, {
      records: [record],
      currentYear: 2026,
      groupName: "半馬",
    }),
  );
  for (const { source } of rows.entries) {
    expect(html).toContain(source.quote);
    expect(html).toContain(source.url.replaceAll("&", "&amp;"));
    expect(html).toContain(source.author);
  }
  expect(html).toContain("2025 年");
  expect(html).toContain("2026 年");
  expect(html).toContain("此年份／組別暫未收錄留言，無法比較。");
  expect(html).toContain("此主題未有相關原文");
  expect(html).toContain("不影響編輯總評分");
  expect(html).not.toContain(" / 5");
});

it("compares two editions independently without mixing marathon, half or unknown groups", () => {
  const race = races.find((race) => race.id === "standard-chartered-hk-marathon-2027")!;
  for (const group of race.groups) {
    const records = runnerOpinionsForGroup(race, group);
    expect(records.every((record) => record.groupId === group.id)).toBe(true);
    expect(records.some((record) => record.groupLabel === "組別未明")).toBe(false);
  }
  const old = runnerOpinions[0];
  // Display-only fixture, never published as real newer-year observations.
  const newer = {
    ...old,
    editionYear: 2026,
    topics: [{ title: "補給", summary: "Test", sources: [] }],
  };
  expect(comparisonComments([old, newer], 2025, "水站").entries).toHaveLength(2);
  expect(comparisonComments([old, newer], 2026, "水站")).toEqual({ hasEdition: true, entries: [] });
});
