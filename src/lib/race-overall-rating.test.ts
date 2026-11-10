import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { overallScore, RaceOverallRating } from "@/components/race-overall-rating";
import { editorialReviews } from "@/data/editorial-reviews";
import { races } from "@/data/races";
import { ReviewOverallScore } from "@/components/review-overall-score";
import { EditorialReviewCard } from "@/components/group-ratings";
import { ratingDimensions, reviewTargets } from "./rating-policy";
import { reviewCoverage, ReviewCoverage } from "@/components/review-coverage";

it("counts interviewees only when explicitly recorded and keeps comments scoped separately", () => {
  const bridge = editorialReviews.find((review) => review.targetId === "hzmb-half")!;
  expect(reviewCoverage(bridge)).toEqual({ interviewed: 1, comments: 20 });
  const otherYear = { ...bridge, editionYear: 2099 };
  expect(reviewCoverage(otherYear).comments).toBe(0);
  const unspecified = { ...bridge, observationLimits: "人數未明，多份材料。" };
  expect(reviewCoverage(unspecified).interviewed).toBeNull();
  const html = renderToStaticMarkup(createElement(ReviewCoverage, { review: bridge }));
  expect(html).toContain("評分人數：未記錄");
  expect(html).toContain("前段有紀錄");
  expect(html).toContain("中段未記錄");
  expect(html).toContain("後段未記錄");
  expect(html).toContain(`dateTime="${bridge.reviewedAt}"`);
  expect(html).toContain("不計入編輯總分或評分人數");
});

it("shows the same total on the review while preserving scores, comments and evidence", () => {
  const review = structuredClone(editorialReviews[0]);
  const html = renderToStaticMarkup(createElement(EditorialReviewCard, { review }));
  expect(html).toContain(`${overallScore(review)} / 5`);
  expect(html).toContain(`${review.editionYear} 年`);
  expect(html).toContain(reviewTargets.find((target) => target.id === review.targetId)!.group);
  for (const dimension of ratingDimensions) {
    expect(html).toContain(review.assessments[dimension].comment);
  }
  expect(html).toContain(review.evidence[0].description);
  review.assessments.course.score = null;
  const incomplete = renderToStaticMarkup(createElement(ReviewOverallScore, { review }));
  expect(incomplete).toContain("<strong>未評分</strong>");
  expect(incomplete).not.toContain(" / 5");
  expect(renderToStaticMarkup(createElement(ReviewOverallScore))).toContain("未評分");
});

it("averages all three equally to one decimal and requires every score", () => {
  const review = structuredClone(editorialReviews[0]);
  [
    review.assessments.course.score,
    review.assessments.organization.score,
    review.assessments.aid.score,
  ] = [3, 4, 4];
  expect(overallScore(review)).toBe("3.7");
  review.assessments.course.score = 4;
  expect(overallScore(review)).toBe("4.0");
  for (const dimension of ratingDimensions) {
    const incomplete = structuredClone(review);
    incomplete.assessments[dimension].score = null;
    expect(overallScore(incomplete)).toBeNull();
  }
});

it("keeps historical scores labelled and never applies them to another group or future review", () => {
  const review = structuredClone(editorialReviews[0]);
  const target = reviewTargets.find((item) => item.id === review.targetId)!;
  const race = races.find((item) => item.id === target.raceId)!;
  const group = race.groups.find((item) => item.id === target.groupId)!;
  const render = (groups = [group], reviews = [review]) =>
    renderToStaticMarkup(createElement(RaceOverallRating, { race, groups, reviews }));
  expect(render()).toContain(`${review.editionYear} 年 · ${group.name} · 往屆`);
  expect(render()).not.toContain("評論更新");
  expect(render()).not.toContain("計分說明");
  expect(render()).not.toContain("受訪跑手數");
  expect(render()).not.toContain("href=");
  [
    review.assessments.course.score,
    review.assessments.organization.score,
    review.assessments.aid.score,
  ] = [3, 4, 4];
  expect(render()).toContain("3.5／5 星");
  expect(render()).toContain('<svg width="10" height="20"');
  expect(render([{ ...group, id: "unreviewed-group" }])).toContain("N/A");
  const future = { ...review, editionYear: Number(group.date.slice(0, 4)) + 1 };
  expect(render([group], [future])).toContain("N/A");
  const current = {
    ...review,
    id: "display-only-current",
    editionYear: Number(group.date.slice(0, 4)),
    assessments: { ...review.assessments, aid: { ...review.assessments.aid, score: null } },
  };
  const html = render([group], [review, current]);
  expect(html).toContain("N/A");
  expect(html).not.toContain("往屆");
});
