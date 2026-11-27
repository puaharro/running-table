import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { validateRuntimeRecord } from "../src/lib/cms-runtime-schema.mjs";
import { checkRuntimeRunnerCopy } from "./site-qa/content.mjs";
const index = JSON.parse(readFileSync("content/cms-runtime/selected.json", "utf8"));
const catalog = JSON.parse(readFileSync("src/data/catalog.json", "utf8"));
for (const [id, pin] of Object.entries(index.records)) {
  const race = catalog.find((r) => r.id === id);
  if (!race) throw Error("Selected CMS race is missing from public catalog: " + id);
  if (!/^(runner-copies|cms-runtime)\/[a-zA-Z0-9-]+\.json$/.test(pin.file))
    throw Error("Invalid CMS content path");
  const copy = validateRuntimeRecord(
    JSON.parse(readFileSync(join("content", pin.file), "utf8")),
    pin,
    id,
    Number(race.date.slice(0, 4)),
  );
  for (const locale of ["", "en"]) {
    const path = join("out", locale, "races", race.date.slice(0, 4), race.slug, "index.html");
    if (!existsSync(path)) throw Error("Missing CMS runtime race page: " + path);
    const html = readFileSync(path, "utf8");
    if (html.includes(".editorial-private")) throw Error("Private path leaked: " + path);
    checkRuntimeRunnerCopy(
      html,
      copy,
      locale
        ? ["Course", "Aid stations", "Bag drop", "Transport", "Event organisation"]
        : undefined,
    );
  }
}
console.log("CMS runner accounts verified in both languages: layout, wording, limits and sources.");
