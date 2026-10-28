import { clockTime, hongKongToday, type Clock } from "./races";
import type { Filters } from "./types";

export type DateShortcut = "weekend" | "month" | "next" | "year" | "next-year";

export function dateShortcutRange(kind: DateShortcut, now: Clock) {
  const current = new Date(`${hongKongToday(clockTime(now))}T12:00:00Z`);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  if (kind === "year" || kind === "next-year") {
    const year = current.getUTCFullYear() + (kind === "next-year" ? 1 : 0);
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  if (kind === "weekend") {
    current.setUTCDate(
      current.getUTCDate() + (current.getUTCDay() === 0 ? 0 : (6 - current.getUTCDay() + 7) % 7),
    );
    const from = iso(current);
    if (current.getUTCDay() !== 0) current.setUTCDate(current.getUTCDate() + 1);
    return { from, to: iso(current) };
  }
  const month = current.getUTCMonth() + (kind === "next" ? 1 : 0);
  return {
    from: iso(new Date(Date.UTC(current.getUTCFullYear(), month, 1, 12))),
    to: iso(new Date(Date.UTC(current.getUTCFullYear(), month + 1, 0, 12))),
  };
}

export function dateShortcutIsActive(filters: Filters, kind: DateShortcut, now: Clock) {
  const range = dateShortcutRange(kind, now);
  return filters.from === range.from && filters.to === range.to;
}

export function toggleDateShortcut(filters: Filters, kind: DateShortcut, now: Clock): Filters {
  return {
    ...filters,
    ...(dateShortcutIsActive(filters, kind, now)
      ? { from: "", to: "" }
      : dateShortcutRange(kind, now)),
  };
}

export function toggleOpenShortcut(filters: Filters): Filters {
  return {
    ...filters,
    statuses: filters.statuses.includes("open")
      ? filters.statuses.filter((status) => status !== "open")
      : [...filters.statuses, "open"],
  };
}

export function toggleFamilyShortcut(filters: Filters): Filters {
  return { ...filters, family: !filters.family };
}

export function toggleDeadlineShortcut(filters: Filters, previousSort: Filters["sort"]): Filters {
  return {
    ...filters,
    sort:
      filters.sort === "deadline"
        ? previousSort === "deadline"
          ? "date"
          : previousSort
        : "deadline",
  };
}
