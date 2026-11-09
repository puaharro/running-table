import { overallScore } from "./race-overall-rating";
import type { EditorialReview } from "@/lib/editorial-reviews";
import { reviewTargets } from "@/lib/rating-policy";
import { ReviewCoverage } from "./review-coverage";

export function ReviewOverallScore({
  review,
  compact = false,
}: {
  review?: EditorialReview;
  compact?: boolean;
}) {
  const score = review ? overallScore(review) : null;
  const group = reviewTargets.find((target) => target.id === review?.targetId)?.group;
  return (
    <div className="review-overall-score">
      <span>編輯總評分</span> <strong>{score === null ? "未評分" : `${score} / 5`}</strong>
      {!compact && review && (
        <small>
          {review.editionYear} 年 · {group}
        </small>
      )}
      {!compact && review && <ReviewCoverage review={review} />}
      {!compact && (
        <small>
          計分說明：賽道體驗、大會執行、補給體驗各佔三分之一（1/3）。 三項等權平均，滿分 5
          分，顯示一位小數；缺任何一項就顯示「未評分」。
        </small>
      )}
    </div>
  );
}
