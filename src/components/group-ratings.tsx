import Link from "next/link";
import { editorialReviews } from "@/data/editorial-reviews";
import { reviewsForGroup, type EditorialReview } from "@/lib/editorial-reviews";
import {
  evidenceLabels,
  ratingDimensions,
  ratingPolicy,
  scoreLabels,
  segmentLabels,
} from "@/lib/rating-policy";
import { formatTimestamp } from "@/lib/races";
import type { Race, RaceGroup } from "@/lib/types";

export function EditorialReviewCard({ review }: { review: EditorialReview }) {
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
    </article>
  );
}
export function GroupRatings({ race, group }: { race: Race; group: RaceGroup }) {
  const { current, historical } = reviewsForGroup(race, group, editorialReviews);
  return (
    <section className="group-ratings" aria-label={`${group.name}賽事體驗評級`}>
      <h4>
        NXTGO 賽事體驗評級 <small>編輯觀察 · 不設總分</small>
      </h4>
      {current.length ? (
        current.map((r) => <EditorialReviewCard key={r.id} review={r} />)
      ) : (
        <>
          <p>此屆此組別尚未有已發布體驗評論。</p>
          {!historical.length && (
            <dl className="rating-grid">
              {ratingDimensions.map((key) => (
                <div key={key}>
                  <dt>{ratingPolicy.dimensions[key].title}</dt>
                  <dd>未評</dd>
                </div>
              ))}
            </dl>
          )}
          <p>待整理親身參賽或跑手訪問紀錄，再按同一準則評分。</p>
        </>
      )}
      {!!historical.length && (
        <details className="historical-reviews" open>
          <summary>查看往屆體驗 · {historical.map((r) => r.editionYear).join("、")}</summary>
          <p>以下為往屆評論，不代表 {group.date.slice(0, 4)} 年安排或表現；各年份分開評分。</p>
          {historical.map((r) => (
            <EditorialReviewCard key={r.id} review={r} />
          ))}
        </details>
      )}
      <Link className="text-link" href="/ratings/">
        了解三項評分準則 →
      </Link>
    </section>
  );
}
