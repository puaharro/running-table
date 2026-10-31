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
    expect(() => assertEditorialReviews(editorialReviews, now)).not.toThrow();
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
    expect(editorialReviews).toEqual([]);
    const r = review();
    r.approval.confirmed.wording = false as true;
    expect(() => assertEditorialReviews([r], now)).toThrow("human confirmation");
    const html = renderToStaticMarkup(createElement(RatingsPage));
    expect(html).toContain("待確認");
    expect(html).not.toContain("3 / 5");
    expect(html).not.toContain("斜度未如受訪者原先想像般大");
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
