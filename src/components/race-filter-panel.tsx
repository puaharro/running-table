import { useEffect, useLayoutEffect, useRef } from "react";
import { englishDate, englishDistanceTag, language } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { calendarRegistrationLabels } from "@/lib/list-registration";
import { dateShortcutIsActive, type DateShortcut } from "@/lib/filter-shortcuts";
import { displayDate, hongKongToday } from "@/lib/races";
import { distanceOptions, regions, type Filters } from "@/lib/types";
import { CalendarSheetDismiss } from "./calendar-sheet-dismiss";
import { Icon } from "./ui";

const filterCategories = (t: ReturnType<typeof language>) =>
  [
    ["date", t("比賽日期", "Race date")],
    ["location", t("地點", "Location")],
    ["distance", t("距離", "Distance")],
    ["type", t("賽事類型", "Race type")],
  ] as const;
export type FilterCategory = ReturnType<typeof filterCategories>[number][0];

function FilterOptionCount({ count, english }: { count: number; english: boolean }) {
  return (
    <span className="calendar-option-count" data-empty={count === 0 || undefined}>
      {count}
      <span className="sr-only">{english ? " races" : " 場"}</span>
    </span>
  );
}

type RaceFilterPanelProps = {
  english: boolean;
  filters: Filters;
  now: string;
  filtersExpanded: boolean;
  filterCategory: FilterCategory | null;
  customDates: boolean;
  error: string;
  acceptingOnly: boolean;
  optionCounts: { regions: number[]; distances: number[] } | null;
  resultCount: number;
  setFilterCategory: (category: FilterCategory | null) => void;
  setCustomDates: (show: boolean) => void;
  update: (filters: Filters) => void;
  field: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  toggle: (key: "distances" | "regions", value: string) => void;
  quickDate: (kind: DateShortcut) => void;
  onDismiss: () => void;
  onReset: () => void;
  onShowResults: () => void;
};

