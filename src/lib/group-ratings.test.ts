import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { races } from "@/data/races";
import { editorialReviews } from "@/data/editorial-reviews";
import { GroupRatings, EditorialReviewCard } from "@/components/group-ratings";
import RatingsPage from "@/app/ratings/page";
import { assertEditorialReviews, reviewsForGroup, type EditorialReview } from "./editorial-reviews";
import { ratingDimensions, ratingPolicy, reviewTargets } from "./rating-policy";
import { defaultFilters, selectRaces } from "./races";

const bridge = races.find((r) => r.id === "hzmb-half-marathon-2026")!;
const main = races.find((r) => r.id === "standard-chartered-hk-marathon-2027")!;
const now = "2026-10-30T12:00:00+08:00";
// Test-only observations, never imported by application code or published as real feedback.
function review(): EditorialReview {
  return {
    id: "test-only-2025",
    status: "published",
    revision: 1,
    approval: {
      by: "Test human",
      at: now,
      reference: "test-only-approval",
      revision: 1,
      contentHash: "0".repeat(64),
      confirmed: { scores: true, wording: true, evidence: true, scope: true },
    },
    targetId: "hzmb-half",
    editionYear: 2025,
    eventDate: "2025-01-01",
    reviewer: "Test reviewer",
    reviewedAt: now,
    ruleVersion: ratingPolicy.version,
    runnerSegment: "middle",
    disclosure: "Test self-funded observation",
    observationLimits: "Test scope: one runner only",
    courseNotes: "Test independent challenge notes",
    evidence: [
      {
        id: "firsthand",
        kind: "participation",
        description: "Test-only participation notes",
        editionYear: 2025,
      },
    ],
    assessments: Object.fromEntries(
      ratingDimensions.map((key) => [
        key,
        {
          score: 3,
          comment: `Test ${key} summary`,
          positives: ["Test concrete observation"],
          concerns: [],
          suitedFor: "Test audience",
          evidenceIds: ["firsthand"],
        },
      ]),
    ) as unknown as EditorialReview["assessments"],
  };
}
describe("original editorial experience reviews", () => {
  it("does not manufacture reviews from race facts or the user's participation history", () => {
    expect(() => assertEditorialReviews(editorialReviews)).not.toThrow();
    for (const race of races)
      for (const group of race.groups) {
        const html = renderToStaticMarkup(createElement(GroupRatings, { race, group }));
        expect(html).toContain("賽道體驗");
        expect(html).toContain("大會執行");
        expect(html).toContain("補給體驗");
        expect(reviewsForGroup(race, group, editorialReviews).current).toHaveLength(0);
        for (const old of ["時限寬鬆度", "距離負荷", "集合交通要求"])
          expect(html).not.toContain(old);
        expect(html).toContain("/ratings");
      }
  });
  it("validates published reviews and allows an explicitly unrated dimension", () => {
    const r = review();
    expect(() => assertEditorialReviews([r], now)).not.toThrow();
    r.assessments.aid = {
      score: null,
      comment: "No aid observation",
      positives: [],
      concerns: [],
      suitedFor: "",
      evidenceIds: [],
    };
    expect(() => assertEditorialReviews([r], now)).not.toThrow();
    const html = renderToStaticMarkup(createElement(EditorialReviewCard, { review: r }));
    expect(html).toContain("未評");
    expect(html).not.toContain("0 / 5");
    expect(html).not.toContain("總分：");
    expect(html).toContain("評審：");
    expect(html).toContain("觀察範圍：");
    expect(html).toContain("參賽／利益關係");
  });
  it.each([0, 6, 2.5, NaN])("rejects invalid score %s", (score) => {
    const r = review();
    r.assessments.course.score = score as 3;
    expect(() => assertEditorialReviews([r], now)).toThrow("score needs");
  });
  it("requires experiential evidence and concrete observations for a score", () => {
    const r = review();
    r.evidence[0].kind = "official-plan";
    expect(() => assertEditorialReviews([r], now)).toThrow("participation or interview");
    r.evidence[0].kind = "course-analysis";
    expect(() => assertEditorialReviews([r], now)).toThrow("participation or interview");
    r.evidence[0].kind = "interview";
    r.assessments.aid.evidenceIds = ["missing"];
    expect(() => assertEditorialReviews([r], now)).toThrow("missing evidence link");
    r.assessments.aid.evidenceIds = ["firsthand"];
    r.assessments.course.positives = [];
    expect(() => assertEditorialReviews([r], now)).toThrow("concrete observations");
  });
  it("rejects drafts, future records, stale criteria and wrong-edition evidence", () => {
    const r = review();
    (r as { status: string }).status = "draft";
    expect(() => assertEditorialReviews([r], now)).toThrow("drafts");
    r.status = "published";
    r.evidence[0].editionYear = 2024;
    expect(() => assertEditorialReviews([r], now)).toThrow("wrong-edition");
    r.evidence[0].editionYear = 2025;
    r.reviewedAt = "2027-01-01T00:00:00Z";
    expect(() => assertEditorialReviews([r], now)).toThrow("future");
    r.reviewedAt = now;
    r.eventDate = "2025-02-30";
    expect(() => assertEditorialReviews([r], now)).toThrow("edition/date");
    r.eventDate = "2025-01-01";
    r.ruleVersion = "old";
    expect(() => assertEditorialReviews([r], now)).toThrow("rule version");
  });
  it("does not infer perfect aid for later runners from a front/middle observation", () => {
    const r = review();
    r.assessments.aid.score = 5;
    expect(() => assertEditorialReviews([r], now)).toThrow("back-of-field");
    r.evidence[0].runnerSegment = "back";
    expect(() => assertEditorialReviews([r], now)).not.toThrow();
  });
  it("rejects duplicates and unsafe material links", () => {
    const r = review();
    expect(() => assertEditorialReviews([r, r], now)).toThrow("duplicate id");
    expect(() => assertEditorialReviews([r, { ...r, id: "another" }], now)).toThrow(
      "duplicate edition",
    );
    r.evidence[0].url = "javascript:alert(1)";
    expect(() => assertEditorialReviews([r], now)).toThrow("evidence");
  });
  it("requires confirmation metadata and keeps pending source material out of public data", () => {
    expect(
      editorialReviews.every((r) => r.status === "published" && r.approval.confirmed.wording),
    ).toBe(true);
    const r = review();
    r.approval.confirmed.wording = false as true;
    expect(() => assertEditorialReviews([r], now)).toThrow("human confirmation");
    const html = renderToStaticMarkup(createElement(RatingsPage));
    expect(html).not.toContain("原有編輯試評已暫停展示");
    expect(html).toContain("安檢及接駁流程順暢");
  });
  it("keeps 2025 history separate from 2026 and never applies it to 10K", () => {
    const r = review();
    const selected = reviewsForGroup(bridge, bridge.groups[0], [r]);
    expect(selected.current).toEqual([]);
    expect(selected.historical).toEqual([r]);
    expect(reviewsForGroup(bridge, bridge.groups[1], [r])).toEqual({ current: [], historical: [] });
    expect(reviewsForGroup(main, main.groups[0], [r])).toEqual({ current: [], historical: [] });
    const nextEdition = { ...r, editionYear: 2026 };
    expect(reviewsForGroup(bridge, bridge.groups[0], [nextEdition]).current).toEqual([nextEdition]);
    expect(
      reviewsForGroup(bridge, bridge.groups[0], [{ ...r, editionYear: 2027 }]).historical,
    ).toEqual([]);
  });
  it("keeps marathon and 10K matched groups separate after filtering", () => {
    const record = { ...review(), targetId: "schkm-marathon" };
    expect(reviewsForGroup(main, main.groups[0], [record]).historical).toHaveLength(1);
    const result = selectRaces([main], { ...defaultFilters, distances: ["10K"] }, now)[0];
    expect(result.groups).toHaveLength(1);
    expect(reviewsForGroup(main, result.groups[0], [record]).historical).toEqual([]);
    const html = renderToStaticMarkup(
      createElement(GroupRatings, { race: main, group: result.groups[0] }),
    );
    expect(html).toContain("十公里賽事體驗評級");
    expect(html).not.toContain("全馬賽事體驗評級");
  });
  it("generates public anchors from the same editable rubric", () => {
    const html = renderToStaticMarkup(createElement(RatingsPage));
    for (const key of ratingDimensions) {
      expect(ratingPolicy.dimensions[key].anchors).toHaveLength(5);
      for (const anchor of ratingPolicy.dimensions[key].anchors) expect(html).toContain(anchor);
    }
    expect(html).toContain(ratingPolicy.version);
    expect(html).toContain("往屆體驗不代表下一屆");
    for (const target of reviewTargets)
      expect(
        races.find((r) => r.id === target.raceId)?.groups.some((g) => g.id === target.groupId),
      ).toBe(true);
  });
});

