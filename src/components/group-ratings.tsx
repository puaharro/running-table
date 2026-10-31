import Link from "next/link";
import { ReviewViews } from "./review-views";
import { editorialReviews } from "@/data/editorial-reviews";
import notices from "@/data/editorial-notices.json";
import { reviewsForGroup, type EditorialReview } from "@/lib/editorial-reviews";
import {
  evidenceLabels,
  ratingDimensions,
  ratingPolicy,
  scoreLabels,
  segmentLabels,
  reviewTargets,
} from "@/lib/rating-policy";
import { formatTimestamp } from "@/lib/races";
import type { Race, RaceGroup } from "@/lib/types";

function DetailedReview({ review }: { review: EditorialReview }) {
  return (
    <article className="editorial-review" aria-label={`${review.editionYear}年體驗評論`}>
      <h5>{review.editionYear} 年 · 編輯體驗評論</h5>
      <p>訪談／參賽觀察 · {segmentLabels[review.runnerSegment]}跑手 · 編輯評分</p>
      <dl className="rating-grid">
        {ratingDimensions.map((key) => {
          const assessment = review.assessments[key];
          return (
            <div key={key}>
              <dt>{ratingPolicy.dimensions[key].title}</dt>
              <dd>
                <strong>
                  {assessment.score === null
                    ? "未評"
                    : `${assessment.score} / 5 · ${scoreLabels[assessment.score]}`}
                </strong>
                <p>{assessment.comment}</p>
                <details>
                  <summary>{ratingPolicy.dimensions[key].title}短評及依據</summary>
                  {!!assessment.positives.length && (
                    <p>值得肯定：{assessment.positives.join("；")}</p>
                  )}
                  {!!assessment.concerns.length && (
                    <p>需要留意：{assessment.concerns.join("；")}</p>
                  )}
                  {assessment.suitedFor && <p>適合對象：{assessment.suitedFor}</p>}
                  {review.evidence
                    .filter((e) => assessment.evidenceIds.includes(e.id))
                    .map((e) => (
                      <p key={e.id}>
                        {evidenceLabels[e.kind]} · {e.editionYear}：{e.description}
                        {e.url && (
                          <>
                            {" "}
                            <a href={e.url} target="_blank" rel="noopener noreferrer">
                              查看材料 ↗
                            </a>
                          </>
                        )}
                      </p>
                    ))}
                </details>
              </dd>
            </div>
          );
        })}
      </dl>
      {review.courseNotes && (
        <p>賽道挑戰特性：{review.courseNotes}（獨立描述，不計入體驗分數。）</p>
      )}
      <details>
        <summary>評審及觀察範圍</summary>
        <p>
          評審：{review.reviewer} · 跑手位置：{segmentLabels[review.runnerSegment]}
        </p>
        <p>參賽／利益關係：{review.disclosure}</p>
        <p>觀察範圍：{review.observationLimits}</p>
      </details>
      <small>
        評論更新：{formatTimestamp(review.reviewedAt)} HKT · 準則：{review.ruleVersion}
      </small>
      <p>
        <small>
          確認：{review.approval.by} · {formatTimestamp(review.approval.at)} HKT · 稿件版本{" "}
          {review.revision}
        </small>
      </p>
      {!!review.organizerResponses?.length && (
        <details>
          <summary>大會回應</summary>
          {review.organizerResponses.map((reply) => (
            <div key={reply.id}>
              <p>
                {reply.organization} · {formatTimestamp(reply.receivedAt)} HKT
              </p>
              <p>{reply.text}</p>
            </div>
          ))}
        </details>
      )}
      {!!review.changes?.length && (
        <details>
          <summary>修改紀錄</summary>
          <ul>
            {review.changes.map((change) => (
              <li key={`${change.revision}-${change.at}`}>
                版本 {change.revision} · {formatTimestamp(change.at)} HKT：{change.summary}
              </li>
            ))}
          </ul>
        </details>
      )}
      <p>
        <Link
          className="text-link"
          href={`/ratings/feedback/?race=${reviewTargets.find((target) => target.id === review.targetId)?.raceId ?? ""}&review=${encodeURIComponent(review.id)}&year=${review.editionYear}&group=${encodeURIComponent(reviewTargets.find((target) => target.id === review.targetId)?.group ?? "")}`}
        >
          提出更正／投訴／大會回應 →
        </Link>
      </p>
    </article>
  );
}
export function EditorialReviewCard({ review }: { review: EditorialReview }) {
  return (
    <article
      id={`review-${review.id}`}
      className="review-quicklook"
      aria-label={`${review.editionYear}年體驗重點`}
    >
      <p className="review-context">
        {review.editionYear} 年 · {reviewTargets.find((t) => t.id === review.targetId)?.group} ·
        編輯點評
      </p>
      <p className="review-summary">
        {review.quickTake?.summary ?? "此篇未有重點摘要，可展開查看完整評論。"}
      </p>
      <dl className="rating-grid quick-scores">
        {ratingDimensions.map((key) => (
          <div key={key}>
            <dt>{ratingPolicy.dimensions[key].title}</dt>
            <dd>
              {review.assessments[key].score === null ? (
                "未評"
              ) : (
                <>
                  <strong>{review.assessments[key].score}</strong>
                  <span> / 5</span>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      {review.quickTake && (
        <ul className="review-reminders" aria-label="兩個實用提醒">
          {review.quickTake.reminders.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      )}
      <details className="review-full">
        <summary>查看詳細評論</summary>
        <DetailedReview review={review} />
      </details>
    </article>
  );
}
export function GroupRatings({ race, group }: { race: Race; group: RaceGroup }) {
  const { current, historical } = reviewsForGroup(race, group, editorialReviews);
  const target = reviewTargets.find((t) => t.raceId === race.id && t.groupId === group.id);
  const groupNotices = notices.filter(
    (n) =>
      n.targetId === target?.id &&
      n.editionYear <= Number(group.date.slice(0, 4)) &&
      !editorialReviews.some((r) => r.id === n.reviewId),
  );
  return (
    <section
      id={`ratings-${group.id}`}
      className="group-ratings"
      aria-label={`${group.name}賽事體驗評級`}
    >
      <h4>
        NXTGO 賽事體驗評級 <small>編輯觀察 · 不設總分</small>
      </h4>
      <ReviewViews>
        {current.length ? (
          current.map((r) => <EditorialReviewCard key={r.id} review={r} />)
        ) : (
          <>
            <p>此屆此組別尚未有已發布體驗評論。</p>
            {!historical.length && (
              <dl className="rating-grid quick-scores">
                {ratingDimensions.map((key) => (
                  <div key={key}>
                    <dt>{ratingPolicy.dimensions[key].title}</dt>
                    <dd>未評</dd>
                  </div>
                ))}
              </dl>
            )}
          </>
        )}
        {!!historical.length && (
          <div className="historical-reviews">
            <h5>往屆參賽體驗 · {historical.map((r) => r.editionYear).join("、")}</h5>
            <p>以下為往屆評論，不代表 {group.date.slice(0, 4)} 年安排或表現；各年份分開評分。</p>
            {historical.map((r) => (
              <EditorialReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}
        <details className="review-full">
          <summary>評分說明及發布紀錄</summary>
          {!!groupNotices.length && (
            <p className="editorial-notice">
              {groupNotices.map((n) => `${n.editionYear} 年：${n.summary}`).join(" ")}{" "}
              <Link href="/ratings/process/#publication-history">查看處理紀錄 →</Link>
            </p>
          )}
          <Link className="text-link" href="/ratings/">
            了解三項評分準則 →
          </Link>
        </details>
      </ReviewViews>
    </section>
  );
}
