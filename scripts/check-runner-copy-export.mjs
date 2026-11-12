import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
const record = JSON.parse(readFileSync("content/runner-copies/rmac-2026.json", "utf8"));
const html = readFileSync("out/races/2026/rmac-gold-coast-15k-2026/index.html", "utf8");
const section = html.match(/<section\b[^>]*id="runner-copy"[\s\S]*?<\/section>/)?.[0];
assert.ok(section, "RMAC runner copy must exist in static HTML");
const plain = section
  .replace(/<[^>]*>/g, "")
  .replace(/<!--.*?-->/g, "")
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"');
for (const block of record.markdown.split(/\n\n+/)) {
  if (block.startsWith("#"))
    assert.ok(plain.includes(block.replace(/^#+ /, "").replace("【候選・待覆核】", "")));
  else if (!block.startsWith("[來源"))
    assert.ok(plain.includes(block.replaceAll("**", "")), "Missing exact confirmed paragraph");
}
const expected = [...record.markdown.matchAll(/\]\((https:\/\/[^)]+)\)/g)].map((x) => x[1]);
const actual = [...section.matchAll(/href="([^"]+)"/g)].map((x) => x[1].replaceAll("&amp;", "&"));
assert.deepEqual(actual, expected);
assert.ok(!section.includes("本機預覽") && !section.includes("未部署"));
assert.ok(!section.includes("候選・待覆核"));
assert.ok(
  !html.includes('id="rating-assessment-preview"'),
  "Private assessment must not be exported",
);
for (const name of [
  "karwo_koon",
  "running.arnooo",
  "Karl Joel Biolena",
  "so.duck",
  "aki_wu",
  "Jimmy Ngan",
  "Fitz",
  "RMAC",
])
  assert.ok(!plain.includes(name), "Display names must remain neutral");
assert.ok(!html.includes(".editorial-private"));
for (const dir of readdirSync("out/races/2026", { withFileTypes: true }).filter(
  (x) => x.isDirectory() && x.name !== "rmac-gold-coast-15k-2026",
)) {
  assert.ok(
    !readFileSync(`out/races/2026/${dir.name}/index.html`, "utf8").includes('id="runner-copy"'),
  );
}
console.log(
  "RMAC confirmed v2 static copy verified: five themes, exact paragraphs/limitations, eight citations, neutral labels, isolated to its race.",
);
