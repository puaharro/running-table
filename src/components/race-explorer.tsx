"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { englishRaceTerm } from "@/lib/race-terms.en";
import {
  englishDate,
  englishDistanceTag,
  englishTimestamp,
  language,
  localPath,
} from "@/lib/english-races";
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
import {
  filteredRaceHref,
  orderByListedDeadline,
  orderSavedResults,
  paginateResults,
  pastResult,
} from "@/lib/list-view";
import { resultsEntry, resultsHref } from "@/lib/results-location";
import { FavoriteButton, useFavorites } from "./race-save";
import { RaceBackToSearch } from "./race-back-to-search";
import { RaceOverallRating } from "./race-overall-rating";
import { CalendarSheetDismiss } from "./calendar-sheet-dismiss";
import type { EditorialReview } from "@/lib/editorial-reviews";
import { distanceOptions, regions, type Filters, type Race } from "@/lib/types";

const filterCategories = (t: ReturnType<typeof language>) =>
  [
    ["date", t("比賽日期", "Race date")],
    ["location", t("地點", "Location")],
    ["distance", t("距離", "Distance")],
    ["registration", t("報名狀態", "Entry status")],
    ["type", t("賽事類型", "Race type")],
    ["difficulty", t("賽事難易度", "Race difficulty")],
  ] as const;
type FilterCategory = ReturnType<typeof filterCategories>[number][0];

function highlightMatch(text: string, query: string) {
  const term = query.trim();
  if (!term) return text;
  const literal = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text
    .split(new RegExp(`(${literal})`, "iu"))
    .map((part, index) => (index % 2 === 0 ? part : <mark key={index}>{part}</mark>));
}

function FilterOptionCount({ count, english }: { count: number; english: boolean }) {
  return (
    <span className="calendar-option-count">
      {count}
      <span className="sr-only">{english ? " races" : " 場"}</span>
    </span>
  );
}

