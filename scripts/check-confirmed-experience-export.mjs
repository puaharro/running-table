import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { selectedExperiences } from "../src/lib/confirmed-race-experience-schema.mjs";
import { contentTargets, checkContent } from "./site-qa/content.mjs";

for (const target of contentTargets()) {
  const html = readFileSync(join("out", target.path), "utf8");
  checkContent(html, target.record);
  if (target.raceId === "hzmb-half-marathon-2026")
    assert.equal(
      (html.match(/id="review-hzmb-half-2025-participant-notes"/g) ?? []).length,
      1,
      "preserve one legacy review anchor without duplicating the old same-edition content",
    );
}
function checkTree(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    assert.ok(
      !/editorial-private|\.sqlite(?:-|$)|proposal.*\.json$/i.test(entry.name),
      "private file in export",
    );
    if (entry.isDirectory()) checkTree(path);
    else if (/\.(?:html|js|json|txt)$/.test(entry.name)) {
      const content = readFileSync(path, "utf8");
      assert.ok(!content.includes(".editorial-private/research2025"), "private CMS path leaked");
    }
  }
}
checkTree("out");
for (const year of readdirSync("out/races", { withFileTypes: true }).filter((e) =>
  e.isDirectory(),
)) {
  for (const race of readdirSync(`out/races/${year.name}`, { withFileTypes: true }).filter((e) =>
    e.isDirectory(),
  )) {
    if (Object.hasOwn(selectedExperiences, race.name)) continue;
    assert.ok(
      !readFileSync(`out/races/${year.name}/${race.name}/index.html`, "utf8").includes(
        'id="race-confirmed-experience"',
      ),
      "experience leaked to another race",
    );
  }
}
console.log(
  "Two confirmed 2025 experiences verified: exact copy v2, ratings, citations, edition isolation and no private files.",
);