describe("ten-second review view", () => {
  it("keeps scores and approved highlights outside the closed full review", () => {
    const r = review();
    r.quickTake = {
      summary: "Test-only concise verdict",
      reminders: ["Test reminder one", "Test reminder two"],
    };
    const html = renderToStaticMarkup(createElement(EditorialReviewCard, { review: r }));
    const boundary = html.indexOf('<details class="review-full">');
    expect(boundary).toBeGreaterThan(0);
    expect(html.slice(0, boundary)).toContain(r.quickTake.summary);
    expect(html.slice(0, boundary)).toContain("Test reminder two");
    expect(html.slice(0, boundary)).not.toContain(r.observationLimits);
    expect(html).not.toContain('<details class="review-full" open');
    expect(html.slice(boundary)).toContain(r.observationLimits);
  });
  it("rejects lengthy summaries and missing reminders", () => {
    const r = review();
    r.quickTake = { summary: "x".repeat(101), reminders: ["One", "Two"] };
    expect(() => assertEditorialReviews([r], now)).toThrow("quick take");
    r.quickTake.summary = "Short";
    r.quickTake.reminders = ["One"] as unknown as [string, string];
    expect(() => assertEditorialReviews([r], now)).toThrow("quick take");
  });
  it("defaults to editor content and keeps reader reviews separate and honest", () => {
    const html = renderToStaticMarkup(createElement(RatingsPage));
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("編輯點評");
    expect(html).toContain("跑手心得");
    expect(html).toContain("暫未開放公開投稿");
    expect(html).toContain('hidden=""');
    expect(html).not.toContain('class="rating-method-details" open');
  });
});

