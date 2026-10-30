"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdSlot, Icon } from "./ui";
import {
  defaultFilters,
  hongKongToday,
  displayDate,
  distanceLabel,
  filterError,
  parseFilters,
  selectRaces,
  serializeFilters,
} from "@/lib/races";
import {
  dateShortcutIsActive,
  toggleDateShortcut,
  type DateShortcut,
} from "@/lib/filter-shortcuts";
import { groupLocations } from "@/lib/group-locations";
import { raceHref } from "@/lib/site";
import { resultsHref } from "@/lib/results-location";
import {
  distanceOptions,
  channelTypeLabels,
  countries,
  registrationLabels,
  type Filters,
  type Race,
} from "@/lib/types";

function monthLabel(date: string) {
  return `${date.slice(0, 4)} 年 ${Number(date.slice(5, 7))} 月`;
}

export function RaceExplorer({ races, initialNow }: { races: Race[]; initialNow: string }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [now, setNow] = useState(initialNow);
  const [ready, setReady] = useState(false);
  const [customDates, setCustomDates] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  useEffect(() => {
    const sync = () => {
      const next = parseFilters(new URLSearchParams(window.location.search));
      setFilters(next);
      try {
        window.sessionStorage.setItem("rundates:results", resultsHref(next));
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
    setCopyMessage("");
    const query = serializeFilters(next);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );
    try {
      window.sessionStorage.setItem("rundates:results", resultsHref(next));
    } catch {
      /* Sharing and browser back remain available without storage. */
    }
  }
  useEffect(() => {
    if (!ready || !/^#race-[a-z0-9-]+$/.test(window.location.hash)) return;
    const frame = window.requestAnimationFrame(() => {
      const row = document.getElementById(window.location.hash.slice(1));
      row?.scrollIntoView({ block: "start" });
      row?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [ready]);
  function field<K extends keyof Filters>(key: K, value: Filters[K]) {
    update({ ...filters, [key]: value });
  }
  function toggle(
    key: "distances" | "countries" | "regions" | "statuses" | "channels",
    value: string,
  ) {
    const values: string[] = filters[key];
    update({
      ...filters,
      [key]: values.includes(value) ? values.filter((x) => x !== value) : [...values, value],
    });
  }
  function quickDate(kind: DateShortcut) {
    setCustomDates(false);
    update({ ...toggleDateShortcut(filters, kind, now), view: "all" });
  }
  const results = useMemo(() => selectRaces(races, filters, now), [races, filters, now]);
  const calendarYear = Number(hongKongToday(new Date(now)).slice(0, 4));
  const yearActive = dateShortcutIsActive(filters, "year", now);
  const nextYearActive = dateShortcutIsActive(filters, "next-year", now);
  const showCustomDates =
    customDates || (!!(filters.from || filters.to) && !yearActive && !nextYearActive);
  const error = filterError(filters);
  const chips: { label: string; remove: () => void }[] = [
    ...(filters.family ? [{ label: "親子同樂", remove: () => field("family", false) }] : []),
    ...(filters.q ? [{ label: `搜尋：${filters.q}`, remove: () => field("q", "") }] : []),
    ...(filters.from || filters.to
      ? [
          {
            label: `${filters.from || "不限起日"} → ${filters.to || "不限止日"}`,
            remove: () => update({ ...filters, from: "", to: "" }),
          },
        ]
      : []),
    ...(filters.month ? [{ label: `${filters.month}月`, remove: () => field("month", "") }] : []),
    ...filters.distances.map((x) => ({ label: x, remove: () => toggle("distances", x) })),
    ...filters.countries.map((x) => ({ label: x, remove: () => toggle("countries", x) })),
    ...filters.regions.map((x) => ({ label: x, remove: () => toggle("regions", x) })),
    ...filters.channels.map((x) => ({
      label: channelTypeLabels[x],
      remove: () => toggle("channels", x),
    })),
    ...filters.statuses.map((x) => ({
      label: registrationLabels[x],
      remove: () => toggle("statuses", x),
    })),
    ...(filters.min || filters.max
      ? [
          {
            label: `${filters.min || "0"}–${filters.max || "不限"} km`,
            remove: () => update({ ...filters, min: "", max: "" }),
          },
        ]
      : []),
  ];
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyMessage("已複製篩選連結");
    } catch {
      setCopyMessage("請複製瀏覽器網址，當中已保留篩選條件。");
    }
  }
  return (
    <section id="race-list" className="explorer shell" aria-labelledby="explorer-heading">
      <div className="section-heading explorer-heading">
        <h1 id="explorer-heading">賽事搜尋／時間表</h1>
      </div>
      <div className="filter-card search-engine">
        <div className="search-row">
          <label className="search-box">
            <Icon name="search" size={21} />
            <span className="sr-only">搜尋比賽、地點或主辦方</span>
            <input
              type="search"
              value={filters.q}
              maxLength={200}
              onChange={(e) => field("q", e.target.value)}
              placeholder="搜尋賽事、地點或主辦方"
            />
          </label>
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
                  value={filters.to}
                  onChange={(e) => update({ ...filters, to: e.target.value, view: "all" })}
                />
              </label>
            </div>
          )}
          <div className="engine-option-row" role="group" aria-label="國家／地區">
            <span className="engine-label">國家／地區</span>
            <div className="option-row">
              {countries.map((country) => (
                <button
                  key={country}
                  aria-pressed={filters.countries.includes(country)}
                  onClick={() => toggle("countries", country)}
                >
                  {country}
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
        </div>
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      {!!chips.length && (
        <div className="selected-filters">
          <span>已選條件</span>
          {chips.map((chip, i) => (
            <button
              key={`${chip.label}-${i}`}
              onClick={chip.remove}
              aria-label={`移除${chip.label}`}
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button
            className="clear-all"
            onClick={() => {
              setCustomDates(false);
              update({ ...defaultFilters });
            }}
          >
            清除全部
          </button>
        </div>
      )}
      <div className="results-toolbar" id="results-toolbar" tabIndex={-1}>
        <div className="view-tabs" role="group" aria-label="賽事時段">
          {[
            ["upcoming", "即將舉行"],
            ["past", "歷屆賽事"],
            ["all", "全部"],
          ].map(([key, label]) => (
            <button
              key={key}
              aria-pressed={filters.view === key}
              onClick={() => field("view", key as Filters["view"])}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="results-actions">
          <span role="status" aria-live="polite">
            共 <strong>{results.length}</strong> 場
          </span>
          <label>
            <span className="sr-only">排序方式</span>
            <select
              value={filters.sort}
              onChange={(e) => field("sort", e.target.value as Filters["sort"])}
            >
              <option value="date">按比賽日期</option>
              <option value="deadline">按報名截止</option>
              <option value="recent">按最近更新</option>
            </select>
          </label>
          <button className="share-button" onClick={share}>
            分享篩選 ↗
          </button>
        </div>
      </div>
      {copyMessage && (
        <p className="copy-message" role="status">
          {copyMessage}
        </p>
      )}
      {!ready && <p className="sr-only">正在載入你的篩選條件。</p>}
      <div className="race-results-layout">
        <div className="race-results-main">
          <div className="race-list">
            {results.map(({ race, groups }, index) => {
              const month = race.date.slice(0, 7);
              const previousMonth = results[index - 1]?.race.date.slice(0, 7);
              return (
                <Fragment key={race.id}>
                  {filters.sort === "date" && month !== previousMonth && (
                    <div className="month-divider">
                      <span>{monthLabel(race.date)}</span>
                      <i />
                    </div>
                  )}
                  <article
                    className="calendar-race-card"
                    id={`race-${race.id}`}
                    tabIndex={-1}
                    onClickCapture={(event) => {
                      const anchor = (event.target as HTMLElement).closest("a");
                      if (!anchor?.getAttribute("href")?.startsWith(raceHref(race))) return;
                      try {
                        sessionStorage.setItem("rundates:results", resultsHref(filters, race.id));
                      } catch {
                        /* The list URL remains shareable when storage is unavailable. */
                      }
                    }}
                  >
                    <div className="calendar-race-content">
                      <h2>
                        <Link href={raceHref(race)}>{race.name}</Link>
                      </h2>
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
                        {[
                          ...new Set(race.groups.map((group) => distanceLabel(group.distanceKm))),
                        ].map((distance) => (
                          <li key={distance}>{distance}</li>
                        ))}
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
                                  {displayDate(date, {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                    weekday: "short",
                                  })}
                                </time>
                              </Fragment>
                            ))}
                        </span>
                      </p>
                    </div>
                    <Link
                      className="button button-coral calendar-race-detail"
                      href={raceHref(race)}
                      aria-label={`${race.name}：詳細資料`}
                    >
                      詳細資料 <Icon name="arrow" size={20} />
                    </Link>
                  </article>
                  {index === 5 && results.length > 7 && <AdSlot />}
                </Fragment>
              );
            })}
          </div>
          {!results.length && (
            <div className="empty-state">
              <Icon name="search" size={36} />
              <h3>{error ? "調整一下篩選範圍" : "暫時搵唔到符合條件嘅賽事"}</h3>
              <p>
                {filters.countries.length &&
                !races.some((race) => filters.countries.includes(race.country ?? "香港"))
                  ? `暫時未收錄${filters.countries.join("、")}賽事。試下其他國家／地區。`
                  : "試下放寬日期、移除部分條件，或者切換「全部」。"}
              </p>
              <button
                className="button button-dark"
                onClick={() => update({ ...defaultFilters, view: "all" })}
              >
                查看全部賽事 <Icon name="arrow" />
              </button>
            </div>
          )}
          <div className="results-footer">
            <span>顯示全部 {results.length} 場符合條件嘅賽事</span>
            <a href="#race-list">返回篩選 ↑</a>
          </div>
        </div>
      </div>
    </section>
  );
}
