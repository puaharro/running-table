import type { Race, Source } from "./types";
import { raceHref } from "./site";

export const raceAnnouncementTitles = {
  postponed: "賽事延期",
  cancelled: "賽事取消",
  "venue-change": "起點變更",
};

export const racePdfHref = (race: Race) => `${raceHref(race)}race-day.pdf`;
export const racePdfFilename = (race: Race) => `nxtgo-${race.slug}-race-day.pdf`;

export function verifiedStarts(race: Race) {
  const starts = new Map<string, { names: string[]; groupIds: string[]; sources: Source[] }>();
  for (const group of race.groups) {
    if (!group.venue) continue;
    const sources = race.sources?.filter(
      (source) =>
        group.sourceIds?.includes(source.id) &&
        source.fields.some((field) => {
          if (field === "groups.venue") return true;
          // Older sources use a short group key such as "marathon".
          const scopedGroup = /^groups\.([^.]+)\.venue$/.exec(field)?.[1];
          return scopedGroup && (group.id === scopedGroup || group.id.endsWith(`-${scopedGroup}`));
        }),
    );
    if (!sources?.length) continue;
    const start = starts.get(group.venue) ?? { names: [], groupIds: [], sources: [] };
    start.names.push(group.name);
    start.groupIds.push(group.id);
    for (const source of sources) {
      if (!start.sources.some((existing) => existing.id === source.id)) start.sources.push(source);
    }
    starts.set(group.venue, start);
  }

  if (!starts.size) {
    const sources = race.sources?.filter((source) => source.fields.includes("venue"));
    if (sources?.length && race.venue && !/待核實|按組別|多個起點/.test(race.venue)) {
      starts.set(race.venue, { names: [], groupIds: [], sources });
    }
  }
  return [...starts].map(([venue, start]) => ({ venue, ...start }));
}
