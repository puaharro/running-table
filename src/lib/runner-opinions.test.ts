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
    expect(runnerPanel).toContain("與編輯評論分開，不新增分數");
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
    expect(highlights).toContain("第一槍跑手覺得水站夠用");
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

it("keeps the mobile overview to three short topics with the full take and reminders disclosed on demand", () => {
  for (const item of runnerOpinions) {
    const html = renderToStaticMarkup(
      createElement(RunnerOpinionSummary, { record: item, currentYear: 2027 }),
    );
    const overview = html.slice(0, html.indexOf('<details class="runner-opinion-sources">'));
    expect(overview).toContain('aria-label="主題留言數"');
    for (const topic of ["交通", "寄存", "水站", "賽道", "賽事組織"])
      expect(overview).toContain(`${topic}（`);
    expect(overview).not.toContain("原帖 ↗");
    expect(overview).not.toContain("選擇主題查看原文及來源");
    expect(html).toContain("按主題查看留言原文及來源</summary>");
    expect(item.topics.map((topic) => topic.title)).toEqual(["賽道", "大會安排", "補給"]);
    expect(item.topics.every((topic) => topic.summary.length <= 32)).toBe(true);
    expect(overview).not.toContain("一句總結");
    expect(overview).not.toContain("兩個提醒");
    expect(item.intro).toBeUndefined();
    expect(item.reminders).toBeUndefined();
  }
  const full = runnerOpinions.find((item) => item.targetId === "schkm-marathon")!;
  expect(full.fullText).toContain("全馬留言肯定港島尾段打氣");
  expect(full.fullText).toContain("全馬橋隧段按能力部署配速，個人能量補充先有計劃。");
  expect(record.fullText).toContain("賽前查清當屆交通流程及水站位置，預先安排個人能量補充。");
  expect(record.topics.map((t) => t.summary).join("")).toContain("第一槍跑手");
});

it("keeps comparison and manual notes inside a closed disclosure after the overview", () => {
  const html = renderToStaticMarkup(createElement(GroupRatings, { race: bridge, group: half }));
  const start = html.indexOf(
    '<details class="runner-opinion-sources"><summary>跨年份主題比較及人工備註</summary>',
  );
  expect(start).toBeGreaterThan(html.indexOf('class="runner-opinions"'));
  expect(html.slice(start)).toContain('class="opinion-year-comparison"');
  expect(html.slice(start)).toContain("留言差異");
  expect(html.slice(start)).toContain("待核實事項");
  expect(html.slice(start)).toContain("修改歷史");
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
  const sources = unknown.topics.flatMap((topic) => topic.sources);
  expect(sources.filter((s) => s.postedOn === null)).toHaveLength(3);
  expect(sources.find((s) => s.author === "peitea")!.postedOn).toBe("2025-02-20");
  const html = renderToStaticMarkup(
    createElement(RunnerOpinionSummary, { record: unknown, currentYear: 2027 }),
  );
  expect(html).toContain("未顯示（非賽事日期）");
  expect(html).toContain("組別未明");
  expect(html).not.toContain("/ 5");
});

it("keeps names in the source disclosure, with approved anonymous prose and no scores", () => {
  for (const item of runnerOpinions) {
    const html = renderToStaticMarkup(
      createElement(RunnerOpinionSummary, { record: item, currentYear: 2027 }),
    );
    const body = html.slice(0, html.indexOf('<details class="runner-opinion-sources">'));
    const prose = [
      item.intro,
      item.fullText,
      item.scope,
      ...item.topics.map((t) => t.summary),
    ].join(" ");
    for (const name of [
      "Rocky",
      "Rickie Kwong",
      "蜘蛛人校長",
      "miracle3",
      "_9walker_",
      "peitea",
      "Lawrence Hui",
      "DVS",
    ]) {
      expect(body).not.toContain(name);
      expect(prose).not.toContain(name);
    }
    expect(item).not.toHaveProperty("score");
    expect(html).not.toContain("/ 5");
    expect(html).not.toContain(".editorial-private");
    expect(html).not.toContain("pfbid02pz");
    expect(html).toContain(`閱讀完整整理稿 · ${item.publicationVersion}`);
    expect(html).not.toMatch(/<details[^>]+open/);
  }
});

it("retains all 20 HZMB references and the half-marathon confirmation without inferring dates", () => {
  const sources = record.topics.flatMap((t) => t.sources);
  expect(new Set(sources.map((s) => s.url)).size).toBe(20);
  expect(new Set(sources.map((s) => s.reference))).toEqual(
    new Set(Array.from({ length: 20 }, (_, i) => `H${String(i + 1).padStart(2, "0")}`)),
  );
  expect(sources.every((s) => s.postedOn === null)).toBe(true);
  const half = runnerOpinions.find((r) => r.groupLabel === "半馬")!;
  const html = renderToStaticMarkup(
    createElement(RunnerOpinionSummary, { record: half, currentYear: 2027 }),
  );
  expect(html).toContain('href="https://www.threads.com/@_9walker_/post/DF2lFqQy-0j"');
  expect(half.topics.map((t) => t.title)).toEqual(["賽道", "大會安排", "補給"]);
  expect(half.fullText).not.toContain("西隧");
  expect(half.fullText).not.toContain("受傷跑手");
});
