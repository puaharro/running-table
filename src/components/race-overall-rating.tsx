import { reviewsForGroup, type EditorialReview } from "@/lib/editorial-reviews";
import { ratingDimensions } from "@/lib/rating-policy";
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
  const entry = entries.find(({ historical }) => !historical) ?? entries[0];
  const score = entry ? overallScore(entry.review) : null;
  const stars = score === null ? null : Math.round(Number(score) * 2) / 2;
  const scope = entry
    ? `${entry.review.editionYear} 年 · ${entry.group.name}${entry.historical ? " · 往屆" : ""}`
    : undefined;
  const starPath = "M10 1.5 12.6 7l6 .8-4.4 4.3 1 6-5.2-2.8-5.2 2.8 1-6L1.4 7.8l6-.8Z";

  return (
    <div className="calendar-race-overall" title={scope}>
      <span className="calendar-rating-label">推薦指數：</span>
      {stars === null ? (
        <span>N/A</span>
      ) : (
        <span
          className="calendar-overall-stars"
          role="img"
          aria-label={`${stars}／5 星 · ${scope}`}
        >
          {Array.from({ length: 5 }, (_, index) => {
            const fill = Math.max(0, Math.min(1, stars - index));
            return (
              <svg key={index} viewBox="0 0 20 20" width="17" height="17" aria-hidden="true">
                <path d={starPath} fill="none" stroke="currentColor" strokeWidth="1.2" />
                {fill > 0 && (
                  <svg width={20 * fill} height="20" overflow="hidden">
                    <path d={starPath} fill="currentColor" />
                  </svg>
                )}
              </svg>
            );
          })}
        </span>
      )}
    </div>
  );
}
