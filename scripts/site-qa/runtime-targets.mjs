import { readFileSync } from "node:fs";
import { validateRuntimeRecord } from "../../src/lib/cms-runtime-schema.mjs";

const json = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));

export function runtimeTargets() {
  const catalog = json("../../src/data/catalog.json");
  const { records } = json("../../content/cms-runtime/selected.json");
  return Object.entries(records).map(([raceId, pin]) => {
    const race = catalog.find((entry) => entry.id === raceId);
    if (!race) throw Error("Selected CMS race is missing from public catalog: " + raceId);
    const year = Number(race.date.slice(0, 4));
    const groupId = pin.groupId ?? (race.groups.length === 1 ? race.groups[0].id : undefined);
    if (!race.groups.some((group) => group.id === groupId))
      throw Error("Invalid CMS group selection: " + raceId);
    if (!/^(runner-copies|cms-runtime)\/[a-zA-Z0-9-]+\.json$/.test(pin.file))
      throw Error("Invalid CMS content path");
    const copy = validateRuntimeRecord(json("../../content/" + pin.file), pin, raceId, year);
    return { raceId, year, groupId, copy, urlPath: `/races/${year}/${race.slug}/` };
  });
}
