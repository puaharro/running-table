"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { language } from "@/lib/english-races";
import { Icon } from "./ui";
import { defaultFilters, filterError, selectRaces } from "@/lib/races";
import { toggleDateShortcut, type DateShortcut } from "@/lib/filter-shortcuts";
import { orderByListedDeadline, orderSavedResults, paginateResults } from "@/lib/list-view";
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
import type { EditorialReview } from "@/lib/editorial-reviews";
import { distanceOptions, regions, type Filters, type Race } from "@/lib/types";

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
          <RaceResultsList
            english={english}
            filters={filters}
            now={now}
            ready={ready}
            reviews={reviews}
            savedOnly={savedOnly}
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
                label: relaxOption.label,
                onClick: () => {
                  if (!relaxOption.next.from && !relaxOption.next.to) setCustomDates(false);
                  update(relaxOption.next);
                  resultsCount.current?.focus({ preventScroll: true });
                },
              }
            }
            onSortByDeadline={() => field("sort", "deadline")}
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