export function RaceFilterPanel({
  english,
  filters,
  now,
  filtersExpanded,
  filterCategory,
  customDates,
  error,
  acceptingOnly,
  optionCounts,
  resultCount,
  setFilterCategory,
  setCustomDates,
  update,
  field,
  toggle,
  quickDate,
  onDismiss,
  onReset,
  onShowResults,
}: RaceFilterPanelProps) {
  const t = language(english);
  const categories = filterCategories(t);
  const filterCard = useRef<HTMLDivElement>(null);
  const filterHeading = useRef<HTMLDivElement>(null);
  const categoryButtons = useRef<Partial<Record<FilterCategory, HTMLButtonElement>>>({});
  const categoryOptions = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (filtersExpanded || !filterCategory) return;
    const card = filterCard.current;
    const heading = filterHeading.current;
    const trigger = categoryButtons.current[filterCategory];
    const options = categoryOptions.current;
    if (!card || !heading || !trigger || !options) return;

    const positionOptions = () => {
      const cardRect = card.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      const triggerLeft = triggerRect.left - cardRect.left - card.clientLeft;
      const maxLeft = card.clientWidth - options.offsetWidth;
      options.style.setProperty(
        "--filter-popup-left",
        `${Math.max(0, Math.min(triggerLeft, maxLeft))}px`,
      );
      options.style.setProperty(
        "--filter-popup-top",
        `${triggerRect.bottom - cardRect.top - card.clientTop}px`,
      );
    };
    positionOptions();
    const observer = new ResizeObserver(positionOptions);
    observer.observe(heading);
    observer.observe(options);
    for (const button of Object.values(categoryButtons.current)) observer.observe(button);

    const dismissOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !card.contains(event.target)) setFilterCategory(null);
    };
    document.addEventListener("pointerdown", dismissOnOutsidePress);
    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", dismissOnOutsidePress);
    };
  }, [filterCategory, filtersExpanded, setFilterCategory]);

  useEffect(() => {
    if (!filtersExpanded) return;
    const panel = document.getElementById("calendar-filter-panel");
    if (!(panel instanceof HTMLDialogElement)) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    if (!mobile.matches) {
      onDismiss();
      return;
    }
    if (!panel.open) panel.showModal();
    const closeOnDesktop = () => {
      if (!mobile.matches) panel.close();
    };
    mobile.addEventListener("change", closeOnDesktop);
    return () => mobile.removeEventListener("change", closeOnDesktop);
  }, [filtersExpanded, onDismiss]);
  const FilterPanel = filtersExpanded ? "dialog" : "aside";
  const calendarYear = Number(hongKongToday(new Date(now)).slice(0, 4));
  const yearActive = dateShortcutIsActive(filters, "year", now);
  const nextYearActive = dateShortcutIsActive(filters, "next-year", now);
  const showCustomDates =
    customDates || (!!(filters.from || filters.to) && !yearActive && !nextYearActive);
  const dateErrorId = "calendar-date-range-error";
  const categoryCounts: Record<FilterCategory, number> = {
    date: Number(Boolean(filters.from || filters.to)) + Number(Boolean(filters.month)),
    location: filters.regions.length + filters.countries.length,
    distance: filters.distances.length + Number(Boolean(filters.min || filters.max)),
    type: Number(filters.themed || filters.family) + filters.sports.length,
  };
  return (
    <FilterPanel
      className="calendar-filter-panel"
      id="calendar-filter-panel"
      data-expanded={filtersExpanded}
      aria-label={filtersExpanded ? undefined : t("賽事篩選", "Race filters")}
      aria-labelledby={filtersExpanded ? "calendar-filter-title" : undefined}
      onClose={(event) => {
        const panel = event.currentTarget;
        onDismiss();
        if (panel instanceof HTMLDialogElement && panel.returnValue === "results") {
          onShowResults();
        }
      }}
    >
      {filtersExpanded && <CalendarSheetDismiss english={english} />}
      <div
        className="filter-card search-engine"
        ref={filterCard}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || filtersExpanded || !filterCategory) return;
          event.preventDefault();
          setFilterCategory(null);
          categoryButtons.current[filterCategory]?.focus();
        }}
      >
        <div className="calendar-filter-heading" ref={filterHeading}>
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
              {categories.map(([key, label]) => (
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
          <button type="button" className="calendar-reset-filters" onClick={onReset}>
            {t("重置條件", "Reset filters")}
          </button>
        </div>
        <div
          className="engine-options"
          id="calendar-category-options"
          data-category={filtersExpanded ? undefined : (filterCategory ?? undefined)}
          ref={categoryOptions}
          role={filtersExpanded ? undefined : "group"}
          aria-label={
            filtersExpanded ? undefined : categories.find(([key]) => key === filterCategory)?.[1]
          }
          tabIndex={filtersExpanded ? undefined : -1}
          hidden={!filtersExpanded && !filterCategory}
        >
          <div hidden={!filtersExpanded && filterCategory !== "date"}>
            <div className="engine-option-row" role="group" aria-label={t("比賽日期", "Race date")}>
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
            <div className="option-row option-row-padded">
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
            <div className="option-row option-row-padded">
              {distanceOptions.map((distance, index) => (
                <button
                  key={distance}
                  aria-pressed={filters.distances.includes(distance)}
                  onClick={() => toggle("distances", distance)}
                >
                  {english ? englishDistanceTag(distance) : distance}
                  {optionCounts && (
                    <FilterOptionCount english={english} count={optionCounts.distances[index]} />
                  )}
                </button>
              ))}
            </div>
          </div>
          {filtersExpanded && (
            <div
              className="engine-option-row"
              role="group"
              aria-label={t("報名狀態", "Entry status")}
            >
              <span className="engine-label">{t("報名狀態", "Entry status")}</span>
              <div className="option-row">
                <button
                  data-entry-status="open"
                  aria-pressed={acceptingOnly}
                  onClick={() => field("statuses", acceptingOnly ? [] : ["open"])}
                >
                  {t(calendarRegistrationLabels.open, "Accepting entries")}
                </button>
              </div>
            </div>
          )}
          <div
            className="engine-option-row"
            role="group"
            aria-label={t("賽事類型", "Race type")}
            hidden={!filtersExpanded && filterCategory !== "type"}
          >
            {filtersExpanded && <span className="engine-label">{t("賽事類型", "Race type")}</span>}
            <div className="option-row option-row-padded">
              <button
                aria-pressed={filters.themed}
                onClick={() => update({ ...filters, themed: !filters.themed, family: false })}
              >
                {t("主題跑", "Themed races")}
              </button>
            </div>
          </div>
        </div>
      </div>
      {filtersExpanded && (
        <form method="dialog" className="calendar-sheet-footer">
          <button type="submit" value="results" className="calendar-apply-filters">
            {t(`顯示 ${resultCount} 場賽事`, `Show ${resultCount} races`)}{" "}
            <Icon name="arrow" size={18} />
          </button>
        </form>
      )}
    </FilterPanel>
  );
}
