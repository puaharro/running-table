import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { runnerOpinions, runnerOpinionsForGroup } from "@/data/runner-opinions";
import { GroupRatings } from "@/components/group-ratings";
import { RunnerOpinionSummary } from "@/components/runner-opinions";

const bridge = races.find((race) => race.id === "hzmb-half-marathon-2026")!;
const half = bridge.groups[0];
const record = runnerOpinions[0];

describe("approved external runner opinions", () => {
  it("only attaches the 2025 half-marathon material to the intended half-marathon group", () => {
    for (const race of races) {
      for (const group of race.groups) {
        const selected = runnerOpinionsForGroup(race, group);
        if (race.id === bridge.id) expect(selected).toEqual(group.id === half.id ? [record] : []);
        else if (race.id !== "standard-chartered-hk-marathon-2027") expect(selected).toEqual([]);
      }
    }
    expect(runnerOpinionsForGroup(bridge, { ...half, date: "2024-01-01" })).toEqual([]);
    expect(runnerOpinionsForGroup(bridge, { ...half, date: "2025-01-05" })).toEqual([record]);
  });

  it("keeps an unscored external panel separate from the default editorial panel", () => {
    const html = renderToStaticMarkup(createElement(GroupRatings, { race: bridge, group: half }));
    const runnerPanel = html.slice(html.indexOf('aria-label="2025年外站跑手意見"'));
    expect(html).toMatch(/role="tabpanel"[^>]+hidden=""[^>]*><article class="runner-opinions"/);
    expect(html).toContain("編輯點評");
    expect(html).toContain("跑手心得");
    expect(runnerPanel).not.toContain("rating-grid");
    expect(runnerPanel).not.toContain("/ 5");
    expect(runnerPanel).not.toContain("編輯評分</");
    expect(runnerPanel).toContain("不合併編輯評分");
    expect(html).not.toContain("未有已發布跑手心得");
  });

  it("shows concise balanced topics and preserves the batch and year limits", () => {
    const html = renderToStaticMarkup(
      createElement(RunnerOpinionSummary, { record, currentYear: 2026 }),
    );
    const highlights = html.slice(0, html.indexOf("<details"));
    for (const title of ["賽道", "大會安排", "補給"]) expect(highlights).toContain(title);
    expect(highlights).toContain("建議擴闊頭 3 公里");
    expect(highlights).toContain("較前屆改善");
    expect(highlights).toContain("時間安排");
    expect(highlights).toContain("希望加站");
    expect(highlights).toContain("第一槍跑手覺得水站足夠");
    expect(highlights).toContain("不代表 2026 年安排或表現");
    expect(html).toContain("不代表其他批次或後段供應");
    expect(html).toContain("出帖日期未顯示");
    expect(html).not.toContain('<details class="runner-opinion-sources" open');
    expect(html).toContain("原文節錄");
    expect(html).toContain("不等於曾經斷水");
    expect(html).not.toContain(".editorial-private");
  });

  it("preserves attributed original-source links and does not import external scores", () => {
    for (const topic of record.topics) {
      for (const source of topic.sources) {
        const url = new URL(source.url);
        expect(url.protocol).toBe("https:");
        expect(url.hostname).toBe("www.marathonsworld.com");
        expect(url.pathname).toBe("/artapp/rating_detail.php");
        expect(url.searchParams.get("rid")).toMatch(/^\d+$/);
        expect(source.author.length).toBeGreaterThan(0);
        expect(source.quote.length).toBeGreaterThan(0);
        expect(source).not.toHaveProperty("score");
      }
    }
    const sources = record.topics.flatMap((topic) => topic.sources);
    expect(sources.find((s) => s.author === "Rocky")!.url).toContain("rid=630878");
    expect(sources.find((s) => s.author === "Lawrence Hui")!.quote).toBe("希望多加一個補給站");
    expect(sources.find((s) => s.author === "mcfai")!.quote).toBe("Time arrangement is bad");
  });

  it("keeps the honest empty state on unrelated groups", () => {
    const html = renderToStaticMarkup(
      createElement(GroupRatings, { race: bridge, group: bridge.groups[1] }),
    );
    expect(html).toContain("未有已發布跑手心得");
    expect(html).not.toContain("Marathon’s World");
    expect(html).not.toContain("希望多加一個補給站");
  });
});

it("keeps approved SCHKM 2025 opinions on their explicit groups, unscoped sources outside every group", () => {
  const race = races.find((r) => r.id === "standard-chartered-hk-marathon-2027")!;
  for (const group of race.groups) {
    const selected = runnerOpinionsForGroup(race, group);
    expect(selected.length).toBe(group.id === "schkm-2027-10k" ? 0 : 1);
    const html = renderToStaticMarkup(
      createElement(RunnerOpinionSummary, { record: selected[0] ?? record, currentYear: 2027 }),
    );
    if (group.id === "schkm-2027-marathon") {
      expect(html).toContain("年全馬");
      expect(html).not.toContain("_9walker_");
    }
    if (group.id === "schkm-2027-half") {
      expect(html).toContain("年半馬");
      expect(html).toContain("_9walker_");
      expect(html).not.toContain("Lawrence Hui");
    }
    expect(selected.some((r) => r.groupLabel === "組別未明")).toBe(false);
  }
  const unknown = runnerOpinions.find((r) => r.targetId === "schkm-unscoped-opinions")!;
  expect(unknown.topics[0].sources.filter((s) => s.postedOn === null)).toHaveLength(3);
  expect(unknown.topics[0].sources.find((s) => s.author === "peitea")!.postedOn).toBe("2025-02-20");
  const html = renderToStaticMarkup(
    createElement(RunnerOpinionSummary, { record: unknown, currentYear: 2027 }),
  );
  expect(html).toContain("未顯示（非賽事日期）");
  expect(html).toContain("組別未明");
  expect(html).not.toContain("/ 5");
});
