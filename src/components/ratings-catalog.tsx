import { language, localPath } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import Link from "next/link";
import { Icon } from "./ui";
import { reviewsForGroup, type EditorialReview } from "@/lib/editorial-reviews";
import { reviewTargets, segmentLabels } from "@/lib/rating-policy";
import { formatTimestamp } from "@/lib/races";
import { raceHref } from "@/lib/site";
import type { Race } from "@/lib/types";

type Props = { races: Race[]; reviews: EditorialReview[]; english?: boolean };

export function PublishedReviewCards({ races, reviews, english = false }: Props) {
  const t = language(english);
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
          const href = localPath(`${raceHref(race)}#review-${review.id}`, english);
          return (
            <article
              key={review.id}
              className="ratings-review-card"
              aria-labelledby={`index-${review.id}`}
            >
              <h3 id={`index-${review.id}`}>
                <Link href={href}>{englishRaceTerm(target.name, english)}</Link>
              </h3>
              <div className="ratings-review-meta">
                <span className="ratings-edition">
                  <span className="sr-only">
                    {t("評論年份及組別：", "Review edition and category: ")}
                  </span>
                  {review.editionYear}
                  {t(" 年 · ", " · ")}
                  {englishRaceTerm(target.group, english)}
                </span>
                <span className={`ratings-scope ${historical ? "ratings-scope--historical" : ""}`}>
                  {historical
                    ? t("往屆評論", "Past edition")
                    : current
                      ? t("當屆評論", "Current edition")
                      : t("其他年份評論", "Other edition")}
                </span>
              </div>
              {review.quickTake && (
                <p className="ratings-review-summary" lang={english ? "zh-HK" : undefined}>
                  {review.quickTake.summary}
                </p>
              )}
              <details className="ratings-observation">
                <summary>{t("評論背景及資料範圍", "Review context and evidence")}</summary>
                <p className="ratings-edition-context">
                  {t(`於 ${year} 年賽事頁閱讀`, `Read the review on the ${year} race page`)}
                </p>
                {historical && (
                  <p className="ratings-year-notice">
                    {t(
                      `往屆評論 · 不代表 ${year} 年安排或表現`,
                      `Past edition review · Arrangements and experience may differ in ${year}`,
                    )}
                  </p>
                )}
                <p className="ratings-runner-context">
                  {review.runnerSegment === "unknown"
                    ? t(
                        "一位跑手觀察（位置未記錄）",
                        "One runner’s observations (position unrecorded)",
                      )
                    : t(
                        `一位${segmentLabels[review.runnerSegment]}跑手觀察`,
                        `One runner’s observations · ${englishRaceTerm(segmentLabels[review.runnerSegment], true)}`,
                      )}
                </p>
                <h4>{t("評審及觀察範圍", "Reviewer and scope of observation")}</h4>
                <p>
                  {t("評審：", "Reviewer: ")}
                  <span lang={english ? "zh-HK" : undefined}>{review.reviewer}</span>
                </p>
                <p>
                  {t("參賽／利益關係：", "Participation and conflicts of interest: ")}
                  <span lang={english ? "zh-HK" : undefined}>{review.disclosure}</span>
                </p>
                <p>
                  {t("觀察範圍：", "Observation scope: ")}
                  <span lang={english ? "zh-HK" : undefined}>{review.observationLimits}</span>
                </p>
                <small>
                  {t("評論更新：", "Review updated: ")}
                  <time dateTime={review.reviewedAt}>{formatTimestamp(review.reviewedAt)} HKT</time>
                </small>
              </details>
              <div className="ratings-review-footer">
                <Link
                  className="ratings-review-action"
                  href={href}
                  aria-label={t(
                    `${target.name} ${review.editionYear} 年${target.group}：查看完整評論`,
                    `${englishRaceTerm(target.name, true)} ${review.editionYear} ${englishRaceTerm(target.group, true)}: read full review`,
                  )}
                >
                  {t("查看完整評論", "Read full review")} <Icon name="arrow" size={18} />
                </Link>
              </div>
            </article>
          );
        })}
    </div>
  );
}

export function EditionReviewCoverage({ races, reviews, english = false }: Props) {
  const t = language(english);
  return (
    <details className="ratings-coverage" id="edition-coverage">
      <summary>
        <span>{t("當屆賽事及組別評論狀態", "Review coverage by edition and category")}</span>
        <span className="ratings-coverage-hint">{t("查看各組別", "View race categories")}</span>
      </summary>
      <p>{t("評論按屆次及組別列出。", "Reviews are listed by edition and category.")}</p>
      <ul className="ratings-coverage-list">
        {[...races]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((race) => (
            <li key={race.id}>
              <h3>
                <Link href={localPath(raceHref(race), english)}>
                  {english ? race.englishName : race.name}
                </Link>
              </h3>
              <ul>
                {race.groups.map((group) => {
                  const { current, historical } = reviewsForGroup(race, group, reviews);
                  return (
                    <li key={group.id}>
                      <Link href={localPath(`${raceHref(race)}#ratings-${group.id}`, english)}>
                        <span>{englishRaceTerm(group.name, english)}</span>
                        <span
                          className={`ratings-coverage-status ${current.length ? "ratings-coverage-status--current" : ""}`}
                        >
                          {current.length
                            ? t("有當屆評論", "Current review available")
                            : historical.length
                              ? t("有往屆評論", "Past review available")
                              : t("暫無評論", "No review yet")}
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
