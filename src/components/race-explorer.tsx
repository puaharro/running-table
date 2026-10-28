"use client";
import { registrationUncertaintyReason } from "@/lib/verification";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AdSlot, Icon } from "./ui";
import { StatusBadge } from "./status-badge";
import {
  defaultFilters,
  displayDate,
  formatTimestamp,
  distanceLabel,
  filterError,
  groupStatus,
  channelStatus,
  parseFilters,
  registrationCountdown,
  selectRaces,
  serializeFilters,
  statusSummary,
} from "@/lib/races";
import {
  dateShortcutIsActive,
  toggleDateShortcut,
  toggleDeadlineShortcut,
  toggleFamilyShortcut,
  toggleOpenShortcut,
  type DateShortcut,
} from "@/lib/filter-shortcuts";
import { groupLocations } from "@/lib/group-locations";
import { raceHref } from "@/lib/site";
import { resultsHref } from "@/lib/results-location";
import {
  distanceOptions,
  channelTypeLabels,
  regions,
  registrationLabels,
  type Filters,
  type Race,
  type RaceGroup,
  type RegistrationStatus,
} from "@/lib/types";

function monthLabel(date: string) {
  return `${date.slice(0, 4)} 年 ${Number(date.slice(5, 7))} 月`;
}

function GroupStatusList({ race, groups, now }: { race: Race; groups: RaceGroup[]; now: string }) {
  const count = groups.reduce((total, group) => total + group.channels.length, 0);
  const groupLabel = (group: RaceGroup) =>
    groups.filter(
      (candidate) => distanceLabel(candidate.distanceKm) === distanceLabel(group.distanceKm),
    ).length > 1
      ? group.name
      : distanceLabel(group.distanceKm);
  return (
    <div className="group-status-list compact-channels">
      <ul className="group-status-preview" aria-label="符合條件的渠道摘要">
        {groups.slice(0, 2).map((group) => (
          <li
            key={group.id}
            className={`channel-preview-group${groupLabel(group) !== distanceLabel(group.distanceKm) ? " named-group" : ""}`}
          >
            <strong>{groupLabel(group)}</strong>
            <ul>
              {group.channels.slice(0, 2).map((channel) => (
                <li key={channel.id} className="channel-preview-row">
                  <span>{channel.name}</span>
                  <StatusBadge status={channelStatus(race, group, channel, now)} />
                </li>
              ))}
            </ul>
            {group.channels.length > 2 && (
              <small className="channel-more">另有 {group.channels.length - 2} 個渠道</small>
            )}
          </li>
        ))}
        {groups.length > 2 && <li className="channel-more">另有 {groups.length - 2} 個組別</li>}
      </ul>
      <details className="channel-disclosure">
        <summary>
          <span className="when-closed">查看{count > 1 ? `全部 ${count} 個` : ""}渠道及資格</span>
          <span className="when-open">收起渠道及資格</span>
          <span className="sr-only">：{race.name}</span>
        </summary>
        <ul className="channel-expanded-groups">
          {groups.map((group) => (
            <li key={group.id} className="channel-expanded-group">
              <strong>{group.name}</strong>
              <ul>
                {group.channels.map((channel) => {
                  const reason = registrationUncertaintyReason(race, group, channel, now);
                  return (
                    <li key={channel.id} className="channel-expanded-row">
                      <div className="channel-preview-row">
                        <strong>{channel.name}</strong>
                        <StatusBadge status={channelStatus(race, group, channel, now)} />
                      </div>
                      {!channel.name.includes(channel.registrationMethod) && (
                        <p>方式：{channel.registrationMethod}</p>
                      )}
                      <p>資格：{channel.eligibility}</p>
                      {reason && <p className="verification-reason">{reason}</p>}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

export function RaceExplorer({ races, initialNow }: { races: Race[]; initialNow: string }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [now, setNow] = useState(initialNow);
  const [ready, setReady] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const previousSort = useRef<Filters["sort"]>("date");
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
      const toolbar = document.getElementById("results-toolbar");
      toolbar?.focus({ preventScroll: true });
      toolbar?.scrollIntoView({ block: "start" });
    });
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
  function toggle(key: "distances" | "regions" | "statuses" | "channels", value: string) {
    const values: string[] = filters[key];
    update({
      ...filters,
      [key]: values.includes(value) ? values.filter((x) => x !== value) : [...values, value],
    });
  }
  function quickDate(kind: DateShortcut) {
    update(toggleDateShortcut(filters, kind, now));
  }
  function quickDeadline() {
    if (filters.sort !== "deadline") previousSort.current = filters.sort;
    update(toggleDeadlineShortcut(filters, previousSort.current));
  }
  const results = useMemo(() => selectRaces(races, filters, now), [races, filters, now]);
  const openCount = races.filter((r) =>
    r.groups.some((g) => groupStatus(r, g, now) === "open"),
  ).length;
  const error = filterError(filters);
  const onlyOpen = filters.statuses.includes("open");
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
    ...filters.distances.map((x) => ({ label: x, remove: () => toggle("distances", x) })),
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
        <div>
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
            <span>場有渠道接受申請</span>
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
        <div className="quick-row" aria-describedby="quick-filter-note">
          <span>快速搵：</span>
          <button
            className={`only-open-shortcut${onlyOpen ? " selected" : ""}`}
            aria-pressed={onlyOpen}
            aria-describedby="quick-filter-note"
            onClick={() => update(toggleOpenShortcut(filters))}
          >
            {onlyOpen && <Icon name="check" size={14} />}
            接受申請
          </button>
          <button
            aria-pressed={filters.sort === "deadline"}
            title="按接受申請渠道的截止時間排序；再按一次取消排序"
            onClick={quickDeadline}
          >
            {filters.sort === "deadline" && <Icon name="check" size={14} />}
            即將截止
          </button>
          <button
            aria-pressed={filters.family}
            onClick={() => update(toggleFamilyShortcut(filters))}
          >
            {filters.family && <Icon name="check" size={14} />}
            親子同樂
          </button>
        </div>
        <p id="quick-filter-note" className="quick-filter-note">
          接受申請仍須符合渠道資格，名額以大會確認為準。
        </p>
        <div id="filters" hidden={!expanded}>
          <div className="filter-grid">
            <fieldset className="date-field">
              <legend>
                <span>比賽日期</span>
              </legend>
              <div className="date-shortcuts">
                {(
                  [
                    ["weekend", "今個週末"],
                    ["month", "今個月"],
                    ["next", "下個月"],
                  ] as const
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    aria-pressed={dateShortcutIsActive(filters, kind, now)}
                    onClick={() => quickDate(kind)}
                  >
                    {label}
                  </button>
                ))}
              </div>
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
                <span>距離／組別</span>
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
            </fieldset>
            <fieldset>
              <legend>
                <span>報名渠道</span>
              </legend>
              <div className="option-row">
                {Object.entries(channelTypeLabels).map(([key, label]) => (
                  <button
                    key={key}
                    aria-pressed={filters.channels.includes(key as keyof typeof channelTypeLabels)}
                    onClick={() => toggle("channels", key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <small>同欄多選；接受申請仍須符合該渠道資格</small>
            </fieldset>
            <fieldset>
              <legend>
                <span>地區</span>
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
          </div>
          <details className="advanced-filters">
            <summary>
              進階篩選
              {filters.statuses.length > 0 || filters.min || filters.max
                ? " · 已套用"
                : " · 報名狀態／公里範圍"}
            </summary>
            <div className="advanced-grid">
              <fieldset className="status-field">
                <legend>
                  <span>報名狀態</span>
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
            </div>
          </details>
          <div className="filter-hint">
            <span>只收錄路跑 · 條件可多選，渠道及狀態須同時符合</span>
            <button className="filter-reset" onClick={() => update({ ...defaultFilters })}>
              重設條件
            </button>
          </div>
          <div className="mobile-filter-actions">
            <button className="filter-reset" onClick={() => update({ ...defaultFilters })}>
              重設條件
            </button>
            <button className="mobile-filter-done" disabled={!!error} onClick={showResults}>
              {error ? "請修正篩選條件" : `查看 ${results.length} 場賽事`}
              <Icon name="arrow" size={16} />
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
      <p className="data-note">
        <span className="demo-dot" />
        列表只顯示符合條件嘅渠道，接受申請仍須符合資格；超過 72 小時未核對會顯示待核實。
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
              const countdown = registrationCountdown(race, groups, now);
              return (
                <Fragment key={race.id}>
                  {filters.sort === "date" && month !== previousMonth && (
                    <div className="month-divider">
                      <span>{monthLabel(race.date)}</span>
                      <i />
                    </div>
                  )}
                  <article
                    className="race-row"
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
                        <a href={raceHref(race)}>{race.name}</a>
                      </h3>
                      <p className="race-english">{race.englishName}</p>
                      <GroupStatusList race={race} groups={groups} now={now} />
                      {!!race.enquiryLinks?.length && (
                        <Link className="text-link" href={`${raceHref(race)}#enquiries`}>
                          其他慈善機構查詢 ↗
                        </Link>
                      )}
                    </div>
                    <div className="race-location">
                      <Icon name="pin" size={16} />
                      <ul className="race-start-list" aria-label="符合條件的組別起點">
                        {groupLocations(race, groups).map((location, index) => (
                          <li key={index}>
                            <strong>{location.distances.join("／")}起點</strong>
                            <span>{location.venue ?? "起點待核實"}</span>
                            {location.region && <small>{location.region}</small>}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className={`race-status${countdown ? " has-deadline" : ""}`}>
                      <StatusBadge status={summary.key}>{summary.label}</StatusBadge>
                      {countdown && (
                        <>
                          <span
                            className={`deadline-countdown${countdown.urgent ? " urgent" : ""}`}
                            title={`最早截止：${countdown.groupName} · ${countdown.channelName}`}
                          >
                            <Icon name="clock" size={13} />
                            {countdown.label}
                          </span>
                          <small
                            className="deadline-exact"
                            title={`${countdown.groupName} · ${countdown.channelName}`}
                          >
                            最早截止：
                            <time dateTime={countdown.deadline}>
                              {countdown.deadline.includes("T")
                                ? formatTimestamp(countdown.deadline) + " HKT"
                                : displayDate(countdown.deadline) + " HKT"}
                            </time>
                          </small>
                        </>
                      )}
                      <small className="verification-label">
                        {race.verifiedAt
                          ? `賽事資料核對 ${displayDate(race.verifiedAt.slice(0, 10))}`
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
