import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  selectedExperiences,
  assertConfirmedExperience,
} from "../src/lib/confirmed-race-experience-schema.mjs";

const strip = (html) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]*>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'");
for (const [raceId, pin] of Object.entries(selectedExperiences)) {
  const record = JSON.parse(readFileSync(`content/race-experiences/${pin.file}`, "utf8"));
  assertConfirmedExperience(record, raceId);
  const year = raceId === "hzmb-half-marathon-2026" ? "2026" : "2027";
  const html = readFileSync(`out/races/${year}/${raceId}/index.html`, "utf8");
  // The selected section ends immediately before the next race transport section.
  const section = html.split('id="race-confirmed-experience"')[1]?.split('id="race-transport"')[0];
  assert.ok(section, `${raceId}: missing confirmed experience in static HTML`);
  const text = strip(section);
  assert.ok(text.includes(record.title));
  assert.ok(text.includes("2025") && text.includes("往屆體驗"));
  assert.equal(record.sections.length, 5);
  for (const part of record.sections) {
    assert.ok(text.includes(part.body), `${raceId}: missing exact body`);
    assert.ok(text.includes(part.limitations), `${raceId}: missing exact limitations`);
  }
  for (const assessment of Object.values(record.assessments)) {
    for (const value of [
      assessment.comment,
      assessment.basis,
      assessment.suitedFor,
      ...assessment.positives,
      ...assessment.concerns,
    ])
      assert.ok(text.includes(value), `${raceId}: missing complete rating wording`);
  }
  const actual = [...section.matchAll(/href="([^"]+)"/g)].map((m) => m[1].replaceAll("&amp;", "&"));
  assert.deepEqual(
    actual,
    record.sections.flatMap((s) => s.urls),
  );
  assert.ok(!/本機預覽|候選・待覆核|未部署|待人工確認/.test(text));
  assert.ok(!/Rickie|Lawrence|Running Soba|karo on|mcfai|運動筆記|田總/.test(text));
  if (raceId === "hzmb-half-marathon-2026")
    assert.equal(
      (html.match(/id="review-hzmb-half-2025-participant-notes"/g) ?? []).length,
      1,
      "preserve one legacy review anchor without duplicating the old same-edition content",
    );
  const scores = html.match(/<dl\b[^>]*class="rating-grid quick-scores(?: [^"]*)?"[^>]*>[\s\S]*?<\/dl>/g) ?? [];
  assert.ok(
    scores.some((dl) =>
      Object.values(record.assessments).every((a) =>
        strip(dl).includes(a.score === null ? "未評" : `${a.score} / 5`),
      ),
    ),
    "missing confirmed scores",
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
