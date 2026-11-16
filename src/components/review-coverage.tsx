import { englishTimestamp, language } from "@/lib/english-races";
import type { EditorialReview } from "@/lib/editorial-reviews";
import { formatTimestamp } from "@/lib/races";
import { runnerOpinions } from "@/data/runner-opinions";

export function reviewCoverage(review: EditorialReview) {
  // Count only an explicit single-person observation, never evidence documents or posts.
  const interviewed =
    review.observationLimits.startsWith("一位") &&
    review.evidence.some((e) => e.kind === "interview")
      ? 1
      : null;
  const comments = new Set(
    runnerOpinions
      .filter(
        (record) =>
          record.targetId === review.targetId && record.editionYear === review.editionYear,
      )
      .flatMap((record) =>
        record.topics.flatMap((topic) =>
          topic.sources.map((source) => JSON.stringify([source.url, source.author, source.quote])),
        ),
      ),
  );
  return { interviewed, comments: comments.size };
}

export function ReviewCoverage({
  review,
  english = false,
}: {
  review: EditorialReview;
  english?: boolean;
}) {
  const t = language(english);
  const { interviewed, comments } = reviewCoverage(review);
  const evidenceRecorded = (recorded: boolean) =>
    recorded ? t("有紀錄", "recorded") : t("未記錄", "unrecorded");
  return (
    <div className="review-coverage">
      <small>
        {t("評論更新：", "Review updated: ")}
        <time dateTime={review.reviewedAt}>
          {english
            ? englishTimestamp(review.reviewedAt)
            : `${formatTimestamp(review.reviewedAt)} HKT`}
        </time>
      </small>
      <small>
        {t(
          "本年份／組別：編輯評論 1 篇 · 本篇受訪跑手數：",
          "This edition and category: 1 editorial review · Runners interviewed: ",
        )}
        {interviewed === null
          ? t("未記錄", "unrecorded")
          : t(`${interviewed} 位`, String(interviewed))}
      </small>
      <small>
        {t(
          "評分人數：未記錄（編輯署名未提供獨立人數；受訪跑手不等於評分者）",
          "The editorial byline gives no separate reviewer count. Interviewees are not counted as reviewers.",
        )}
      </small>
      <small>
        {t("本篇觀察範圍：前段", "Observations by field position: front ")}
        {evidenceRecorded(review.runnerSegment === "front")}
        {t(" · 中段", " · midfield ")}
        {evidenceRecorded(review.runnerSegment === "middle")}
        {t(" · 後段", " · back ")}
        {evidenceRecorded(review.runnerSegment === "back")}
        {review.runnerSegment === "unknown" && t("（位置未明）", " (position unknown)")}
      </small>
      <small>
        {t(
          `已收錄外站留言：${comments} 則（同年份／組別，按來源連結、作者及原文去重；不計入編輯總分或評分人數）`,
          `External comments for this edition and category: ${comments}. Duplicates by source, author and wording are removed. These comments do not count towards scores or reviewer totals.`,
        )}
      </small>
      <details>
        <summary>{t("資料量及觀察限制", "Evidence counts and observation limits")}</summary>
        <p lang={english ? "zh-HK" : undefined}>{review.observationLimits}</p>
        <p>
          {t(
            "受訪人數只在原有觀察範圍明確記錄人數時列出，不按材料篇數推算；未記錄不代表沒有相關觀察。留言數只涵蓋本站已發布來源，並非全網留言總數或獨立跑手人數。",
            "We report interviewee counts only when the original observations specify them. Missing counts do not rule out observations. Comment counts cover only sources published here and do not represent all online comments or unique runners.",
          )}
        </p>
      </details>
    </div>
  );
}
