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

export function ReviewCoverage({ review }: { review: EditorialReview }) {
  const { interviewed, comments } = reviewCoverage(review);
  return (
    <div className="review-coverage">
      <small>
        評論更新：<time dateTime={review.reviewedAt}>{formatTimestamp(review.reviewedAt)} HKT</time>
      </small>
      <small>
        本年份／組別：編輯評論 1 篇 · 本篇受訪跑手數：
        {interviewed === null ? "未記錄" : `${interviewed} 位`}
      </small>
      <small>評分人數：未記錄（編輯署名未提供獨立人數；受訪跑手不等於評分者）</small>
      <small>
        本篇觀察範圍：前段{review.runnerSegment === "front" ? "有紀錄" : "未記錄"} · 中段
        {review.runnerSegment === "middle" ? "有紀錄" : "未記錄"} · 後段
        {review.runnerSegment === "back" ? "有紀錄" : "未記錄"}
        {review.runnerSegment === "unknown" ? "（位置未明）" : ""}
      </small>
      <small>
        已收錄外站留言：{comments}{" "}
        則（同年份／組別，按來源連結、作者及原文去重；不計入編輯總分或評分人數）
      </small>
      <details>
        <summary>資料量及觀察限制</summary>
        <p>{review.observationLimits}</p>
        <p>
          受訪人數只在原有觀察範圍明確記錄人數時列出，不按材料篇數推算；未記錄不代表沒有相關觀察。留言數只涵蓋本站已發布來源，並非全網留言總數或獨立跑手人數。
        </p>
      </details>
    </div>
  );
}