describe("approved HZMB 2025 publication", () => {
  it("publishes the confirmed revision with highlights, evidence and front-runner scope", () => {
    const r = editorialReviews.find((r) => r.id === "hzmb-half-2025-participant-notes")!;
    expect(r.revision).toBe(2);
    expect(r.approval.contentHash).toBe(
      "15b6091369a9e4618f22e5902f42bd6ea5090f1c9414c593441dcc014eaeb4f7",
    );
    expect(ratingDimensions.map((key) => r.assessments[key].score)).toEqual([3, 4, 3]);
    expect(r.quickTake?.reminders).toHaveLength(2);
    expect(r.runnerSegment).toBe("front");
    expect(r.observationLimits).toContain("不代表全體跑手");
    const html = renderToStaticMarkup(createElement(RatingsPage));
    expect(html).toContain(r.quickTake!.summary);
    for (const note of r.quickTake!.reminders) expect(html).toContain(note);
    expect(html).toContain(r.observationLimits);
    expect(html).toContain("2025 年");
    expect(html).not.toContain("原有編輯試評已暫停展示");
  });
  it("shows the approved review only as 2025 history, never as 2026 or 10K scores", () => {
    const selected = reviewsForGroup(bridge, bridge.groups[0], editorialReviews);
    expect(selected.current).toEqual([]);
    expect(selected.historical.map((r) => r.editionYear)).toEqual([2025]);
    const html = renderToStaticMarkup(
      createElement(GroupRatings, { race: bridge, group: bridge.groups[0] }),
    );
    expect(html).toContain("以下為往屆評論，不代表 2026 年安排或表現");
    expect(html).not.toContain('<details class="historical-reviews" open');
    const tenK = reviewsForGroup(bridge, bridge.groups[1], editorialReviews);
    expect(tenK).toEqual({ current: [], historical: [] });
    expect(
      reviewsForGroup(main, main.groups[0], editorialReviews).historical.every(
        (r) => r.targetId !== "hzmb-half",
      ),
    ).toBe(true);
  });
});

describe("approved SCHKM 2026 publication", () => {
  it("renders the confirmed 4/4/4 review with two reminders, disclosure and limits", () => {
    const r = editorialReviews.find((r) => r.id === "schkm-marathon-2026-participant-notes")!;
    expect(r.revision).toBe(1);
    expect(r.approval.contentHash).toBe(
      "396663f1c878747dc3cd813afa77f8c2f17705830d915d23995e08b654f4dfcd",
    );
    expect(ratingDimensions.map((key) => r.assessments[key].score)).toEqual([4, 4, 4]);
    expect(r.quickTake?.reminders).toHaveLength(2);
    expect(r.runnerSegment).toBe("front");
    expect(r.disclosure).toContain("自費報名");
    expect(r.observationLimits).toContain("Sub-3");
    expect(r.observationLimits).toContain("沒有取用大會食物");
    expect(r.assessments.aid.comment).toContain("沒有中後段供應紀錄");
    const html = renderToStaticMarkup(createElement(EditorialReviewCard, { review: r }));
    expect(html).toContain(r.quickTake!.summary);
    expect(html).toContain(r.observationLimits);
    expect(html).toContain(r.disclosure);
    expect(html).toContain("2026 年");
    expect(html).not.toContain('<details class="review-full" open');
  });
  it("keeps 2026 full-marathon history separate from 2027, other distances and HZMB", () => {
    const selected = reviewsForGroup(main, main.groups[0], editorialReviews);
    expect(selected.current).toEqual([]);
    expect(selected.historical.map((r) => r.editionYear)).toEqual([2026]);
    expect(selected.historical.every((r) => r.targetId === "schkm-marathon")).toBe(true);
    for (const group of main.groups.slice(1))
      expect(reviewsForGroup(main, group, editorialReviews)).toEqual({
        current: [],
        historical: [],
      });
    expect(
      reviewsForGroup(bridge, bridge.groups[0], editorialReviews).historical.every(
        (r) => r.targetId !== "schkm-marathon",
      ),
    ).toBe(true);
    const html = renderToStaticMarkup(
      createElement(GroupRatings, { race: main, group: main.groups[0] }),
    );
    expect(html).toContain("以下為往屆評論，不代表 2027 年安排或表現");
    expect(html).not.toContain('<details class="historical-reviews" open');
  });
});
