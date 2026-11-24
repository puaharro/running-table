import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PublishedReviewCards, EditionReviewCoverage } from "@/components/ratings-catalog";
import { editorialReviews } from "@/data/editorial-reviews";
import { races } from "@/data/races";
import { reviewTargets } from "./rating-policy";
import { raceHref } from "./site";

it("keeps the original summaries tied to the reviewed year and group", () => {
  const html = renderToStaticMarkup(
    createElement(PublishedReviewCards, { races, reviews: editorialReviews }),
  );
  for (const review of editorialReviews) {
    const target = reviewTargets.find((item) => item.id === review.targetId)!;
    const race = races.find((item) => item.id === target.raceId)!;
    expect(html).toContain(`${review.editionYear} 年 · ${target.group}`);
    expect(html).toContain(`往屆評論 · 不代表 ${race.date.slice(0, 4)} 年安排或表現`);
    expect(html).toContain(`${raceHref(race).replace(/\/$/, "")}#review-${review.id}`);
    const summary = renderToStaticMarkup(
      createElement("p", { className: "ratings-review-summary" }, review.quickTake!.summary),
    );
    expect(html).toContain(summary);
    const card = html.split(`aria-labelledby="index-${review.id}"`)[1].split("</article>")[0];
    const overview = card.slice(0, card.indexOf("<details"));
    expect(overview).not.toContain("編輯總評分");
    expect(overview).toContain(review.quickTake!.summary);
    expect(overview).not.toContain("評論更新");
    expect(overview).not.toContain("受訪跑手數");
    expect(overview).not.toContain("計分說明：");
    expect(card).toContain("評論背景及資料範圍</summary>");
    expect(card).not.toMatch(/<details[^>]* open/);
    expect(card).not.toContain(" / 5");
  }
  expect(html.indexOf("index-schkm-marathon-2026")).toBeLessThan(
    html.indexOf("index-hzmb-half-2025"),
  );
});

it("hides scores and never labels a different edition as the current edition", () => {
  // Display-only fixture: does not create an approval or alter published records.
  const review = structuredClone(editorialReviews[0]);
  review.assessments.aid.score = null;
  const catalog = structuredClone(races);
  const target = reviewTargets.find((item) => item.id === review.targetId)!;
  catalog
    .find((race) => race.id === target.raceId)!
    .groups.find((group) => group.id === target.groupId)!.date = "2024-01-01";
  const html = renderToStaticMarkup(
    createElement(PublishedReviewCards, { races: catalog, reviews: [review] }),
  );
  expect(html).not.toContain("ratings-score-grid");
  expect(html).not.toContain("<strong>0</strong>");
  expect(html).toContain("其他年份評論");
  expect(html).not.toContain(">當屆評論<");
});

it("keeps current-edition coverage separate across years and groups", () => {
  const props = { races, reviews: editorialReviews };
  const html = renderToStaticMarkup(createElement(EditionReviewCoverage, props));
  expect(html).not.toContain("有當屆評論");
  expect(html.match(/有往屆評論/g)).toHaveLength(2);
  for (const race of races)
    for (const group of race.groups) {
      expect(html).toContain(`${raceHref(race).replace(/\/$/, "")}#ratings-${group.id}`);
    }
  const catalog = structuredClone(races);
  const target = reviewTargets.find((item) => item.id === editorialReviews[0].targetId)!;
  catalog
    .find((race) => race.id === target.raceId)!
    .groups.find((group) => group.id === target.groupId)!.date =
    `${editorialReviews[0].editionYear}-01-01`;
  const matching = renderToStaticMarkup(
    createElement(EditionReviewCoverage, { ...props, races: catalog }),
  );
  expect(matching.match(/有當屆評論/g)).toHaveLength(1);
  expect(matching.match(/有往屆評論/g)).toHaveLength(1);
});
