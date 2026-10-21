import {
  distanceOptions,
  registrationLabels,
  regions,
  type Filters,
  type Race,
  type RaceGroup,
  type RegistrationStatus,
} from "./types";

export const defaultFilters: Filters = {
  q: "",
  from: "",
  to: "",
  distances: [],
  min: "",
  max: "",
  regions: [],
  sports: [],
  statuses: [],
  view: "upcoming",
  sort: "date",
};
export function hongKongToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function displayDate(date: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    month: "long",
    day: "numeric",
    ...options,
  }).format(new Date(`${date}T12:00:00+08:00`));
}
export function distanceLabel(km: number) {
  return Math.abs(km - 21.0975) < 0.1 ? "半馬" : Math.abs(km - 42.195) < 0.1 ? "全馬" : `${km}K`;
}
export type Clock = string | Date;
export function clockTime(now: Clock) {
  return now instanceof Date ? now : new Date(now.length === 10 ? `${now}T00:00:00+08:00` : now);
}
export function closingTime(group: RaceGroup) {
  return group.registrationClosesAt
    ? Date.parse(group.registrationClosesAt)
    : group.deadline
      ? Date.parse(`${group.deadline}T23:59:59.999+08:00`)
      : Infinity;
}
export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
export function registrationIsStale(race: Race, group: RaceGroup, now: Clock) {
  if (race.verification === "demo") return false;
  if (!group.registrationVerifiedAt) return true;
  const age = clockTime(now).getTime() - Date.parse(group.registrationVerifiedAt);
  return !Number.isFinite(age) || age < 0 || age > 72 * 60 * 60 * 1000;
}
export function groupStatus(race: Race, group: RaceGroup, now: Clock): RegistrationStatus {
  const current = clockTime(now),
    today = hongKongToday(current);
  if (
    race.status === "cancelled" ||
    race.status === "completed" ||
    (group.endDate ?? group.date) < today
  )
    return "closed";
  if (race.status === "postponed") return "unknown";
  if (current.getTime() >= closingTime(group)) return "closed";
  if (group.status === "unknown") return "unknown";
  if (group.registrationOpensAt && current.getTime() < Date.parse(group.registrationOpensAt))
    return "upcoming";
  if (registrationIsStale(race, group, now)) return "unknown";
  if (group.registrationStart && group.registrationStart > today) return "upcoming";
  if (group.status === "upcoming" && group.registrationStart && group.registrationStart <= today)
    return "unknown";
  return group.status;
}
export function statusSummary(race: Race, groups: RaceGroup[], now: Clock) {
  const today = hongKongToday(clockTime(now));
  if (race.status === "cancelled") return { key: "closed", label: "賽事取消" };
  if (race.status === "postponed") return { key: "unknown", label: "賽事延期" };
  if (race.status === "completed" || race.endDate < today)
    return { key: "closed", label: "已完成" };
  const statuses = [...new Set(groups.map((g) => groupStatus(race, g, now)))];
  if (statuses.includes("open"))
    return { key: "open", label: statuses.length > 1 ? "部分組別可報名" : "開放報名" };
  const key = statuses.includes("unknown")
    ? "unknown"
    : statuses.includes("waitlist")
      ? "waitlist"
      : statuses.includes("upcoming")
        ? "upcoming"
        : (statuses[0] ?? "unknown");
  const ballot = groups.length > 0 && groups.every((g) => g.registrationMethod === "公眾抽籤");
  return { key, label: ballot && key === "closed" ? "公眾抽籤已截止" : registrationLabels[key] };
}
function distanceMatches(km: number, selection: string[]) {
  if (!selection.length) return true;
  const label = distanceLabel(km);
  return (
    selection.includes(label) ||
    (selection.includes("其他") && !["5K", "10K", "半馬", "全馬"].includes(label))
  );
}
export function filterError(f: Filters) {
  if ((f.from && !validDate(f.from)) || (f.to && !validDate(f.to))) return "請輸入有效嘅日期。";
  for (const value of [f.min, f.max])
    if (value && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 1000))
      return "距離請輸入 0 至 1000 公里。";
  if (f.from && f.to && f.from > f.to) return "開始日期唔可以遲過結束日期。";
  if (f.min && f.max && Number(f.min) > Number(f.max)) return "最短距離唔可以大過最長距離。";
  return "";
}
export function selectRaces(races: Race[], f: Filters, now: Clock) {
  const today = hongKongToday(clockTime(now));
  if (filterError(f)) return [];
  const q = f.q.trim().toLocaleLowerCase();
  const result = races.flatMap((race) => {
    if (f.view === "upcoming" && race.endDate < today) return [];
    if (f.view === "past" && race.endDate >= today) return [];
    if (f.sports.length && !f.sports.includes(race.sport)) return [];
    if (
      q &&
      ![race.name, race.englishName, race.organizer, race.district, race.venue, ...race.tags]
        .join(" ")
        .toLocaleLowerCase()
        .includes(q)
    )
      return [];
    const groups = race.groups.filter((g) => {
      const region = g.region === undefined ? race.region : g.region;
      if (f.regions.length && (!region || !f.regions.includes(region))) return false;
      if (f.from && (g.endDate ?? g.date) < f.from) return false;
      if (f.to && g.date > f.to) return false;
      if (!distanceMatches(g.distanceKm, f.distances)) return false;
      if (f.min && g.distanceKm < Number(f.min)) return false;
      if (f.max && g.distanceKm > Number(f.max)) return false;
      if (f.statuses.length && !f.statuses.includes(groupStatus(race, g, now))) return false;
      return true;
    });
    return groups.length ? [{ race, groups }] : [];
  });
  const nearestDeadline = ({ race, groups }: (typeof result)[number]) =>
    Math.min(...groups.filter((g) => groupStatus(race, g, now) === "open").map(closingTime));
  return result.sort((a, b) =>
    f.sort === "deadline"
      ? nearestDeadline(a) - nearestDeadline(b) || a.race.date.localeCompare(b.race.date)
      : f.sort === "recent"
        ? b.race.updatedAt.localeCompare(a.race.updatedAt) || a.race.date.localeCompare(b.race.date)
        : a.race.date.localeCompare(b.race.date),
  );
}
export function parseFilters(params: URLSearchParams): Filters {
  const list = (key: string, allowed: readonly string[]) => [
    ...new Set(params.getAll(key).filter((x) => allowed.includes(x))),
  ];
  const number = (key: string) => {
    const v = params.get(key) ?? "";
    return /^\d+(\.\d+)?$/.test(v) && Number(v) <= 1000 ? v : "";
  };
  return {
    ...defaultFilters,
    q: (params.get("q") ?? "").slice(0, 200),
    from: validDate(params.get("from") ?? "") ? params.get("from")! : "",
    to: validDate(params.get("to") ?? "") ? params.get("to")! : "",
    distances: list("distance", distanceOptions),
    min: number("min"),
    max: number("max"),
    regions: list("region", regions),
    sports: list("sport", ["路跑"]),
    statuses: list("status", Object.keys(registrationLabels)) as RegistrationStatus[],
    view: ["upcoming", "all", "past"].includes(params.get("view") ?? "")
      ? (params.get("view") as Filters["view"])
      : "upcoming",
    sort: ["date", "deadline", "recent"].includes(params.get("sort") ?? "")
      ? (params.get("sort") as Filters["sort"])
      : "date",
  };
}
export function serializeFilters(f: Filters) {
  const p = new URLSearchParams();
  for (const key of ["q", "from", "to", "min", "max"] as const) if (f[key]) p.set(key, f[key]);
  for (const [field, key] of [
    ["distances", "distance"],
    ["regions", "region"],
    ["sports", "sport"],
    ["statuses", "status"],
  ] as const)
    for (const value of f[field]) p.append(key, value);
  if (f.view !== "upcoming") p.set("view", f.view);
  if (f.sort !== "date") p.set("sort", f.sort);
  return p.toString();
}
