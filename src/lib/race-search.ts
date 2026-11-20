import type { Race } from "./types";

export function normalizeRaceSearch(value: string) {
  const text = value.normalize("NFKC").trim().toLocaleLowerCase("zh-HK");
  return text.replace(/[\p{P}\s]/gu, "") || text;
}

export function raceSearchText(race: Race) {
  const aliases = race.slug.startsWith("standard-chartered-hk-marathon-") ? "渣馬 SCHKM" : "";
  return [
    race.name,
    race.englishName,
    race.organizer,
    race.district,
    race.venue,
    ...race.tags,
    aliases,
  ].join(" ");
}
