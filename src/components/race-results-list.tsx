import { Fragment, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { englishDate, englishDistanceTag, language, localPath } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { groupLocations } from "@/lib/group-locations";
import { listDeadline, listRegistration } from "@/lib/list-registration";
import {
  filteredRaceHref,
  pastResult,
  type paginateResults,
  type RaceResult,
} from "@/lib/list-view";
import { distanceLabel } from "@/lib/races";
import type { Filters, Race } from "@/lib/types";
import { RaceRecommendation } from "./race-recommendation";
import { FavoriteButton } from "./race-save";
import { StatusBadge } from "./status-badge";
import { AdSlot, Icon } from "./ui";

function highlightMatch(text: string, query: string) {
  const term = query.trim();
  if (!term) return text;
  const needle = term.toLowerCase();
  const parts: ReactNode[] = [];
  let previousEnd = 0;

  // Compare slices of the original text so case conversion cannot shift highlight offsets.
  for (let start = 0; start <= text.length - term.length;) {
    const end = start + term.length;
    const candidate = text.slice(start, end);
    if (candidate.toLowerCase() !== needle) {
      start += 1;
      continue;
    }
    parts.push(text.slice(previousEnd, start), <mark key={start}>{candidate}</mark>);
    previousEnd = end;
    start = end;
  }

  if (!parts.length) return text;
  parts.push(text.slice(previousEnd));
  return parts;
}

type RaceResultsListProps = {
  english: boolean;
  filters: Filters;
  now: string;
  ready: boolean;
  savedOnly: boolean;
  highlightDeadlines: boolean;
  error: string;
  noListedCountry: boolean;
  total: number;
  pagination: ReturnType<typeof paginateResults<RaceResult>>;
  resultsPanel: RefObject<HTMLDivElement | null>;
  relaxOption?: { label: string; onClick: () => void };
  onSort: (sort: "date" | "deadline") => void;
  onOpenRace: (raceId: string) => void;
  onRemoveFavorite?: (race: Race, keyboard: boolean) => void;
  onViewAll: () => void;
  onOpenFilters: () => void;
  onChangePage: (page: number) => void;
};

export function RaceResultsList({
  english,
  filters,
  now,
  ready,
  savedOnly,
  highlightDeadlines,
  error,
  noListedCountry,
  total,
  pagination,
  resultsPanel,
  relaxOption,
  onSort,
  onOpenRace,
  onRemoveFavorite,
  onViewAll,
  onOpenFilters,
  onChangePage,
}: RaceResultsListProps) {
  const t = language(english);
  const dateLabel = (day: string) => (english ? englishDate(day) : day.replaceAll("-", "/"));
  const visibleResults = pagination.items;
  const resultKey = JSON.stringify(
    visibleResults.map(({ race, groups }) => [race.id, groups.map((group) => group.id)]),
  );
  const reduceMotion = useReducedMotion();

  return (
    <div className="race-results-layout" ref={resultsPanel}>
      <div className="race-results-main">
        <div className="race-list" data-highlight-deadlines={highlightDeadlines || undefined}>
          {visibleResults.length > 0 && (
            <div
              className="calendar-row-head"
              role="group"
              aria-label={t("賽事列表欄位", "Race list columns")}
            >
              <span>{t("賽事／起點", "Race / Start")}</span>
              <button
                type="button"
                aria-pressed={filters.sort === "date"}
                onClick={() => onSort("date")}
              >
                {t("比賽日", "Race day")}{" "}
                {filters.sort === "date" && <span aria-hidden="true">↑</span>}
              </button>
              <span>{t("距離", "Distance")}</span>
              <span>{t("報名概況", "Registration")}</span>
              <button
                type="button"
                aria-pressed={filters.sort === "deadline"}
                onClick={() => onSort("deadline")}
              >
                {highlightDeadlines
                  ? t("已核實報名截止", "Verified entry deadline")
                  : t("最近截止", "Next deadline")}{" "}
                {filters.sort === "deadline" && <span aria-hidden="true">↑</span>}
              </button>
              <span>{t("收藏", "Save")}</span>
            </div>
          )}
          {visibleResults.map(({ race, groups }, index) => {
            const detailHref = localPath(filteredRaceHref(race, groups, filters), english);
            const deadline = listDeadline(race, groups, now, english);
            const registration = listRegistration(race, groups, now, english);
            const distances = [
              ...new Set(
                race.groups
                  .map((group) => group.distanceKm)
                  .sort((longer, shorter) => shorter - longer)
                  .map(distanceLabel),
              ),
            ];
            const matchedDistances = new Set(
              groups.map((group) => distanceLabel(group.distanceKm)),
            );
            const hasDistanceFilter = Boolean(
              filters.distances.length || filters.min || filters.max,
            );

            const pastSaved =
              savedOnly && filters.sort === "date" && pastResult({ race, groups }, now);
            const firstPast =
              pastSaved && (index === 0 || !pastResult(visibleResults[index - 1], now));
            return (
              <Fragment key={race.id}>
                {firstPast && (
                  <h2 className="past-saved-heading">{t("過往收藏", "Past saved races")}</h2>
                )}
                <motion.article
                  layout={ready && !reduceMotion ? "position" : false}
                  layoutDependency={resultKey}
                  transition={{ layout: { duration: 0.22, ease: "easeOut" } }}
                  className="calendar-race-card"
                  id={`race-${race.id}`}
                  tabIndex={-1}
                  onClickCapture={(event) => {
                    const anchor = (event.target as Element).closest("a");
                    if (anchor?.getAttribute("href") !== detailHref) return;
                    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                    onOpenRace(race.id);
                  }}
                >
                  <div className="calendar-race-content">
                    <h2>
                      <Link href={detailHref}>
                        {highlightMatch(english ? race.englishName : race.name, filters.q)}
                      </Link>
                    </h2>
                    <p className="calendar-race-venue">
                      <Icon name="pin" size={18} />
                      <span>
                        {highlightMatch(
                          [
                            ...new Set(
                              groupLocations(race, groups).map(
                                (location) =>
                                  englishRaceTerm(location.venue, english) ??
                                  t("起點待核實", "Start location not verified"),
                              ),
                            ),
                          ].join(" ／ "),
                          filters.q,
                        )}
                      </span>
                    </p>
                  </div>
                  <p className="calendar-race-start">
                    <Icon name="calendar" size={18} />
                    <span className="sr-only">{t("起跑日期：", "Race date:")}</span>
                    <span>
                      {[...new Set(groups.map((group) => group.date))].sort().map((date) => (
                        <time key={date} dateTime={date}>
                          {dateLabel(date)}
                        </time>
                      ))}
                    </span>
                  </p>
                  <ul
                    className="calendar-race-distances"
                    aria-label={t("比賽距離", "Race distances")}
                  >
                    {distances.map((distance) => {
                      const matched = matchedDistances.has(distance);
                      return (
                        <li
                          key={distance}
                          data-distance-match={hasDistanceFilter ? matched : undefined}
                        >
                          {english ? englishDistanceTag(distance) : distance}
                          {hasDistanceFilter && matched && (
                            <span className="sr-only">
                              {t("（符合篩選）", " (matches filter)")}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p
                    className="calendar-race-registration"
                    aria-label={t("報名概況", "Registration")}
                  >
                    {registration.status ? (
                      <StatusBadge status={registration.status}>{registration.primary}</StatusBadge>
                    ) : (
                      <strong>{registration.primary}</strong>
                    )}
                    {registration.secondary && <span>{registration.secondary}</span>}
                  </p>
                  <div className="calendar-race-deadline" data-empty={!deadline}>
                    {deadline ? (
                      <>
                        <span
                          className={highlightDeadlines ? "calendar-verified-deadline" : "sr-only"}
                        >
                          {t("已核實報名截止", "Verified entry deadline")}
                        </span>
                        <strong>
                          <time dateTime={deadline.day}>{dateLabel(deadline.day)}</time>
                        </strong>
                        <span>
                          {deadline.time ? (
                            <time dateTime={deadline.date}>
                              {deadline.time} {t("香港時間", "HKT")}
                            </time>
                          ) : (
                            t("時刻待核實", "Time unverified")
                          )}
                        </span>
                        <span>{deadline.scope}</span>
                      </>
                    ) : (
                      <span aria-label={t("暫無已核實截止日期", "No verified entry deadline")}>
                        {highlightDeadlines ? t("暫無已核實截止", "No verified deadline") : "—"}
                      </span>
                    )}
                  </div>
                  <FavoriteButton
                    english={english}
                    compact
                    race={english ? { id: race.id, name: race.englishName } : race}
                    onRemove={
                      onRemoveFavorite ? (keyboard) => onRemoveFavorite(race, keyboard) : undefined
                    }
                  />
                  <RaceRecommendation race={race} groups={groups} english={english} compact />
                </motion.article>
                {index === 5 && visibleResults.length > 7 && <AdSlot />}
              </Fragment>
            );
          })}
        </div>
        {!total && (
          <div className="empty-state">
            <Icon name="search" size={36} />
            <h2>
              {error
                ? t("調整一下篩選範圍", "Try changing your filters")
                : savedOnly
                  ? t("沒有符合篩選條件的收藏", "No saved races match the filters")
                  : t("暫無符合條件的賽事", "No races match the filters")}
            </h2>
            {savedOnly && (
              <p>
                {t(
                  "可切換至「全部」，再按賽事旁的「收藏」。",
                  "Switch to All and select Save next to a race.",
                )}
              </p>
            )}
            <p>
              {noListedCountry
                ? t(
                    `暫時未收錄${filters.countries.join("、")}賽事。試下其他地點。`,
                    "No races are listed for the selected location. Try another region.",
                  )
                : t(
                    "試下放寬日期、移除部分條件，或者切換「全部」。",
                    "Try a wider date range, remove some filters or switch to All.",
                  )}
            </p>
            <div className="calendar-empty-actions">
              {relaxOption && (
                <button className="button button-dark" onClick={relaxOption.onClick}>
                  {relaxOption.label}
                </button>
              )}
              <button className={relaxOption ? "button" : "button button-dark"} onClick={onViewAll}>
                {t("查看全部賽事", "View all races")} <Icon name="arrow" />
              </button>
            </div>
          </div>
        )}
        <div className="results-footer">
          <span role="status" aria-live="polite">
            {t(
              `顯示第 ${pagination.from} 至 ${pagination.to} 場，共 ${total} 場`,
              `Showing ${pagination.from}–${pagination.to} of ${total} races`,
            )}
          </span>
          <a
            href="#race-list"
            onClick={(event) => {
              if (!window.matchMedia("(max-width: 767px)").matches) return;
              event.preventDefault();
              onOpenFilters();
            }}
          >
            {t("返回篩選 ↑", "Back to filters ↑")}
          </a>
        </div>
        {pagination.pages > 1 && (
          <nav className="race-pagination" aria-label={t("賽事列表分頁", "Race list pagination")}>
            <button
              className="button"
              disabled={pagination.page === 1}
              onClick={() => onChangePage(pagination.page - 1)}
            >
              {t("上一頁", "Previous")}
            </button>
            <span>
              {t(
                `第 ${pagination.page}／${pagination.pages} 頁`,
                `Page ${pagination.page} of ${pagination.pages}`,
              )}
            </span>
            <button
              className="button"
              disabled={pagination.page === pagination.pages}
              onClick={() => onChangePage(pagination.page + 1)}
            >
              {t("下一頁", "Next")}
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
