"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { language } from "@/lib/english-races";
import { calendarRegistrationLabels } from "@/lib/list-registration";
import { Icon } from "./ui";
import { defaultFilters, filterError } from "@/lib/races";
import { toggleDateShortcut, type DateShortcut } from "@/lib/filter-shortcuts";
import {
  activeCalendarFilterCount,
  calendarFilterRelaxation,
  calendarOptionCounts,
  calendarResults,
  paginateResults,
} from "@/lib/list-view";
import {
  rememberResultsHref,
  replaceResultsHref,
  resultsAnchorRaceId,
  resultsEntry,
  resultsHref,
} from "@/lib/results-location";
import { useFavorites } from "./race-save";
import { RaceBackToSearch } from "./race-back-to-search";
import { RaceFilterPanel, type FilterCategory } from "./race-filter-panel";
import { RaceResultsList } from "./race-results-list";
import { CalendarActiveFilters } from "./calendar-active-filters";
import type { Filters, Race } from "@/lib/types";

export function RaceExplorer({
  races,
  initialNow,
  english = false,
}: {
  races: Race[];
  initialNow: string;
  english?: boolean;
}) {
  const t = language(english);
  const reduceMotion = useReducedMotion();
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [instantQuickView, setInstantQuickView] = useState(false);
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
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const dismissFilters = useCallback(() => setFiltersExpanded(false), []);
  useEffect(() => {
    const sync = () => {
      const {
        filters: next,
        savedOnly: requestedSaved,
        page: nextPage,
      } = resultsEntry(new URLSearchParams(window.location.search));
      if (requestedSaved) {
        // Consume the entry command; sharing keeps only ordinary list filters.
        changeSavedOnly(true, next);
        return;
      }
      setFilters(next);
      setPage(nextPage);
      rememberResultsHref(resultsHref(next, resultsAnchorRaceId(window.location.hash), nextPage));
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
    replaceResultsHref(resultsHref(next), english);
  }
  useEffect(() => {
    const raceId = resultsAnchorRaceId(window.location.hash);
    if (!ready || !raceId) return;
    const frame = window.requestAnimationFrame(() => {
      const row = document.getElementById(`race-${raceId}`);
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
  const results = useMemo(
    () => calendarResults(searchableRaces, filters, now, savedOnly),
    [searchableRaces, filters, now, savedOnly],
  );
  const showOptionCounts =
    filtersExpanded || filterCategory === "location" || filterCategory === "distance";
  const optionCounts = useMemo(
    () => (showOptionCounts ? calendarOptionCounts(searchableRaces, filters, now) : null),
    [showOptionCounts, searchableRaces, filters, now],
  );
  const pagination = paginateResults(results, page);
  useEffect(() => {
    if (!ready || (savedOnly && !favorites.ready) || page === pagination.page) return;
    setPage(pagination.page);
    replaceResultsHref(resultsHref(filters, undefined, pagination.page), english);
  }, [ready, savedOnly, favorites.ready, page, pagination.page, filters, english]);
  function changePage(next: number) {
    const target = paginateResults(results, next).page;
    setPage(target);
    shareRequest.current += 1;
    setCopyState(null);
    replaceResultsHref(resultsHref(filters, undefined, target), english);
    window.requestAnimationFrame(() => {
      resultsPanel.current?.scrollIntoView({ block: "start", behavior: "instant" });
      resultsCount.current?.focus({ preventScroll: true });
    });
  }
  const resultsPanel = useRef<HTMLDivElement>(null);
  function rememberRacePosition(raceId: string) {
    replaceResultsHref(resultsHref(filters, raceId, pagination.page), english);
  }
  function recordRemovedFavorite(race: Race, keyboard: boolean) {
    setUndoPaused(false);
    setUndoError(false);
    setUndoMessage(t(`已移除收藏：${race.name}`, `Removed from saved races: ${race.englishName}`));
    setRemoved({ id: race.id, name: english ? race.englishName : race.name, keyboard });
  }
  const error = filterError(filters);
  const activeFilterCount = activeCalendarFilterCount(filters);
  const acceptingOnly = filters.statuses.length === 1 && filters.statuses[0] === "open";
  const selectedView = savedOnly
    ? "saved"
    : acceptingOnly && filters.view === "upcoming"
      ? "open"
      : filters.view;
  const quickViews = [
    ["upcoming", t("即將舉行", "Upcoming")],
    ["open", t(calendarRegistrationLabels.open, "Accepting entries")],
    ["saved", t("我的收藏", "Saved races")],
    ["all", t("全部", "All")],
  ] as const;
  const relaxOption = results.length ? undefined : calendarFilterRelaxation(races, filters, now);
  const relaxLabels = {
    month: t("取消月份", "Remove month"),
    date: t("取消日期範圍", "Remove date range"),
    location: t("取消地點限制", "Remove location filter"),
    distance: t("取消距離限制", "Remove distance filter"),
    themed: t("取消主題跑限制", "Remove themed race filter"),
    family: t("取消組別限制", "Remove category filter"),
    status: t("取消報名狀態限制", "Remove entry status filter"),
    channel: t("取消報名渠道限制", "Remove entry channel filter"),
    query: t("清除搜尋字詞", "Clear search"),
  };

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
        <a href="#race-directory" className="text-link">
          {t("全部賽事及往屆紀錄", "All races and past editions")}
        </a>
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
        <RaceFilterPanel
          english={english}
          filters={filters}
          now={now}
          filtersExpanded={filtersExpanded}
          filterCategory={filterCategory}
          customDates={customDates}
          error={error}
          acceptingOnly={acceptingOnly}
          optionCounts={optionCounts}
          resultCount={results.length}
          setFilterCategory={setFilterCategory}
          setCustomDates={setCustomDates}
          update={update}
          field={field}
          toggle={toggle}
          quickDate={quickDate}
          onDismiss={dismissFilters}
          onReset={() => {
            setFilterCategory(null);
            setCustomDates(false);
            changeSavedOnly(false, defaultFilters);
          }}
          onShowResults={() => {
            window.requestAnimationFrame(() => {
              resultsCount.current?.focus({ preventScroll: true });
              document
                .getElementById("results-toolbar")
                ?.scrollIntoView({ block: "start", behavior: "instant" });
            });
          }}
        />
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
              <LayoutGroup>
                {quickViews.map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    data-entry-status={key === "open" ? "open" : undefined}
                    aria-pressed={selectedView === key}
                    onClick={(event) => {
                      setInstantQuickView(event.detail === 0);
                      changeSavedOnly(key === "saved", {
                        ...filters,
                        view: key === "open" ? "upcoming" : key === "saved" ? "all" : key,
                        statuses:
                          key === "open"
                            ? ["open"]
                            : filters.statuses.filter((status) => status !== "open"),
                      });
                    }}
                  >
                    {selectedView === key && (
                      <motion.span
                        aria-hidden="true"
                        className="calendar-view-indicator"
                        layoutId={ready && !reduceMotion ? "calendar-view-indicator" : undefined}
                        transition={{
                          layout: instantQuickView
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 480, damping: 32, mass: 0.65 },
                        }}
                      />
                    )}
                    <span className="calendar-view-label">{label}</span>
                  </button>
                ))}
              </LayoutGroup>
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
          <CalendarActiveFilters
            english={english}
            filters={filters}
            onRemove={(patch) => {
              if (patch.from === "" && patch.to === "") setCustomDates(false);
              update({ ...filters, ...patch });
              resultsCount.current?.focus({ preventScroll: true });
            }}
          />
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
          <RaceResultsList
            english={english}
            filters={filters}
            now={now}
            ready={ready}
            savedOnly={savedOnly}
            highlightDeadlines={acceptingOnly && !savedOnly}
            error={error}
            noListedCountry={
              filters.countries.length > 0 &&
              !races.some((race) => filters.countries.includes(race.country ?? "香港"))
            }
            total={results.length}
            pagination={pagination}
            resultsPanel={resultsPanel}
            relaxOption={
              relaxOption && {
                label: relaxLabels[relaxOption.kind],
                onClick: () => {
                  if (!relaxOption.next.from && !relaxOption.next.to) setCustomDates(false);
                  update(relaxOption.next);
                  resultsCount.current?.focus({ preventScroll: true });
                },
              }
            }
            onSort={(sort) => field("sort", sort)}
            onOpenRace={rememberRacePosition}
            onRemoveFavorite={savedOnly ? recordRemovedFavorite : undefined}
            onViewAll={() => {
              setCustomDates(false);
              changeSavedOnly(false);
              update({ ...defaultFilters, view: "all" });
              resultsCount.current?.focus({ preventScroll: true });
            }}
            onOpenFilters={() => setFiltersExpanded(true)}
            onChangePage={changePage}
          />
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
