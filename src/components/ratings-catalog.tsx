import Link from "next/link";
import { ReviewOverallScore } from "./review-overall-score";
import { Icon } from "./ui";
import { reviewsForGroup, type EditorialReview } from "@/lib/editorial-reviews";
import {
  ratingDimensions,
  ratingPolicy,
  reviewTargets,
  segmentLabels,
  scoreLabels,
} from "@/lib/rating-policy";
import { formatTimestamp } from "@/lib/races";
import { raceHref } from "@/lib/site";
import type { Race } from "@/lib/types";

type Props = { races: Race[]; reviews: EditorialReview[] };

export function PublishedReviewCards({ races, reviews }: Props) {
  return (
    <div className="ratings-review-grid">
      {[...reviews]
        .sort((a, b) => b.editionYear - a.editionYear || b.eventDate.localeCompare(a.eventDate))
        .map((review) => {
          const target = reviewTargets.find((item) => item.id === review.targetId);
          const race = races.find((item) => item.id === target?.raceId);
          const group = race?.groups.find((item) => item.id === target?.groupId);
          if (!target || !race || !group) return null;
          const year = Number(group.date.slice(0, 4));
          const historical = review.editionYear < year;
          const current = review.editionYear === year;
          const href = `${raceHref(race)}#review-${review.id}`;
          return (
            <article
              key={review.id}
              className="ratings-review-card"
              aria-labelledby={`index-${review.id}`}
            >
              <div className="ratings-review-meta">
                <span className="ratings-edition">
                  <span className="sr-only">評論年份及組別：</span>
                  {review.editionYear} 年 · {target.group}
                </span>
                <span className={`ratings-scope ${historical ? "ratings-scope--historical" : ""}`}>
                  {historical ? "往屆評論" : current ? "當屆評論" : "其他年份評論"}
                </span>
              </div>
              <h3 id={`index-${review.id}`}>
                <Link href={href}>{target.name}</Link>
              </h3>
              <ReviewOverallScore review={review} compact />
              <dl className="ratings-score-grid" aria-label="三項獨立評分">
                {ratingDimensions.map((key) => {
                  const score = review.assessments[key].score;
                  return (
                    <div key={key}>
                      <dt>{ratingPolicy.dimensions[key].title}</dt>
                      <dd>
                        {score === null ? (
                          <strong className="ratings-unrated-score">未評</strong>
                        ) : (
                          <>
                            <strong>{score}</strong>
                            <span> / 5</span>
                            <small>{scoreLabels[score]}</small>
                          </>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              {review.quickTake && (
                <p className="ratings-review-summary">{review.quickTake.summary}</p>
              )}
              <details className="ratings-observation">
                <summary>計分說明及資料範圍</summary>
                <p className="ratings-edition-context">於 {year} 年賽事頁閱讀 · 編輯點評</p>
                {historical && (
                  <p className="ratings-year-notice">往屆評論 · 不代表 {year} 年安排或表現</p>
                )}
                <ReviewOverallScore review={review} />
                <p className="ratings-runner-context">
                  {review.runnerSegment === "unknown"
                    ? "一位跑手觀察（位置未記錄）"
                    : `一位${segmentLabels[review.runnerSegment]}跑手觀察`}
                </p>
                <h4>評審及觀察範圍</h4>
                <p>評審：{review.reviewer}</p>
                <p>參賽／利益關係：{review.disclosure}</p>
                <p>觀察範圍：{review.observationLimits}</p>
                <small>
                  評論更新：
                  <time dateTime={review.reviewedAt}>{formatTimestamp(review.reviewedAt)} HKT</time>
                </small>
              </details>
              <div className="ratings-review-footer">
                <Link
                  className="ratings-review-action"
                  href={href}
                  aria-label={`${target.name} ${review.editionYear} 年${target.group}：查看完整評論`}
                >
                  查看完整評論 <Icon name="arrow" size={18} />
                </Link>
              </div>
            </article>
          );
        })}
    </div>
  );
}

export function EditionReviewCoverage({ races, reviews }: Props) {
  return (
    <details className="ratings-coverage" id="edition-coverage">
      <summary>
        <span>當屆賽事及組別評論狀態</span>
        <span className="ratings-coverage-hint">查看各組別</span>
      </summary>
      <p>當屆未評唔等於體驗差；如有往屆評論，會另作標示。</p>
      <ul className="ratings-coverage-list">
        {[...races]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((race) => (
            <li key={race.id}>
              <h3>
                <Link href={raceHref(race)}>{race.name}</Link>
              </h3>
              <ul>
                {race.groups.map((group) => {
                  const { current, historical } = reviewsForGroup(race, group, reviews);
                  return (
                    <li key={group.id}>
                      <Link href={`${raceHref(race)}#ratings-${group.id}`}>
                        <span>{group.name}</span>
                        <span
                          className={`ratings-coverage-status ${current.length ? "ratings-coverage-status--current" : ""}`}
                        >
                          {current.length
                            ? "當屆已評"
                            : historical.length
                              ? "當屆未評 · 有往屆評論"
                              : "未評"}
                        </span>
                        <Icon name="arrow" size={16} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
      </ul>
    </details>
  );
}
