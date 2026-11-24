import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { editorialReviews } from "@/data/editorial-reviews";
import { EditorialReviewCard } from "@/components/group-ratings";
import { ratingDimensions, reviewTargets } from "./rating-policy";

it("preserves comments and evidence without showing scores", () => {
  const review = structuredClone(editorialReviews[0]);
  const html = renderToStaticMarkup(createElement(EditorialReviewCard, { review }));
  expect(html).not.toContain(" / 5");
  expect(html).toContain(`${review.editionYear} 年`);
  expect(html).toContain(reviewTargets.find((target) => target.id === review.targetId)!.group);
  for (const dimension of ratingDimensions) {
    expect(html).toContain(review.assessments[dimension].comment);
  }
  expect(html).toContain(review.evidence[0].description);
});
