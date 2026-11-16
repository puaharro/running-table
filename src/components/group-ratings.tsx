import { language, localPath } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import Link from "next/link";
import { ReviewOverallScore } from "./review-overall-score";
import { OpinionYearComparison } from "./opinion-year-comparison";
import { ReviewViews } from "./review-views";
import { RunnerOpinionSummary } from "./runner-opinions";
import { runnerOpinionsForGroup } from "@/data/runner-opinions";
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

function DetailedReview({
  review,
  english = false,
}: {
  review: EditorialReview;
  english?: boolean;
}) {
  const t = language(english);
  return (
    <article
      lang={english ? "zh-HK" : undefined}
      className="editorial-review"
      aria-label={`${review.editionYear}年體驗評論`}
    >
      <h5>
        {review.editionYear} 年 ·{" "}
        {reviewTargets.find((target) => target.id === review.targetId)?.group} · 編輯體驗評論
      </h5>
      <p>訪談／參賽觀察 · {segmentLabels[review.runnerSegment]}跑手 · 編輯評分</p>
      <p>
        {review.runnerSegment === "unknown"
          ? "一位跑手觀察（位置未記錄）"
          : `一位${segmentLabels[review.runnerSegment]}跑手觀察`}
      </p>
      <dl className="rating-grid">
        {ratingDimensions.map((key) => {
          const assessment = review.assessments[key];
          return (
            <div key={key}>
              <dt>{ratingPolicy.dimensions[key].title}</dt>
              <dd>
                <strong>
                  {assessment.score === null
                    ? t("未評", "Unrated")
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
                        <a href={`#review-${review.id}-evidence-${e.id}`}>
                          {evidenceLabels[e.kind]} · {e.editionYear}：查看原文依據
                        </a>
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
        <summary>{t("評審及觀察範圍", "Reviewer and scope of observation")}</summary>
        <p>
          {t("評審：", "Reviewer: ")}
          {review.reviewer} · 跑手位置：{segmentLabels[review.runnerSegment]}
        </p>
        <p>
          {t("參賽／利益關係：", "Participation and conflicts of interest: ")}
          {review.disclosure}
        </p>
        <p>
          {t("觀察範圍：", "Observation scope: ")}
          {review.observationLimits}
        </p>
      </details>
      <small>
        {t("評論更新：", "Review updated: ")}
        {formatTimestamp(review.reviewedAt)} HKT · 準則：{review.ruleVersion}
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
          href={localPath(
            `/ratings/feedback/?race=${reviewTargets.find((target) => target.id === review.targetId)?.raceId ?? ""}&review=${encodeURIComponent(review.id)}&year=${review.editionYear}&group=${encodeURIComponent(reviewTargets.find((target) => target.id === review.targetId)?.group ?? "")}`,
            english,
          )}
        >
          {t("提出更正／投訴／大會回應", "Submit a correction, complaint or organiser response")}
        </Link>
      </p>
    </article>
  );
}
export function EditorialReviewCard({
  review,
  english = false,
}: {
  review: EditorialReview;
  english?: boolean;
}) {
  const t = language(english);
  return (
    <article
      id={`review-${review.id}`}
      className="review-quicklook"
      aria-label={t(
        `${review.editionYear}年體驗重點`,
        `${review.editionYear} race experience summary`,
      )}
    >
      <p className="review-context">
        {review.editionYear}
        {t(" 年 · ", " · ")}
        {englishRaceTerm(
          reviewTargets.find((target) => target.id === review.targetId)?.group,
          english,
        )}
      </p>
      <ReviewOverallScore english={english} review={review} compact />
      <dl className="rating-grid quick-scores">
        {ratingDimensions.map((key) => (
          <div key={key}>
            <dt>{englishRaceTerm(ratingPolicy.dimensions[key].title, english)}</dt>
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
      <p className="review-summary" lang={english && review.quickTake ? "zh-HK" : undefined}>
        {review.quickTake?.summary ??
          t("此篇未有重點摘要，可展開查看完整評論。", "Open the full review for details.")}
      </p>
      <details className="review-full review-evidence">
        <summary>{t("原文及依據", "Original review and evidence")}</summary>
        {review.evidence.map((e) => (
          <section key={e.id} id={`review-${review.id}-evidence-${e.id}`}>
            <p>
              {evidenceLabels[e.kind]} · {e.editionYear}：{e.description}
            </p>
            {e.url && (
              <a href={e.url} target="_blank" rel="noopener noreferrer">
                {t("查看材料 ↗", "View source ↗")}
              </a>
            )}
          </section>
        ))}
      </details>
      <details className="review-full">
        <summary>{t("查看詳細評論", "Read the original review in Chinese")}</summary>
        {review.quickTake && (
          <ul className="review-reminders" aria-label={t("兩個實用提醒", "Two practical tips")}>
            {review.quickTake.reminders.map((note, i) => (
              <li key={i} lang={english ? "zh-HK" : undefined}>
                {note}
              </li>
            ))}
          </ul>
        )}
        <DetailedReview english={english} review={review} />
      </details>
      <details className="review-full">
        <summary>{t("計分說明及資料範圍", "Scoring and scope of evidence")}</summary>
        <ReviewOverallScore english={english} review={review} />
      </details>
    </article>
  );
}
export function GroupRatings({
  race,
  group,
  excludedEditionYear,
  english = false,
}: {
  race: Race;
  group: RaceGroup;
  excludedEditionYear?: number;
  english?: boolean;
}) {
  const t = language(english);
  const { current, historical } = reviewsForGroup(
    race,
    group,
    editorialReviews.filter((r) => r.editionYear !== excludedEditionYear),
  );
  const opinions = runnerOpinionsForGroup(race, group).filter(
    (r) => r.editionYear !== excludedEditionYear,
  );
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
      aria-label={t(
        `${englishRaceTerm(group.name, english)}賽事體驗評級`,
        `${englishRaceTerm(group.name, true)} ratings`,
      )}
    >
      <h4>
        {t("參賽體驗", "Race experience")}{" "}
        <small>
          {group.date.slice(0, 4)}
          {t(" 年 · ", " · ")}
          {englishRaceTerm(group.name, english)}
        </small>
      </h4>
      <ReviewViews
        english={english}
        runnerContent={
          opinions.length ? (
            <>
              {opinions.map((record) => (
                <RunnerOpinionSummary
                  english={english}
                  key={`${record.targetId}-${record.editionYear}`}
                  record={record}
                  currentYear={Number(group.date.slice(0, 4))}
                />
              ))}
              <details className="runner-opinion-sources">
                <summary>{t("跨年份主題比較及人工備註", "Compare topics across editions")}</summary>
                <OpinionYearComparison
                  english={english}
                  records={opinions}
                  currentYear={Number(group.date.slice(0, 4))}
                  groupName={englishRaceTerm(group.name, english)}
                  scope={JSON.stringify([race.id, group.id])}
                />
              </details>
            </>
          ) : undefined
        }
      >
        {current.length ? (
          current.map((r) => <EditorialReviewCard english={english} key={r.id} review={r} />)
        ) : (
          <>
            {!historical.length && (
              <p>{t("此組別暫未評分。", "This category is currently unrated.")}</p>
            )}
          </>
        )}
        {!!historical.length && (
          <div className="historical-reviews">
            <p className="review-edition-note">
              {t(
                `往屆評論 · 不代表 ${group.date.slice(0, 4)} 年安排或表現`,
                `Past edition · Arrangements and experience may differ in ${group.date.slice(0, 4)}`,
              )}
            </p>
            {historical.map((r) => (
              <EditorialReviewCard english={english} key={r.id} review={r} />
            ))}
          </div>
        )}
        <details className="review-full">
          <summary>{t("評分說明及發布紀錄", "Scoring and publication record")}</summary>
          {!current.length && !historical.length && (
            <>
              <p>
                {t(
                  "此屆此組別尚未有已發布體驗評論。",
                  "No review has been published for this category and edition.",
                )}
              </p>
              <ReviewOverallScore english={english} />
              <dl className="rating-grid quick-scores">
                {ratingDimensions.map((key) => (
                  <div key={key}>
                    <dt>{englishRaceTerm(ratingPolicy.dimensions[key].title, english)}</dt>
                    <dd>{t("未評", "Unrated")}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
          {!!groupNotices.length && (
            <p className="editorial-notice">
              {groupNotices.map((n) => `${n.editionYear} 年：${n.summary}`).join(" ")}{" "}
              <Link href={localPath("/ratings/process/#publication-history", english)}>
                {t("查看處理紀錄", "View the correction record")}
              </Link>
            </p>
          )}
          <Link className="text-link" href={localPath("/ratings/", english)}>
            {t("了解三項評分準則", "View the three rating criteria")}
          </Link>
        </details>
      </ReviewViews>
    </section>
  );
}
