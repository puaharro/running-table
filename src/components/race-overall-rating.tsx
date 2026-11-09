import Link from "next/link";
import { reviewsForGroup, type EditorialReview } from "@/lib/editorial-reviews";
import { ratingDimensions } from "@/lib/rating-policy";
import { raceHref } from "@/lib/site";
import type { Race, RaceGroup } from "@/lib/types";

export function overallScore(review: EditorialReview): string | null {
  const scores = ratingDimensions.map((dimension) => review.assessments[dimension].score);
  if (scores.some((score) => score === null)) return null;
  return (scores.reduce<number>((sum, score) => sum + score!, 0) / scores.length).toFixed(1);
}

export function RaceOverallRating({
  race,
  groups,
  reviews,
}: {
  race: Race;
  groups: RaceGroup[];
  reviews: EditorialReview[];
}) {
  const entries = groups.flatMap((group) => {
    const { current, historical } = reviewsForGroup(race, group, reviews);
    const review = current[0] ?? historical[0];
    return review ? [{ group, review, historical: !current.length }] : [];
  });
  return (
    <div className="calendar-race-overall" aria-label={`${race.name}：編輯總評分`}>
      <span>編輯總評分</span>
      {!entries.length ? (
        <strong>未評分</strong>
      ) : (
        entries.map(({ group, review, historical }) => {
          const score = overallScore(review);
          return (
            <div className="calendar-overall-entry" key={group.id}>
              <Link
                href={`${raceHref(race)}#review-${review.id}`}
                aria-label={`${review.editionYear} 年 · ${group.name}${historical ? " · 往屆" : ""} · 編輯總評分：${score === null ? "未評分" : `${score} / 5`}`}
              >
                {score === null ? (
                  <strong>未評分</strong>
                ) : (
                  <strong>
                    {score}
                    <small> / 5</small>
                  </strong>
                )}
              </Link>
            </div>
          );
        })
      )}
    </div>
  );
}
