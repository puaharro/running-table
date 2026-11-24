import {
  englishChannels,
  englishDate,
  englishDistanceTag,
  englishStatus,
  language,
} from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { displayDate } from "@/lib/races";
import { channelTypeLabels, registrationLabels, type Filters } from "@/lib/types";
import { Icon } from "./ui";

export function CalendarActiveFilters({
  english,
  filters,
  onRemove,
}: {
  english: boolean;
  filters: Filters;
  onRemove: (patch: Partial<Filters>) => void;
}) {
  const t = language(english);
  const chips: { key: string; label: string; patch: Partial<Filters> }[] = [];
  const add = (key: string, label: string, patch: Partial<Filters>) =>
    chips.push({ key, label, patch });
  const date = (value: string) =>
    english ? englishDate(value) : displayDate(value, { year: "numeric" });
  if (filters.from || filters.to) {
    const { from, to } = filters;
    const label =
      from && to
        ? `${date(from)} – ${date(to)}`
        : from
          ? t(`${date(from)}起`, `From ${date(from)}`)
          : t(`至 ${date(to)}`, `Until ${date(to)}`);
    add("dates", label, { from: "", to: "" });
  }
  if (filters.month) {
    const label = english
      ? new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(
          new Date(Date.UTC(2026, Number(filters.month) - 1, 1)),
        )
      : `${filters.month} 月`;
    add("month", label, { month: "" });
  }
  for (const key of [
    "countries",
    "regions",
    "distances",
    "sports",
    "statuses",
    "channels",
  ] as const) {
    for (const value of filters[key]) {
      let label = englishRaceTerm(value, english);
      if (key === "countries" && value === "香港") label = t("香港", "Hong Kong");
      if (key === "regions" && value === "港島") label = t("香港島", "Hong Kong Island");
      if (key === "distances" && english) label = englishDistanceTag(value);
      if (key === "statuses")
        label = (english ? englishStatus : registrationLabels)[
          value as keyof typeof registrationLabels
        ];
      if (key === "channels")
        label = (english ? englishChannels : channelTypeLabels)[
          value as keyof typeof channelTypeLabels
        ];
      add(`${key}:${value}`, label, {
        [key]: (filters[key] as readonly string[]).filter((item) => item !== value),
      });
    }
  }
  if (filters.min || filters.max) {
    const { min, max } = filters;
    add("distance-range", min && max ? `${min}–${max} km` : min ? `≥ ${min} km` : `≤ ${max} km`, {
      min: "",
      max: "",
    });
  }
  if (filters.themed) add("themed", t("主題跑", "Themed races"), { themed: false });
  if (filters.family) add("family", t("親子組", "Family categories"), { family: false });
  if (!chips.length) return null;

  return (
    <ul className="calendar-active-filters" aria-label={t("已選篩選條件", "Active filters")}>
      {chips.map(({ key, label, patch }) => (
        <li key={key}>
          <button
            type="button"
            aria-label={t(`移除篩選：${label}`, `Remove filter: ${label}`)}
            onClick={() => onRemove(patch)}
          >
            <span>{label}</span>
            <Icon name="close" size={14} />
          </button>
        </li>
      ))}
    </ul>
  );
}
