"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdSlot, Icon } from "./ui";
import {
  defaultFilters,
  displayDate,
  formatTimestamp,
  distanceLabel,
  filterError,
  groupStatus,
  hongKongToday,
  parseFilters,
  selectRaces,
  serializeFilters,
  statusSummary,
} from "@/lib/races";
import { raceHref } from "@/lib/site";
import {
  distanceOptions,
  regions,
  registrationLabels,
  type Filters,
  type Race,
  type RegistrationStatus,
} from "@/lib/types";

function monthLabel(date: string) {
  return `${date.slice(0, 4)} 年 ${Number(date.slice(5, 7))} 月`;
}
function dateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function RaceExplorer({ races, initialNow }: { races: Race[]; initialNow: string }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [now, setNow] = useState(initialNow);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  useEffect(() => {
    const sync = () => {
      const next = parseFilters(new URLSearchParams(window.location.search));
      setFilters(next);
      const query = serializeFilters(next);
      try {
        window.sessionStorage.setItem("rundates:results", `/${query ? `?${query}` : ""}#race-list`);
      } catch {
        /* Browser back remains available. */
      }
    };
    sync();
    setExpanded(window.matchMedia("(min-width: 768px)").matches);
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
      window.sessionStorage.setItem("rundates:results", `/${query ? `?${query}` : ""}#race-list`);
    } catch {
      /* Sharing and browser back remain available without storage. */
    }
  }
  function showResults() {
    setExpanded(false);
    window.requestAnimationFrame(() => {
      document.getElementById("results-toolbar")?.scrollIntoView({ block: "start" });
    });
  }
  function field<K extends keyof Filters>(key: K, value: Filters[K]) {
    update({ ...filters, [key]: value });
  }
  function toggle(key: "distances" | "regions" | "statuses", value: string) {
    const values: string[] = filters[key];
    update({
      ...filters,
      [key]: values.includes(value) ? values.filter((x) => x !== value) : [...values, value],
    });
  }
  function quickDate(kind: "weekend" | "month" | "next") {
    const today = hongKongToday(new Date(now));
    const current = new Date(`${today}T12:00:00Z`);
    let from = today,
      to = today;
    if (kind === "weekend") {
      current.setUTCDate(
        current.getUTCDate() + (current.getUTCDay() === 0 ? 0 : (6 - current.getUTCDay() + 7) % 7),
      );
      from = dateString(current);
      if (current.getUTCDay() !== 0) current.setUTCDate(current.getUTCDate() + 1);
      to = dateString(current);
    } else {
      const month = current.getUTCMonth() + (kind === "next" ? 1 : 0);
      from = dateString(new Date(Date.UTC(current.getUTCFullYear(), month, 1, 12)));
      to = dateString(new Date(Date.UTC(current.getUTCFullYear(), month + 1, 0, 12)));
    }
    update({ ...filters, from, to, view: "upcoming" });
  }
  const results = useMemo(() => selectRaces(races, filters, now), [races, filters, now]);
  const openCount = races.filter((r) =>
    r.groups.some((g) => groupStatus(r, g, now) === "open"),
  ).length;
  const error = filterError(filters);
  const chips: { label: string; remove: () => void }[] = [
    ...(filters.q ? [{ label: `搜尋：${filters.q}`, remove: () => field("q", "") }] : []),
    ...(filters.from || filters.to
      ? [
          {
            label: `${filters.from || "不限起日"} → ${filters.to || "不限止日"}`,
            remove: () => update({ ...filters, from: "", to: "" }),
          },
        ]
      : []),
    ...filters.distances.map((x) => ({ label: x, remove: () => toggle("distances", x) })),
    ...filters.regions.map((x) => ({ label: x, remove: () => toggle("regions", x) })),
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
        <div>
          <div className="eyebrow">THE RACE CALENDAR</div>
          <h2 id="explorer-heading">賽事月曆</h2>
          <p>揀日期、揀距離，搵到適合自己嘅一場。</p>
        </div>
        <div className="stat-pair">
          <div>
            <strong>{races.length.toString().padStart(2, "0")}</strong>
            <span>場已收錄賽事</span>
          </div>
          <div>
            <strong>{openCount.toString().padStart(2, "0")}</strong>
            <span>場所列渠道開放</span>
          </div>
        </div>
      </div>
      <div className="filter-card">
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
          <button
            className={`filter-toggle ${expanded ? "active" : ""}`}
            aria-expanded={expanded}
            aria-controls="filters"
            onClick={() => setExpanded(!expanded)}
          >
            <Icon name="filter" />
            篩選{chips.length > 0 && <b className="filter-count">{chips.length}</b>}
            <span>{expanded ? "−" : "+"}</span>
          </button>
        </div>
        <div className="quick-row">
          <span>快速搵：</span>
          <button onClick={() => quickDate("weekend")}>今個週末</button>
          <button onClick={() => quickDate("month")}>今個月</button>
          <button onClick={() => quickDate("next")}>下個月</button>
          <button
            className={
              filters.sort === "deadline" && filters.statuses.includes("open") ? "selected" : ""
            }
            onClick={() =>
              update({ ...filters, statuses: ["open"], sort: "deadline", view: "upcoming" })
            }
          >
            即將截止 <span>↗</span>
          </button>
          <button onClick={() => update({ ...filters, q: "親子" })}>親子同樂</button>
        </div>
        <div id="filters" hidden={!expanded}>
          <div className="filter-grid">
            <fieldset className="date-field">
              <legend>
                01 <span>比賽日期</span>
              </legend>
              <div className="date-inputs">
                <label>
                  <span className="sr-only">開始日期</span>
                  <input
                    aria-label="開始日期"
                    type="date"
                    value={filters.from}
                    onChange={(e) => field("from", e.target.value)}
                  />
                </label>
                <span>—</span>
                <label>
                  <span className="sr-only">結束日期</span>
                  <input
                    aria-label="結束日期"
                    type="date"
                    value={filters.to}
                    onChange={(e) => field("to", e.target.value)}
                  />
                </label>
              </div>
            </fieldset>
            <fieldset>
              <legend>
                02 <span>距離／組別</span>
              </legend>
              <div className="option-row">
                {distanceOptions.map((x) => (
                  <button
                    aria-pressed={filters.distances.includes(x)}
                    key={x}
                    onClick={() => toggle("distances", x)}
                  >
                    {x}
                  </button>
                ))}
              </div>
              <details className="custom-range">
                <summary>自訂公里範圍</summary>
                <div className="number-inputs">
                  <input
                    aria-label="最短距離（公里）"
                    type="number"
                    min="0"
                    max="1000"
                    step="any"
                    placeholder="最短 km"
                    value={filters.min}
                    onChange={(e) => field("min", e.target.value)}
                  />
                  <span>–</span>
                  <input
                    aria-label="最長距離（公里）"
                    type="number"
                    min="0"
                    max="1000"
                    step="any"
                    placeholder="最長 km"
                    value={filters.max}
                    onChange={(e) => field("max", e.target.value)}
                  />
                </div>
              </details>
            </fieldset>
            <fieldset>
              <legend>
                03 <span>地區</span>
              </legend>
              <div className="option-row">
                {regions.map((x) => (
                  <button
                    aria-pressed={filters.regions.includes(x)}
                    key={x}
                    onClick={() => toggle("regions", x)}
                  >
                    {x}
                  </button>
                ))}
              </div>
              <small>按賽事起點分類</small>
            </fieldset>
            <fieldset className="sport-field">
              <legend>
                04 <span>運動類別</span>
              </legend>
              <label className="sport-value">
                <input type="checkbox" checked readOnly aria-label="路跑，目前唯一收錄類別" />
                路跑
              </label>
              <small>首階段只收錄路跑</small>
            </fieldset>
            <fieldset className="status-field">
              <legend>
                05 <span>報名狀態</span>
              </legend>
              <div className="option-row">
                {Object.entries(registrationLabels).map(([key, label]) => (
                  <button
                    aria-pressed={filters.statuses.includes(key as RegistrationStatus)}
                    key={key}
                    onClick={() => toggle("statuses", key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="filter-hint">
            <span>條件可組合及多選 · 狀態以個別組別為準</span>
            <button className="filter-reset" onClick={() => update({ ...defaultFilters })}>
              重設條件
            </button>
            <button className="mobile-filter-done" onClick={showResults}>
              查看 {results.length} 場賽事 <Icon name="arrow" size={16} />
            </button>
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
          <button className="clear-all" onClick={() => update({ ...defaultFilters })}>
            清除全部
          </button>
        </div>
      )}
      <div className="results-toolbar" id="results-toolbar">
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
      <p className="data-note">
        <span className="demo-dot" />
        官方來源整理，狀態只對應所列渠道；超過 72 小時未核對會顯示待核實。
        {!ready && <span className="sr-only">正在載入你的篩選條件。</span>}
      </p>
      <div className="race-results-layout">
        <div className="race-results-main">
          <div className="race-list">
            <div className="race-table-head" aria-hidden="true">
              <span>比賽日期</span>
              <span>賽事／組別</span>
              <span>地區／起點</span>
              <span>報名狀態</span>
              <span />
            </div>
            {results.map(({ race, groups }, index) => {
              const summary = statusSummary(race, groups, now);
              const month = race.date.slice(0, 7);
              const previousMonth = results[index - 1]?.race.date.slice(0, 7);
              const deadline = groups
                .filter((g) => groupStatus(race, g, now) === "open" && g.deadline)
                .map((g) => g.registrationClosesAt ?? g.deadline!)
                .sort()[0];
              return (
                <Fragment key={race.id}>
                  {filters.sort === "date" && month !== previousMonth && (
                    <div className="month-divider">
                      <span>{monthLabel(race.date)}</span>
                      <i />
                    </div>
                  )}
                  <article className="race-row">
                    <div className="race-date">
                      <span className="race-date-month">{Number(race.date.slice(5, 7))} 月</span>
                      <strong>{race.date.slice(8)}</strong>
                      <span>
                        {race.date.slice(0, 4)}
                        <small>
                          {displayDate(race.date, {
                            weekday: "short",
                            month: undefined,
                            day: undefined,
                          })}
                        </small>
                      </span>
                      {race.date !== race.endDate && <small className="multi-day">多日</small>}
                    </div>
                    <div className="race-info">
                      <div className="race-tags">
                        <span className="road-tag">路跑</span>
                        {race.tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </div>
                      <h3>
                        <Link href={raceHref(race)}>{race.name}</Link>
                      </h3>
                      <p className="race-english">{race.englishName}</p>
                      <div className="distance-tags">
                        {groups.map((g) => (
                          <span
                            key={g.id}
                            title={`${g.name}：${registrationLabels[groupStatus(race, g, now)]}`}
                          >
                            {distanceLabel(g.distanceKm)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="race-location">
                      <Icon name="pin" size={16} />
                      <div>
                        {race.venue}
                        <small>
                          {race.region ?? "按組別起點"} · {race.district}
                        </small>
                      </div>
                    </div>
                    <div className="race-status">
                      <span className={`status-badge ${summary.key}`}>
                        <i />
                        {summary.label}
                      </span>
                      {deadline && (
                        <small>
                          {deadline.includes("T")
                            ? formatTimestamp(deadline) + " HKT"
                            : displayDate(deadline)}{" "}
                          截止
                        </small>
                      )}
                      <small className="verification-label">
                        {race.verifiedAt
                          ? `核對 ${displayDate(race.verifiedAt.slice(0, 10))}`
                          : "待核實"}
                      </small>
                    </div>
                    <Link
                      className="row-arrow"
                      href={raceHref(race)}
                      aria-label={`查看${race.name}詳情`}
                    >
                      <Icon name="arrow" size={20} />
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
              <p>試下放寬日期、移除部分條件，或者切換「全部」。</p>
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