export function RaceExplorer({
  races,
  initialNow,
  reviews = [],
  english = false,
}: {
  races: Race[];
  initialNow: string;
  reviews?: EditorialReview[];
  english?: boolean;
}) {
  const t = language(english);
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
  const searchBar = useRef<HTMLDivElement>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  const [removed, setRemoved] = useState<{ id: string; name: string; keyboard: boolean } | null>(
    null,
  );
  const [undoPaused, setUndoPaused] = useState(false);
  const [undoError, setUndoError] = useState(false);
  const [undoMessage, setUndoMessage] = useState("");
  useEffect(() => {
    if (removed?.keyboard) undoButton.current?.focus();
  }, [removed]);
  useEffect(() => {
    if (!removed || undoPaused || undoError) return;
    const timer = window.setTimeout(() => setRemoved(null), 8000);
    return () => window.clearTimeout(timer);
  }, [removed, undoPaused, undoError]);
  function dismissUndo(restoreFocus: boolean) {
    if (restoreFocus) resultsCount.current?.focus();
    setRemoved(null);
  }

  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = window.setTimeout(() => setCopyState(null), 2400);
    return () => window.clearTimeout(timer);
  }, [copyState]);
  const [filterCategory, setFilterCategory] = useState<FilterCategory | null>(null);
  const categoryButtons = useRef<Partial<Record<FilterCategory, HTMLButtonElement>>>({});
  const categoryOptions = useRef<HTMLDivElement>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  useEffect(() => {
    if (!filtersExpanded) return;
    const panel = document.getElementById("calendar-filter-panel");
    if (!(panel instanceof HTMLDialogElement)) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    if (!mobile.matches) {
      setFiltersExpanded(false);
      return;
    }
    if (!panel.open) panel.showModal();
    const closeOnDesktop = () => {
      if (!mobile.matches) panel.close();
    };
    mobile.addEventListener("change", closeOnDesktop);
    return () => mobile.removeEventListener("change", closeOnDesktop);
  }, [filtersExpanded]);
  const FilterPanel = filtersExpanded ? "dialog" : "aside";
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
        window.history.replaceState(
          window.history.state,
          "",
          localPath(resultsHref(next), english),
        );
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
  const searchableRaces = useMemo(
    () => (savedOnly ? races.filter((race) => favorites.ids.includes(race.id)) : races),
    [races, savedOnly, favorites.ids],
  );
  const results = useMemo(() => {
    const selected = selectRaces(
      searchableRaces,
      filters.sort === "deadline" ? { ...filters, sort: "date" } : filters,
      now,
    );
    if (filters.sort === "deadline") return orderByListedDeadline(selected, now);
    return savedOnly && filters.sort === "date" ? orderSavedResults(selected, now) : selected;
  }, [searchableRaces, filters, now, savedOnly]);
  const optionCounts = useMemo(() => {
    if (!filtersExpanded && filterCategory !== "location" && filterCategory !== "distance")
      return null;
    return {
      regions: regions.map(
        (region) =>
          selectRaces(searchableRaces, { ...filters, countries: [], regions: [region] }, now)
            .length,
      ),
      distances: distanceOptions.map(
        (distance) =>
          selectRaces(searchableRaces, { ...filters, distances: [distance] }, now).length,
      ),
    };
  }, [filterCategory, filtersExpanded, searchableRaces, filters, now]);
  const pagination = paginateResults(results, page);
  const visibleResults = pagination.items;
  useEffect(() => {
    if (!ready || (savedOnly && !favorites.ready) || page === pagination.page) return;
    setPage(pagination.page);
    const href = resultsHref(filters, undefined, pagination.page);
    window.history.replaceState(window.history.state, "", localPath(href, english));
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
    window.history.replaceState(window.history.state, "", localPath(href, english));
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
  const dateErrorId = "calendar-date-range-error";
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
  const categoryCounts: Record<FilterCategory, number> = {
    date: Number(Boolean(filters.from || filters.to)) + Number(Boolean(filters.month)),
    location: filters.regions.length + filters.countries.length,
    distance: filters.distances.length + Number(Boolean(filters.min || filters.max)),
    registration: filters.statuses.length + filters.channels.length,
    type: Number(filters.themed || filters.family) + filters.sports.length,
    difficulty: 0,
  };
  const acceptingOnly = filters.statuses.length === 1 && filters.statuses[0] === "open";
  const selectedView = savedOnly
    ? "saved"
    : acceptingOnly && filters.view === "upcoming"
      ? "open"
      : filters.view;
  const quickViews = [
    ["upcoming", t("即將舉行", "Upcoming")],
    ["open", t("接受申請", "Accepting entries")],
    ["saved", t("我的收藏", "Saved races")],
    ["all", t("全部", "All")],
  ] as const;
  const relaxOptions: { label: string; next: Filters }[] = [];
  if (!results.length) {
    if (filters.month)
      relaxOptions.push({ label: t("取消月份", "Remove month"), next: { ...filters, month: "" } });
    if (filters.from || filters.to) {
      relaxOptions.push({
        label: t("取消日期範圍", "Remove date range"),
        next: { ...filters, from: "", to: "" },
      });
    }
    if (filters.countries.length || filters.regions.length) {
      relaxOptions.push({
        label: t("取消地點限制", "Remove location filter"),
        next: { ...filters, countries: [], regions: [] },
      });
    }
    if (filters.distances.length || filters.min || filters.max) {
      relaxOptions.push({
        label: t("取消距離限制", "Remove distance filter"),
        next: { ...filters, distances: [], min: "", max: "" },
      });
    }
    if (filters.themed)
      relaxOptions.push({
        label: t("取消主題跑限制", "Remove themed race filter"),
        next: { ...filters, themed: false },
      });
    if (filters.family)
      relaxOptions.push({
        label: t("取消組別限制", "Remove category filter"),
        next: { ...filters, family: false },
      });
    if (filters.statuses.length) {
      relaxOptions.push({
        label: t("取消報名狀態限制", "Remove entry status filter"),
        next: { ...filters, statuses: [] },
      });
    }
    if (filters.channels.length) {
      relaxOptions.push({
        label: t("取消報名渠道限制", "Remove entry channel filter"),
        next: { ...filters, channels: [] },
      });
    }
    if (filters.q)
      relaxOptions.push({ label: t("清除搜尋字詞", "Clear search"), next: { ...filters, q: "" } });
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
        <h1 id="explorer-heading">{t("香港路跑時間表", "Hong Kong race calendar")}</h1>
      </header>
      <div className="calendar-search-bar" ref={searchBar}>
        <label className="calendar-keyword">
          <span className="sr-only">{t("搜尋賽事", "Search races")}</span>
          <span className="search-box">
            <Icon name="search" size={21} />
            <input
              type="search"
              value={filters.q}
              maxLength={200}
              onChange={(e) => field("q", e.target.value)}
              placeholder={t("賽事名或地點", "Race name or venue")}
              enterKeyHint="search"
            />
          </span>
        </label>
        <button
          type="button"
          className="calendar-filter-toggle"
          aria-haspopup="dialog"
          aria-expanded={filtersExpanded}
          aria-controls="calendar-filter-panel"
          onClick={() => setFiltersExpanded(!filtersExpanded)}
        >
          <Icon name="filter" size={18} /> {t("篩選", "Filters")}
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
        <FilterPanel
          className="calendar-filter-panel"
          id="calendar-filter-panel"
          data-expanded={filtersExpanded}
          aria-label={filtersExpanded ? undefined : t("賽事篩選", "Race filters")}
          aria-labelledby={filtersExpanded ? "calendar-filter-title" : undefined}
          onClose={(event) => {
            const panel = event.currentTarget;
            setFiltersExpanded(false);
            if (!(panel instanceof HTMLDialogElement) || panel.returnValue !== "results") return;
            window.requestAnimationFrame(() => {
              resultsCount.current?.focus({ preventScroll: true });
              document
                .getElementById("results-toolbar")
                ?.scrollIntoView({ block: "start", behavior: "instant" });
            });
          }}
        >
          {filtersExpanded && <CalendarSheetDismiss english={english} />}
          <div
            className="filter-card search-engine"
            onKeyDown={(event) => {
              if (event.key !== "Escape" || filtersExpanded || !filterCategory) return;
              event.preventDefault();
              setFilterCategory(null);
              categoryButtons.current[filterCategory]?.focus();
            }}
          >
            <div className="calendar-filter-heading">
              {filtersExpanded ? (
                <>
                  <Icon name="filter" size={18} />
                  <h2 id="calendar-filter-title">{t("篩選條件", "Filters")}</h2>
                </>
              ) : (
                <div
                  className="calendar-filter-categories"
                  role="group"
                  aria-label={t("篩選條件", "Filters")}
                >
                  {filterCategories(t).map(([key, label]) => (
                    <button
                      key={key}
                      ref={(button) => {
                        if (button) categoryButtons.current[key] = button;
                        else delete categoryButtons.current[key];
                      }}
                      type="button"
                      aria-expanded={filterCategory === key}
                      aria-controls="calendar-category-options"
                      data-active={categoryCounts[key] > 0}
                      onClick={(event) => {
                        const next = filterCategory === key ? null : key;
                        setFilterCategory(next);
                        if (next && event.detail === 0) {
                          window.requestAnimationFrame(() => categoryOptions.current?.focus());
                        }
                      }}
                    >
                      {label}
                      {categoryCounts[key] > 0 && (
                        <span className="calendar-category-count">
                          <span className="sr-only">{t("已選", "Selected")} </span>
                          {categoryCounts[key]}
                        </span>
                      )}
                      <span className="calendar-category-chevron" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="calendar-reset-filters"
                onClick={() => {
                  setFilterCategory(null);
                  setCustomDates(false);
                  changeSavedOnly(false, defaultFilters);
                }}
              >
                {t("重置條件", "Reset filters")}
              </button>
            </div>
            <div
              className="engine-options"
              id="calendar-category-options"
              ref={categoryOptions}
              role={filtersExpanded ? undefined : "group"}
              aria-label={
                filtersExpanded
                  ? undefined
                  : filterCategories(t).find(([key]) => key === filterCategory)?.[1]
              }
              tabIndex={filtersExpanded ? undefined : -1}
              hidden={!filtersExpanded && !filterCategory}
            >
              <div hidden={!filtersExpanded && filterCategory !== "date"}>
                <div
                  className="engine-option-row"
                  role="group"
                  aria-label={t("比賽日期", "Race date")}
                >
                  {filtersExpanded && (
                    <span className="engine-label">{t("比賽日期", "Race date")}</span>
                  )}
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
                      {t("指定時間", "Custom dates")}
                    </button>
                    <label className="engine-month">
                      <span className="sr-only">{t("月份", "Month")}</span>
                      <select
                        aria-label={t("月份", "Month")}
                        value={filters.month}
                        onChange={(e) => field("month", e.target.value)}
                      >
                        <option value="">{t("月份", "Month")}</option>
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                          <option key={month} value={String(month)}>
                            {english
                              ? new Intl.DateTimeFormat("en", {
                                  month: "short",
                                  timeZone: "UTC",
                                }).format(new Date(Date.UTC(2026, Number(month) - 1, 1)))
                              : `${month}月`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                {showCustomDates && (
                  <fieldset className="date-inputs engine-dates" id="custom-dates">
                    <legend>{t("指定日期範圍", "Custom date range")}</legend>
                    <label>
                      <span>{t("開始日期", "Start date")}</span>
                      <input
                        aria-label={t("開始日期", "Start date")}
                        type="date"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? dateErrorId : undefined}
                        value={filters.from}
                        onChange={(e) => update({ ...filters, from: e.target.value, view: "all" })}
                      />
                    </label>
                    <span aria-hidden="true">{t("至", "to")}</span>
                    <label>
                      <span>{t("結束日期", "End date")}</span>
                      <input
                        aria-label={t("結束日期", "End date")}
                        type="date"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? dateErrorId : undefined}
                        value={filters.to}
                        onChange={(e) => update({ ...filters, to: e.target.value, view: "all" })}
                      />
                    </label>
                    {error && (
                      <p
                        className="calendar-date-range-error"
                        id="calendar-date-range-error"
                        role="alert"
                      >
                        {englishRaceTerm(error, english)}
                      </p>
                    )}
                    {!error && (filters.from || filters.to) && (
                      <p className="calendar-date-range-summary" role="status">
                        {filters.from &&
                          (english
                            ? englishDate(filters.from)
                            : displayDate(filters.from, { year: "numeric" }))}
                        {filters.from && filters.to && " "}
                        {filters.to &&
                          (english
                            ? `to ${englishDate(filters.to)}`
                            : `至 ${displayDate(filters.to, { year: "numeric" })}`)}
                        {!filters.to && t("起", " onwards")}
                      </p>
                    )}
                  </fieldset>
                )}
              </div>
              <div
                className="engine-option-row"
                role="group"
                aria-label={t("地點", "Location")}
                hidden={!filtersExpanded && filterCategory !== "location"}
              >
                {filtersExpanded && <span className="engine-label">{t("地點", "Location")}</span>}
                <div className="option-row option-row-checkmarks">
                  {regions.map((region, index) => (
                    <button
                      key={region}
                      aria-pressed={filters.regions.includes(region)}
                      onClick={() => toggle("regions", region)}
                    >
                      {english
                        ? (
                            {
                              港島: "Hong Kong Island",
                              九龍: "Kowloon",
                              新界: "New Territories",
                              離島: "Outlying Islands",
                            } as const
                          )[region]
                        : region === "港島"
                          ? "香港島"
                          : region}
                      {optionCounts && (
                        <FilterOptionCount english={english} count={optionCounts.regions[index]} />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="engine-option-row"
                role="group"
                aria-label={t("距離", "Distance")}
                hidden={!filtersExpanded && filterCategory !== "distance"}
              >
                {filtersExpanded && <span className="engine-label">{t("距離", "Distance")}</span>}
                <div className="option-row option-row-checkmarks">
                  {distanceOptions.map((distance, index) => (
                    <button
                      key={distance}
                      aria-pressed={filters.distances.includes(distance)}
                      onClick={() => toggle("distances", distance)}
                    >
                      {english ? englishDistanceTag(distance) : distance}
                      {optionCounts && (
                        <FilterOptionCount
                          english={english}
                          count={optionCounts.distances[index]}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="engine-option-row"
                role="group"
                aria-label={t("報名狀態", "Entry status")}
                hidden={!filtersExpanded && filterCategory !== "registration"}
              >
                {filtersExpanded && (
                  <span className="engine-label">{t("報名狀態", "Entry status")}</span>
                )}
                <div className="option-row">
                  <button
                    aria-pressed={acceptingOnly}
                    onClick={() => field("statuses", acceptingOnly ? [] : ["open"])}
                  >
                    {t("接受申請", "Accepting entries")}
                  </button>
                </div>
              </div>
              <div
                className="engine-option-row"
                role="group"
                aria-label={t("賽事類型", "Race type")}
                hidden={!filtersExpanded && filterCategory !== "type"}
              >
                {filtersExpanded && (
                  <span className="engine-label">{t("賽事類型", "Race type")}</span>
                )}
                <div className="option-row option-row-checkmarks">
                  <button
                    aria-pressed={filters.themed}
                    onClick={() => update({ ...filters, themed: !filters.themed, family: false })}
                  >
                    {t("主題跑", "Themed races")}
                  </button>
                </div>
              </div>
              <div
                className="engine-option-row"
                role="group"
                aria-label={t("賽事難易度", "Race difficulty")}
                hidden={!filtersExpanded && filterCategory !== "difficulty"}
                aria-describedby="difficulty-note"
              >
                {filtersExpanded && (
                  <span className="engine-label">{t("賽事難易度", "Race difficulty")}</span>
                )}
                <div className="option-row">
                  {["困難", "適中", "容易"].map((difficulty) => (
                    <button key={englishRaceTerm(difficulty, english)} disabled>
                      {englishRaceTerm(difficulty, english)}
                    </button>
                  ))}
                </div>
                <small id="difficulty-note">
                  {t("正式難易度評級推出後開放", "Available when difficulty ratings are published")}
                </small>
              </div>
            </div>
          </div>
          {filtersExpanded && (
            <form method="dialog" className="calendar-sheet-footer">
              <button type="submit" value="results" className="calendar-apply-filters">
                {t(`顯示 ${results.length} 場賽事`, `Show ${results.length} races`)}{" "}
                <Icon name="arrow" size={18} />
              </button>
            </form>
          )}
        </FilterPanel>
        <div className="calendar-results">
          {error && !filtersExpanded && (
            <p className="error-message" id="calendar-filter-error" role="alert">
              {englishRaceTerm(error, english)}
            </p>
          )}
          <div className="results-toolbar" id="results-toolbar" tabIndex={-1}>
            <div
              className="calendar-view-tabs"
              role="group"
              aria-label={t("賽事快捷篩選", "Quick race filters")}
            >
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
              {t("共 ", "")}
              <strong>{results.length}</strong> {t("場", results.length === 1 ? "race" : "races")}
            </span>
            <div className="results-actions">
              <label className="calendar-sort">
                <span>{t("排序", "Sort")}</span>
                <select
                  aria-label={t("排序方式", "Sort order")}
                  value={filters.sort}
                  onChange={(e) => field("sort", e.target.value as Filters["sort"])}
                >
                  <option value="date">{t("按比賽日期", "Race date")}</option>
                  <option value="deadline">{t("按報名截止", "Entry deadline")}</option>
                  <option value="recent">{t("按最近更新", "Recently updated")}</option>
                </select>
              </label>
              <button
                type="button"
                className="share-button"
                onClick={share}
                aria-label={t("分享篩選", "Share filters")}
                data-copied={copyState === "copied"}
              >
                {copyState === "copied" ? (
                  <>
                    {t("已複製", "Copied")} <Icon name="check" size={16} />
                  </>
                ) : copyState === "manual" ? (
                  t("請複製網址", "Copy the URL")
                ) : (
                  t("分享篩選 ↗", "Share filters ↗")
                )}
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
              ? t("已複製篩選連結", "Filter link copied")
              : copyState === "manual"
                ? t(
                    "請複製瀏覽器網址，當中已保留篩選條件。",
                    "Copy the address from your browser to share these filters.",
                  )
                : ""}
          </span>
          {!ready && (
            <p className="sr-only">{t("正在載入你的篩選條件。", "Loading your filters.")}</p>
          )}
          <div className="race-results-layout" ref={resultsPanel}>
            <div className="race-results-main">
              <div className="race-list">
                {visibleResults.length > 0 && (
                  <div
                    className="calendar-row-head"
                    role="group"
                    aria-label={t("賽事列表欄位", "Race list columns")}
                  >
                    <span>{t("賽事／起點", "Race / Start")}</span>
                    <span>{t("比賽日", "Race day")}</span>
                    <span>{t("距離", "Distance")}</span>
                    <span>{t("報名概況", "Registration")}</span>
                    <button
                      type="button"
                      aria-pressed={filters.sort === "deadline"}
                      onClick={() => field("sort", "deadline")}
                    >
                      {t("最近截止", "Next deadline")}{" "}
                      {filters.sort === "deadline" && <span aria-hidden="true">↑</span>}
                    </button>
                    <span>{t("推薦指數", "Runner rating")}</span>
                    <span>{t("收藏", "Save")}</span>
                  </div>
                )}
                {visibleResults.map(({ race, groups }, index) => {
                  const detailHref = localPath(filteredRaceHref(race, groups, filters), english);
                  const deadline = listDeadline(race, groups, now, english);
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
                          if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
                            return;
                          const returnHref = resultsHref(filters, race.id, pagination.page);
                          window.history.replaceState(
                            window.history.state,
                            "",
                            localPath(returnHref, english),
                          );
                          try {
                            sessionStorage.setItem("rundates:results", returnHref);
                          } catch {
                            /* The list URL remains shareable when storage is unavailable. */
                          }
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
                            {[...new Set(groups.map((group) => group.date))]
                              .sort()
                              .map((date, index) => (
                                <Fragment key={date}>
                                  {index > 0 && " ／ "}
                                  <time dateTime={date}>
                                    {english ? englishDate(date) : date.replaceAll("-", "/")}
                                  </time>
                                </Fragment>
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
                          {listRegistration(race, groups, now, english)}
                        </p>
                        <div className="calendar-race-deadline" data-empty={!deadline}>
                          {deadline ? (
                            <>
                              <span className="sr-only">
                                {t("最近已核實報名截止：", "Next verified entry deadline:")}
                              </span>
                              <strong>
                                <time dateTime={deadline.date}>
                                  {english
                                    ? deadline.date.length > 10
                                      ? englishTimestamp(deadline.date)
                                      : englishDate(deadline.date)
                                    : deadline.label}
                                </time>
                              </strong>
                              <span>{deadline.scope}</span>
                            </>
                          ) : (
                            <span
                              aria-label={t("暫無已核實截止日期", "No verified entry deadline")}
                            >
                              —
                            </span>
                          )}
                        </div>
                        <RaceOverallRating
                          english={english}
                          race={race}
                          groups={groups}
                          reviews={reviews}
                        />
                        <FavoriteButton
                          english={english}
                          compact
                          race={english ? { id: race.id, name: race.englishName } : race}
                          onRemove={
                            savedOnly
                              ? (keyboard) => {
                                  setUndoPaused(false);
                                  setUndoError(false);
                                  setUndoMessage(
                                    t(
                                      `已移除收藏：${race.name}`,
                                      `Removed from saved races: ${race.englishName}`,
                                    ),
                                  );
                                  setRemoved({
                                    id: race.id,
                                    name: english ? race.englishName : race.name,
                                    keyboard,
                                  });
                                }
                              : undefined
                          }
                        />
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
                    {filters.countries.length &&
                    !races.some((race) => filters.countries.includes(race.country ?? "香港"))
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
                      {t("查看全部賽事", "View all races")} <Icon name="arrow" />
                    </button>
                  </div>
                </div>
              )}
              <div className="results-footer">
                <span role="status" aria-live="polite">
                  {t(
                    `顯示第 ${pagination.from} 至 ${pagination.to} 場，共 ${results.length} 場`,
                    `Showing ${pagination.from}–${pagination.to} of ${results.length} races`,
                  )}
                </span>
                <a
                  href="#race-list"
                  onClick={(event) => {
                    if (!window.matchMedia("(max-width: 767px)").matches) return;
                    event.preventDefault();
                    setFiltersExpanded(true);
                  }}
                >
                  {t("返回篩選 ↑", "Back to filters ↑")}
                </a>
              </div>
              {pagination.pages > 1 && (
                <nav
                  className="race-pagination"
                  aria-label={t("賽事列表分頁", "Race list pagination")}
                >
                  <button
                    className="button"
                    disabled={pagination.page === 1}
                    onClick={() => changePage(pagination.page - 1)}
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
                    onClick={() => changePage(pagination.page + 1)}
                  >
                    {t("下一頁", "Next")}
                  </button>
                </nav>
              )}
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only" role="status">
        {undoMessage}
      </span>
      <div className="calendar-floating">
        <RaceBackToSearch english={english} searchBar={searchBar} />
        {removed && (
          <div
            className="calendar-undo"
            onFocus={() => setUndoPaused(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setUndoPaused(false);
            }}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") setUndoPaused(true);
            }}
            onPointerLeave={(event) => {
              if (
                event.pointerType === "mouse" &&
                !event.currentTarget.contains(document.activeElement)
              ) {
                setUndoPaused(false);
              }
            }}
          >
            <span>
              {undoError
                ? t("未能復原收藏，請再試。", "Could not restore the saved race. Try again.")
                : t(`已移除收藏：${removed.name}`, `Removed from saved races: ${removed.name}`)}
            </span>
            <button
              type="button"
              ref={undoButton}
              onClick={(event) => {
                if (favorites.toggle(removed.id, true) !== true) {
                  setUndoError(true);
                  setUndoMessage(
                    t("未能復原收藏，請再試。", "Could not restore the saved race. Try again."),
                  );
                  return;
                }
                setUndoMessage(
                  t(`已復原收藏：${removed.name}`, `Restored to saved races: ${removed.name}`),
                );
                dismissUndo(event.detail === 0);
              }}
            >
              {t("復原", "Undo")}
            </button>
            <button
              type="button"
              aria-label={t("關閉收藏提示", "Dismiss save notification")}
              onClick={(event) => dismissUndo(event.detail === 0)}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
