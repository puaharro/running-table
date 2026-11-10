"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { AdSlot, Icon } from "./ui";
import {
  defaultFilters,
  hongKongToday,
  displayDate,
  distanceLabel,
  filterError,
  selectRaces,
  serializeFilters,
} from "@/lib/races";
import {
  dateShortcutIsActive,
  toggleDateShortcut,
  type DateShortcut,
} from "@/lib/filter-shortcuts";
import { groupLocations } from "@/lib/group-locations";
import { listDeadline, listRegistration } from "@/lib/list-registration";
import { filteredRaceHref, orderSavedResults, paginateResults, pastResult } from "@/lib/list-view";
import { resultsEntry, resultsHref } from "@/lib/results-location";
import { FavoriteButton, useFavorites } from "./race-save";
import { RaceOverallRating } from "./race-overall-rating";
import type { EditorialReview } from "@/lib/editorial-reviews";
import { distanceOptions, regions, type Filters, type Race } from "@/lib/types";

function monthLabel(date: string) {
  return `${date.slice(0, 4)} 年 ${Number(date.slice(5, 7))} 月`;
}

export function RaceExplorer({
  races,
  initialNow,
  reviews = [],
}: {
  races: Race[];
  initialNow: string;
  reviews?: EditorialReview[];
}) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [page, setPage] = useState(1);
  const favorites = useFavorites();
  const [savedOnly, setSavedOnly] = useState(false);
  function changeSavedOnly(value: boolean, next = filters) {
    setSavedOnly(value);
    update(value ? { ...next, view: "all" } : next);
    try {
      sessionStorage.setItem("nxtgo:saved-only", value ? "1" : "0");
    } catch {
      /* Filtering remains available without session storage. */
    }
  }
  useEffect(() => {
    const restore = () => {
      try {
        setSavedOnly(sessionStorage.getItem("nxtgo:saved-only") === "1");
      } catch {
        /* Optional list view memory. */
      }
    };
    restore();
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);
  const [now, setNow] = useState(initialNow);
  const [ready, setReady] = useState(false);
  const [customDates, setCustomDates] = useState(false);
  const [copyState, setCopyState] = useState<"copied" | "manual" | null>(null);
  const shareRequest = useRef(0);
  const resultsCount = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = window.setTimeout(() => setCopyState(null), 2400);
    return () => window.clearTimeout(timer);
  }, [copyState]);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  useEffect(() => {
    const sync = () => {
      const {
        filters: next,
        savedOnly: requestedSaved,
        page: nextPage,
      } = resultsEntry(new URLSearchParams(window.location.search));
      if (requestedSaved) {
        changeSavedOnly(true);
        // Consume the entry command; sharing keeps only ordinary list filters.
        window.history.replaceState(window.history.state, "", resultsHref(next));
      }
      setFilters(next);
      setPage(nextPage);
      try {
        window.sessionStorage.setItem("rundates:results", resultsHref(next, undefined, nextPage));
      } catch {
        /* Browser back remains available. */
      }
    };
    sync();
    setNow(new Date().toISOString());
    setReady(true);
    window.addEventListener("popstate", sync);
    window.addEventListener("pageshow", sync);
    const interval = window.setInterval(() => setNow(new Date().toISOString()), 60000);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("pageshow", sync);
      window.clearInterval(interval);
    };
  }, []);
  function update(next: Filters) {
    setFilters(next);
    setPage(1);
    shareRequest.current += 1;
    setCopyState(null);
    const query = serializeFilters(next);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}#race-list`,
    );
    try {
      window.sessionStorage.setItem("rundates:results", resultsHref(next));
    } catch {
      /* Sharing and browser back remain available without storage. */
    }
  }
  useEffect(() => {
    if (
      !ready ||
      window.location.hash === "#race-list" ||
      !/^#race-[a-z0-9-]+$/.test(window.location.hash)
    )
      return;
    const frame = window.requestAnimationFrame(() => {
      const row = document.getElementById(window.location.hash.slice(1));
      row?.scrollIntoView({ block: "start", behavior: "instant" });
      row?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ready, page]);
  function field<K extends keyof Filters>(key: K, value: Filters[K]) {
    update({ ...filters, [key]: value });
  }
  function toggle(key: "distances" | "regions", value: string) {
    const values: string[] = filters[key];
    update({
      ...filters,
      countries: key === "regions" ? [] : filters.countries,
      [key]: values.includes(value) ? values.filter((x) => x !== value) : [...values, value],
    });
  }
  function quickDate(kind: DateShortcut) {
    setCustomDates(false);
    update({ ...toggleDateShortcut(filters, kind, now), view: "all" });
  }
  const results = useMemo(() => {
    const selected = selectRaces(
      savedOnly ? races.filter((r) => favorites.ids.includes(r.id)) : races,
      filters,
      now,
    );
    return savedOnly && filters.sort === "date" ? orderSavedResults(selected, now) : selected;
  }, [races, filters, now, savedOnly, favorites.ids]);
  const pagination = paginateResults(results, page);
  const visibleResults = pagination.items;
  useEffect(() => {
    if (!ready || (savedOnly && !favorites.ready) || page === pagination.page) return;
    setPage(pagination.page);
    const href = resultsHref(filters, undefined, pagination.page);
    window.history.replaceState(window.history.state, "", href);
    try {
      sessionStorage.setItem("rundates:results", href);
    } catch {
      /* Optional return memory. */
    }
  }, [ready, savedOnly, favorites.ready, page, pagination.page, filters]);
  function changePage(next: number) {
    const target = paginateResults(results, next).page;
    setPage(target);
    shareRequest.current += 1;
    setCopyState(null);
    const href = resultsHref(filters, undefined, target);
    window.history.replaceState(window.history.state, "", href);
    try {
      sessionStorage.setItem("rundates:results", href);
    } catch {
      /* Optional return memory. */
    }
    window.requestAnimationFrame(() => {
      resultsPanel.current?.scrollIntoView({ block: "start", behavior: "instant" });
      resultsCount.current?.focus({ preventScroll: true });
    });
  }
  const resultsPanel = useRef<HTMLDivElement>(null);
  const resultKey = JSON.stringify(
    visibleResults.map(({ race, groups }) => [race.id, groups.map((group) => group.id)]),
  );
  const reduceMotion = useReducedMotion();
  const calendarYear = Number(hongKongToday(new Date(now)).slice(0, 4));
  const yearActive = dateShortcutIsActive(filters, "year", now);
  const nextYearActive = dateShortcutIsActive(filters, "next-year", now);
  const showCustomDates =
    customDates || (!!(filters.from || filters.to) && !yearActive && !nextYearActive);
  const error = filterError(filters);
  const activeFilterCount =
    Number(Boolean(filters.from || filters.to)) +
    Number(Boolean(filters.month)) +
    Number(Boolean(filters.min || filters.max)) +
    Number(filters.family) +
    Number(filters.themed) +
    filters.countries.length +
    filters.regions.length +
    filters.distances.length +
    filters.sports.length +
    filters.statuses.length +
    filters.channels.length;
  const acceptingOnly = filters.statuses.length === 1 && filters.statuses[0] === "open";
  const selectedView = savedOnly
    ? "saved"
    : acceptingOnly && filters.view === "upcoming"
      ? "open"
      : filters.view;
  const quickViews = [
    ["upcoming", "即將舉行"],
    ["open", "接受申請"],
    ["saved", "我的收藏"],
    ["all", "全部"],
  ] as const;
  const relaxOptions: { label: string; next: Filters }[] = [];
  if (!results.length) {
    if (filters.month) relaxOptions.push({ label: "取消月份", next: { ...filters, month: "" } });
    if (filters.from || filters.to) {
      relaxOptions.push({ label: "取消日期範圍", next: { ...filters, from: "", to: "" } });
    }
    if (filters.countries.length || filters.regions.length) {
      relaxOptions.push({
        label: "取消地點限制",
        next: { ...filters, countries: [], regions: [] },
      });
    }
    if (filters.distances.length || filters.min || filters.max) {
      relaxOptions.push({
        label: "取消距離限制",
        next: { ...filters, distances: [], min: "", max: "" },
      });
    }
    if (filters.themed)
      relaxOptions.push({ label: "取消主題跑限制", next: { ...filters, themed: false } });
    if (filters.family)
      relaxOptions.push({ label: "取消組別限制", next: { ...filters, family: false } });
    if (filters.statuses.length) {
      relaxOptions.push({ label: "取消報名狀態限制", next: { ...filters, statuses: [] } });
    }
    if (filters.channels.length) {
      relaxOptions.push({ label: "取消報名渠道限制", next: { ...filters, channels: [] } });
    }
    if (filters.q) relaxOptions.push({ label: "清除搜尋字詞", next: { ...filters, q: "" } });
  }
  const relaxOption =
    relaxOptions.find(({ next }) => selectRaces(races, next, now).length > 0) ?? relaxOptions[0];

  async function share() {
    const request = ++shareRequest.current;
    const url = window.location.href;
    let state: typeof copyState = "copied";
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      state = "manual";
    }
    if (request === shareRequest.current && url === window.location.href) setCopyState(state);
  }
  return (
    <section id="race-list" className="explorer shell" aria-labelledby="explorer-heading">
      <header className="section-heading explorer-heading">
        <div>
          <p className="calendar-eyebrow">HONG KONG RUNNING CALENDAR</p>
          <h1 id="explorer-heading">賽事搜尋／時間表</h1>
        </div>
        <span className="calendar-scope">
          <Icon name="pin" size={16} /> 香港路跑
        </span>
      </header>
      <div className="calendar-search-bar">
        <label className="calendar-keyword">
          <span>搜尋賽事</span>
          <span className="search-box">
            <Icon name="search" size={21} />
            <input
              type="search"
              value={filters.q}
              maxLength={200}
              onChange={(e) => field("q", e.target.value)}
              placeholder="賽事名或地點"
              enterKeyHint="search"
            />
          </span>
        </label>
        <button
          className="calendar-filter-toggle"
          aria-expanded={filtersExpanded}
          aria-controls="calendar-filter-panel"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <Icon name="filter" size={18} /> 篩選
          <span
            className="calendar-filter-count"
            data-empty={activeFilterCount === 0}
            aria-hidden={activeFilterCount === 0}
          >
            {activeFilterCount}
          </span>
        </button>
      </div>
      <div className="calendar-workspace">
        <aside
          className="calendar-filter-panel"
          id="calendar-filter-panel"
          data-expanded={filtersExpanded}
          aria-label="賽事篩選"
        >
          <div className="filter-card search-engine">
            <div className="calendar-filter-heading">
              <Icon name="filter" size={18} />
              <h2>篩選條件</h2>
              <button
                type="button"
                className="calendar-reset-filters"
                onClick={() => {
                  setCustomDates(false);
                  changeSavedOnly(false);
                  update(defaultFilters);
                }}
              >
                重置條件
              </button>
            </div>
            <div className="engine-options">
              <div className="engine-option-row" role="group" aria-label="比賽日期">
                <span className="engine-label">比賽日期</span>
                <div className="option-row">
                  <button aria-pressed={yearActive} onClick={() => quickDate("year")}>
                    {calendarYear}
                  </button>
                  <button aria-pressed={nextYearActive} onClick={() => quickDate("next-year")}>
                    {calendarYear + 1}
                  </button>
                  <button
                    aria-pressed={showCustomDates}
                    aria-expanded={showCustomDates}
                    aria-controls="custom-dates"
                    onClick={() => {
                      setCustomDates(!showCustomDates);
                      update({ ...filters, from: "", to: "", view: "all" });
                    }}
                  >
                    指定時間
                  </button>
                  <label className="engine-month">
                    <span className="sr-only">月份</span>
                    <select
                      aria-label="月份"
                      value={filters.month}
                      onChange={(e) => field("month", e.target.value)}
                    >
                      <option value="">月份</option>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                        <option key={month} value={String(month)}>
                          {month}月
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              {showCustomDates && (
                <div className="date-inputs engine-dates" id="custom-dates">
                  <label>
                    <span>開始日期</span>
                    <input
                      aria-label="開始日期"
                      type="date"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "calendar-filter-error" : undefined}
                      value={filters.from}
                      onChange={(e) => update({ ...filters, from: e.target.value, view: "all" })}
                    />
                  </label>
                  <span>—</span>
                  <label>
                    <span>結束日期</span>
                    <input
                      aria-label="結束日期"
                      type="date"
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "calendar-filter-error" : undefined}
                      value={filters.to}
                      onChange={(e) => update({ ...filters, to: e.target.value, view: "all" })}
                    />
                  </label>
                </div>
              )}
              <div className="engine-option-row" role="group" aria-label="地點">
                <span className="engine-label">地點</span>
                <div className="option-row">
                  {regions.map((region) => (
                    <button
                      key={region}
                      aria-pressed={filters.regions.includes(region)}
                      onClick={() => toggle("regions", region)}
                    >
                      {region === "港島" ? "香港島" : region}
                    </button>
                  ))}
                </div>
              </div>
              <div className="engine-option-row" role="group" aria-label="距離">
                <span className="engine-label">距離</span>
                <div className="option-row">
                  {distanceOptions.map((distance) => (
                    <button
                      key={distance}
                      aria-pressed={filters.distances.includes(distance)}
                      onClick={() => toggle("distances", distance)}
                    >
                      {distance}
                    </button>
                  ))}
                </div>
              </div>
              <div className="engine-option-row" role="group" aria-label="報名狀態">
                <span className="engine-label">報名狀態</span>
                <div className="option-row">
                  <button
                    aria-pressed={acceptingOnly}
                    onClick={() => field("statuses", acceptingOnly ? [] : ["open"])}
                  >
                    接受申請
                  </button>
                </div>
              </div>
              <div className="engine-option-row" role="group" aria-label="賽事類型">
                <span className="engine-label">賽事類型</span>
                <div className="option-row">
                  <button
                    aria-pressed={filters.themed}
                    onClick={() => update({ ...filters, themed: !filters.themed, family: false })}
                  >
                    主題跑
                  </button>
                </div>
              </div>
              <div
                className="engine-option-row"
                role="group"
                aria-label="賽事難易度"
                aria-describedby="difficulty-note"
              >
                <span className="engine-label">賽事難易度</span>
                <div className="option-row">
                  {["困難", "適中", "容易"].map((difficulty) => (
                    <button key={difficulty} disabled>
                      {difficulty}
                    </button>
                  ))}
                </div>
                <small id="difficulty-note">正式難易度評級推出後開放</small>
              </div>
            </div>
          </div>
          <button
            className="calendar-apply-filters"
            onClick={() => {
              setFiltersExpanded(false);
              window.requestAnimationFrame(() => {
                const toolbar = document.getElementById("results-toolbar");
                resultsCount.current?.focus({ preventScroll: true });
                toolbar?.scrollIntoView({ block: "start", behavior: "instant" });
              });
            }}
          >
            顯示 {results.length} 場賽事 <Icon name="arrow" size={18} />
          </button>
        </aside>
        <div className="calendar-results">
          {error && (
            <p className="error-message" id="calendar-filter-error" role="alert">
              {error}
            </p>
          )}
          <div className="results-toolbar" id="results-toolbar" tabIndex={-1}>
            <div className="calendar-view-tabs" role="group" aria-label="賽事快捷篩選">
              {quickViews.map(([key, label]) => (
                <button
                  key={key}
                  aria-pressed={selectedView === key}
                  onClick={() =>
                    changeSavedOnly(key === "saved", {
                      ...filters,
                      view: key === "open" ? "upcoming" : key === "saved" ? "all" : key,
                      statuses:
                        key === "open"
                          ? ["open"]
                          : filters.statuses.filter((status) => status !== "open"),
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <span
              ref={resultsCount}
              className="calendar-result-count"
              tabIndex={-1}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              共 <strong>{results.length}</strong> 場
            </span>
            <div className="results-actions">
              <label className="calendar-sort">
                <span>排序</span>
                <select
                  aria-label="排序方式"
                  value={filters.sort}
                  onChange={(e) => field("sort", e.target.value as Filters["sort"])}
                >
                  <option value="date">按比賽日期</option>
                  <option value="deadline">按報名截止</option>
                  <option value="recent">按最近更新</option>
                </select>
              </label>
              <button className="share-button" onClick={share} aria-label="分享篩選">
                {copyState === "copied"
                  ? "已複製 ✓"
                  : copyState === "manual"
                    ? "請複製網址"
                    : "分享篩選 ↗"}
              </button>
            </div>
            {favorites.message && (
              <p className="saved-note" role="status">
                {favorites.message}
              </p>
            )}
          </div>
          <span className="sr-only" role="status">
            {copyState === "copied"
              ? "已複製篩選連結"
              : copyState === "manual"
                ? "請複製瀏覽器網址，當中已保留篩選條件。"
                : ""}
          </span>
          {!ready && <p className="sr-only">正在載入你的篩選條件。</p>}
          <div className="race-results-layout" ref={resultsPanel}>
            <div className="race-results-main">
              <div className="race-list">
                {visibleResults.map(({ race, groups }, index) => {
                  const detailHref = filteredRaceHref(race, groups, filters);
                  const deadline = listDeadline(race, groups, now);
                  const distances = [
                    ...new Set(race.groups.map((group) => distanceLabel(group.distanceKm))),
                  ];
                  const matchedDistances = new Set(
                    groups.map((group) => distanceLabel(group.distanceKm)),
                  );
                  const hasDistanceFilter = Boolean(
                    filters.distances.length || filters.min || filters.max,
                  );
                  const RaceHeading = filters.sort === "date" ? "h3" : "h2";
                  const month = race.date.slice(0, 7);
                  const previousMonth = visibleResults[index - 1]?.race.date.slice(0, 7);
                  const pastSaved =
                    savedOnly && filters.sort === "date" && pastResult({ race, groups }, now);
                  const firstPast =
                    pastSaved && (index === 0 || !pastResult(visibleResults[index - 1], now));
                  return (
                    <Fragment key={race.id}>
                      {firstPast && <h2 className="past-saved-heading">過往收藏</h2>}
                      {filters.sort === "date" && month !== previousMonth && (
                        <div className="month-divider">
                          <h2>{monthLabel(race.date)}</h2>
                          <i />
                        </div>
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
                          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
                            return;
                          const returnHref = resultsHref(filters, race.id, pagination.page);
                          window.history.replaceState(window.history.state, "", returnHref);
                          try {
                            sessionStorage.setItem("rundates:results", returnHref);
                          } catch {
                            /* The list URL remains shareable when storage is unavailable. */
                          }
                        }}
                      >
                        <div className="calendar-race-content">
                          <RaceHeading>
                            <Link href={detailHref}>{race.name}</Link>
                          </RaceHeading>
                          <p className="calendar-race-venue">
                            <Icon name="pin" size={18} />
                            <span>
                              {[
                                ...new Set(
                                  groupLocations(race, groups).map(
                                    (location) => location.venue ?? "起點待核實",
                                  ),
                                ),
                              ].join(" ／ ")}
                            </span>
                          </p>
                          <ul className="calendar-race-distances" aria-label="比賽距離">
                            {distances.map((distance) => {
                              const matched = matchedDistances.has(distance);
                              return (
                                <li
                                  key={distance}
                                  data-distance-match={hasDistanceFilter ? matched : undefined}
                                >
                                  {distance}
                                  {hasDistanceFilter && matched && (
                                    <span className="sr-only">（符合篩選）</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                          <p className="calendar-race-start">
                            <Icon name="calendar" size={18} />
                            <span className="sr-only">起跑日期：</span>
                            <span>
                              {[...new Set(groups.map((group) => group.date))]
                                .sort()
                                .map((date, index) => (
                                  <Fragment key={date}>
                                    {index > 0 && " ／ "}
                                    <time dateTime={date}>
                                      {displayDate(date, { year: "numeric" })}
                                    </time>
                                  </Fragment>
                                ))}
                            </span>
                          </p>
                          <p className="calendar-race-registration" aria-label="報名概況">
                            {listRegistration(race, groups, now)}
                          </p>
                          {deadline && (
                            <p className="calendar-race-deadline">
                              <span className="sr-only">最近已核實報名截止：</span>
                              <strong>
                                <time dateTime={deadline.date}>{deadline.label}</time>
                              </strong>
                              <span>{deadline.scope}</span>
                            </p>
                          )}
                        </div>
                        <div className="calendar-card-actions">
                          <FavoriteButton race={race} />
                          <div className="calendar-card-detail">
                            <Link
                              className="button button-coral calendar-race-detail"
                              href={detailHref}
                              aria-label={`${race.name}：詳細資料`}
                            >
                              詳細資料 <Icon name="arrow" size={20} />
                            </Link>
                            <RaceOverallRating race={race} groups={groups} reviews={reviews} />
                          </div>
                        </div>
                      </motion.article>
                      {index === 5 && visibleResults.length > 7 && <AdSlot />}
                    </Fragment>
                  );
                })}
              </div>
              {!results.length && (
                <div className="empty-state">
                  <Icon name="search" size={36} />
                  <h2>
                    {error
                      ? "調整一下篩選範圍"
                      : savedOnly
                        ? "未有符合篩選嘅收藏"
                        : "暫時搵唔到符合條件嘅賽事"}
                  </h2>
                  {savedOnly && <p>可切換到「全部」，再按賽事旁嘅「收藏」。</p>}
                  <p>
                    {filters.countries.length &&
                    !races.some((race) => filters.countries.includes(race.country ?? "香港"))
                      ? `暫時未收錄${filters.countries.join("、")}賽事。試下其他地點。`
                      : "試下放寬日期、移除部分條件，或者切換「全部」。"}
                  </p>
                  <div className="calendar-empty-actions">
                    {relaxOption && (
                      <button
                        className="button button-dark"
                        onClick={() => {
                          if (!relaxOption.next.from && !relaxOption.next.to) setCustomDates(false);
                          update(relaxOption.next);
                          resultsCount.current?.focus({ preventScroll: true });
                        }}
                      >
                        {relaxOption.label}
                      </button>
                    )}
                    <button
                      className={relaxOption ? "button" : "button button-dark"}
                      onClick={() => {
                        setCustomDates(false);
                        changeSavedOnly(false);
                        update({ ...defaultFilters, view: "all" });
                        resultsCount.current?.focus({ preventScroll: true });
                      }}
                    >
                      查看全部賽事 <Icon name="arrow" />
                    </button>
                  </div>
                </div>
              )}
              <div className="results-footer">
                <span role="status" aria-live="polite">
                  顯示第 {pagination.from}–{pagination.to} 場，共 {results.length} 場
                </span>
                <a href="#race-list" onClick={() => setFiltersExpanded(true)}>
                  返回篩選 ↑
                </a>
              </div>
              {pagination.pages > 1 && (
                <nav className="race-pagination" aria-label="賽事列表分頁">
                  <button
                    className="button"
                    disabled={pagination.page === 1}
                    onClick={() => changePage(pagination.page - 1)}
                  >
                    上一頁
                  </button>
                  <span>
                    第 {pagination.page}／{pagination.pages} 頁
                  </span>
                  <button
                    className="button"
                    disabled={pagination.page === pagination.pages}
                    onClick={() => changePage(pagination.page + 1)}
                  >
                    下一頁
                  </button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
