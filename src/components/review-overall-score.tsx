import { language, localPath } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { overallScore } from "./race-overall-rating";
import type { EditorialReview } from "@/lib/editorial-reviews";
import { reviewTargets } from "@/lib/rating-policy";
import { ReviewCoverage } from "./review-coverage";

export function ReviewOverallScore({
  review,
  compact = false,
  english = false,
}: {
  review?: EditorialReview;
  compact?: boolean;
  english?: boolean;
}) {
  const t = language(english);
  const score = review ? overallScore(review) : null;
  const group = reviewTargets.find((target) => target.id === review?.targetId)?.group;
  return (
    <div className="review-overall-score">
      <span>{t("編輯總評分", "Overall editorial rating")}</span>{" "}
      <strong>{score === null ? t("未評分", "Unrated") : `${score} / 5`}</strong>
      {!compact && review && (
        <small>
          {review.editionYear}
          {t(" 年 · ", " · ")}
          {englishRaceTerm(group, english)}
        </small>
      )}
      {!compact && review && <ReviewCoverage review={review} english={english} />}
      {!compact && (
        <small>
          {t(
            "計分說明：賽道體驗、大會執行、補給體驗各佔三分之一（1/3）。 三項等權平均，滿分 5 分，顯示一位小數；缺任何一項就顯示「未評分」。",
            "The overall score is the average of course experience, event organisation and aid stations, shown to one decimal place out of 5. It remains unrated if any dimension lacks a score.",
          )}
        </small>
      )}
    </div>
  );
}
