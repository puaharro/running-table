import { hongKongToday, validDate } from "./races";
import { registrationLabels, regions, type Race } from "./types";

export function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function validTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    validDate(value.slice(0, 10)) &&
    Number.isFinite(Date.parse(value))
  );
}
export function assertCatalog(input: unknown): asserts input is Race[] {
  if (!Array.isArray(input)) throw new Error("Catalog must be an array.");
  const ids = new Set<string>(),
    slugs = new Set<string>(),
    groupIds = new Set<string>();
  const fail = (id: unknown, message: string): never => {
    throw new Error(`Catalog ${String(id)}: ${message}`);
  };
  for (const raw of input) {
    if (!raw || typeof raw !== "object") fail("record", "must be an object");
    const race = raw as Race;
    for (const key of [
      "id",
      "slug",
      "name",
      "englishName",
      "venue",
      "district",
      "organizer",
      "summary",
      "transport",
    ] as const) {
      if (typeof race[key] !== "string" || !race[key].trim()) fail(race.id, `${key} is required`);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(race.slug)) fail(race.id, "invalid slug");
    if (ids.has(race.id) || slugs.has(`${race.date?.slice(0, 4)}/${race.slug}`))
      fail(race.id, "duplicate ID or route");
    ids.add(race.id);
    slugs.add(`${race.date?.slice(0, 4)}/${race.slug}`);
    if (
      !validDate(race.date) ||
      !validDate(race.endDate) ||
      race.date > race.endDate ||
      !validDate(race.updatedAt)
    )
      fail(race.id, "invalid event date");
    if (race.sport !== "路跑" || (race.region !== null && !regions.includes(race.region)))
      fail(race.id, "invalid sport or region");
    if (!["scheduled", "postponed", "cancelled", "completed"].includes(race.status))
      fail(race.id, "invalid event status");
    if (
      !["demo", "verified", "pending"].includes(race.verification) ||
      !["draft", "published"].includes(race.publication ?? "")
    )
      fail(race.id, "publication state required");
    if (
      !Array.isArray(race.tags) ||
      race.tags.some((t) => typeof t !== "string") ||
      !Array.isArray(race.highlights) ||
      race.highlights.some((t) => typeof t !== "string")
    )
      fail(race.id, "invalid editorial fields");
    if (race.publication === "published" && race.verification !== "verified")
      fail(race.id, "only verified real records may be published");
    if (!isHttpsUrl(race.sourceUrl) || !validTimestamp(race.verifiedAt))
      fail(race.id, "official source and verification timestamp required");
    if (!Array.isArray(race.sources) || !race.sources.length)
      fail(race.id, "field provenance required");
    const sourceIds = new Set<string>();
    for (const source of race.sources!) {
      if (
        !source.id ||
        sourceIds.has(source.id) ||
        !source.title ||
        !isHttpsUrl(source.url) ||
        !validTimestamp(source.checkedAt) ||
        !Array.isArray(source.fields) ||
        !source.fields.length ||
        source.fields.some((field) => typeof field !== "string")
      )
        fail(race.id, "invalid or duplicate source");
      sourceIds.add(source.id);
    }
    if (!Array.isArray(race.groups) || !race.groups.length) fail(race.id, "groups required");
    for (const group of race.groups) {
      if (!group.id || groupIds.has(group.id) || !group.name)
        fail(race.id, "invalid or duplicate group");
      groupIds.add(group.id);
      if (!Number.isFinite(group.distanceKm) || group.distanceKm <= 0 || group.distanceKm > 1000)
        fail(group.id, "invalid distance");
      if (
        !validDate(group.date) ||
        group.date < race.date ||
        (group.endDate ?? group.date) > race.endDate ||
        (group.endDate && (!validDate(group.endDate) || group.endDate < group.date))
      )
        fail(group.id, "invalid group dates");
      if (group.price !== null && (!Number.isFinite(group.price) || group.price < 0))
        fail(group.id, "invalid price");
      if (!(group.status in registrationLabels)) fail(group.id, "invalid registration status");
      if (group.region !== undefined && group.region !== null && !regions.includes(group.region))
        fail(group.id, "invalid group region");
      if (!group.sourceIds?.length || group.sourceIds.some((id) => !sourceIds.has(id)))
        fail(group.id, "missing source references");
      if (group.registrationUrl && !isHttpsUrl(group.registrationUrl))
        fail(group.id, "registration link must use HTTPS");
      for (const date of [group.registrationStart, group.deadline])
        if (date && !validDate(date)) fail(group.id, "invalid registration date");
      for (const timestamp of [
        group.registrationOpensAt,
        group.registrationClosesAt,
        group.registrationVerifiedAt,
        group.startTime,
      ])
        if (timestamp && !validTimestamp(timestamp)) fail(group.id, "invalid timestamp");
      if (
        group.registrationOpensAt &&
        group.registrationClosesAt &&
        Date.parse(group.registrationOpensAt) >= Date.parse(group.registrationClosesAt)
      )
        fail(group.id, "registration range reversed");
      if (
        group.registrationClosesAt &&
        group.deadline &&
        hongKongToday(new Date(group.registrationClosesAt)) !== group.deadline
      )
        fail(group.id, "deadline date and timestamp disagree");
      if (
        group.status !== "unknown" &&
        (!group.registrationVerifiedAt || !group.registrationMethod)
      )
        fail(group.id, "known registration status needs timestamp and channel");
      if (
        group.status !== "unknown" &&
        !race.sources!.some(
          (source) =>
            group.sourceIds!.includes(source.id) && source.fields.includes("groups.registration"),
        )
      )
        fail(group.id, "registration status lacks field evidence");
    }
  }
}
export function publishedRaces(catalog: Race[]) {
  return catalog.filter((r) => r.publication === "published" && r.verification === "verified");
}
