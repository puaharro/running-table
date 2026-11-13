import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  selectedExperiences,
  assertConfirmedExperience,
} from "../../src/lib/confirmed-race-experience-schema.mjs";

const decode = (s) =>
  s.replace(/&(?:amp|quot|apos|lt|gt|#\d+|#x[\da-f]+);/gi, (entity) => {
    const named = { "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">" };
    if (named[entity]) return named[entity];
    return String.fromCodePoint(
      entity.toLowerCase().startsWith("&#x")
        ? parseInt(entity.slice(3), 16)
        : parseInt(entity.slice(2), 10),
    );
  });
const plain = (html) => decode(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, "")).trim();

// Read the controlled exported markup, including nested rating sections.
// This is deliberately not a general-purpose HTML parser or a visibility check.
function elements(html, tag, matches = () => true) {
  const token = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
  const found = [];
  let start,
    depth = 0,
    match;
  while ((match = token.exec(html))) {
    if (match[0].startsWith("</")) {
      if (depth && --depth === 0) found.push(html.slice(start, token.lastIndex));
    } else if (depth) depth++;
    else if (matches(match[0])) {
      start = match.index;
      depth = 1;
    }
  }
  return found;
}
const hasClass = (name) => (tag) => new RegExp(`\\bclass="[^"]*\\b${name}\\b[^"]*"`).test(tag);
const only = (values, label) => {
  assert.equal(values.length, 1, `${label}: expected one element`);
  return values[0];
};

export function contentTargets() {
  return Object.entries(selectedExperiences).map(([raceId, pin]) => {
    const record = JSON.parse(
      readFileSync(new URL(`../../content/race-experiences/${pin.file}`, import.meta.url), "utf8"),
    );
    assertConfirmedExperience(record, raceId);
    const year = raceId.match(/-(\d{4})$/)?.[1];
    assert.ok(year, `No route year for ${raceId}`);
    return {
      raceId,
      record,
      path: `races/${year}/${raceId}/index.html`,
      urlPath: `/races/${year}/${raceId}/`,
    };
  });
}

export function checkContent(html, record) {
  assertConfirmedExperience(record, record.raceId);
  const root = only(
    elements(html, "section", (tag) => /\bid="race-confirmed-experience"/.test(tag)),
    "confirmed experience",
  );
  assert.equal(plain(only(elements(root, "h2"), "title")), record.title, "title changed");
  const currentYear = record.raceId.match(/-(\d{4})$/)?.[1];
  assert.equal(
    plain(only(elements(root, "p", hasClass("review-edition-note")), "edition note")),
    `${record.year} 年 · ${record.group} · 往屆體驗，不代表 ${currentYear} 年安排或表現。`,
    "historical edition/group label changed",
  );
  const grid = only(elements(root, "dl", hasClass("experience-scores")), "scores");
  assert.deepEqual(
    elements(grid, "dt").map(plain),
    ["賽道體驗", "大會執行", "補給體驗"],
    "score dimensions changed",
  );
  // Use the record's actual dimension order below; never accept a score found elsewhere on the page.
  assert.deepEqual(
    elements(grid, "dd").map(plain),
    Object.values(record.assessments).map((a) => (a.score === null ? "未評" : `${a.score} / 5`)),
    "scores changed or moved",
  );
  const details = only(
    elements(root, "details", hasClass("experience-rating-details")),
    "rating details",
  );
  const ratings = elements(details, "section");
  assert.equal(ratings.length, 3, "missing complete rating");
  Object.values(record.assessments).forEach((a, i) => {
    assert.deepEqual(
      elements(ratings[i], "p").map(plain),
      [
        a.comment,
        ...(a.positives.length ? [`優點：${a.positives.join("；")}`] : []),
        ...(a.concerns.length ? [`關注：${a.concerns.join("；")}`] : []),
        `適用範圍：${a.suitedFor}`,
        `依據及限制：${a.basis}`,
      ],
      "complete rating wording changed",
    );
  });
  assert.ok(plain(details).includes(record.ruleVersion), "missing rating rule version");
  const topics = elements(root, "details", hasClass("experience-topic"));
  assert.equal(topics.length, 5, "missing topic");
  record.sections.forEach((part, i) => {
    const summary = only(elements(topics[i], "summary"), "topic summary");
    assert.equal(
      plain(only(elements(summary, "strong"), "topic label")),
      part.topic,
      "topic order changed",
    );
    const content = only(
      elements(topics[i], "div", hasClass("experience-topic-content")),
      "topic content",
    );
    const paragraphs = elements(content, "p").map(plain);
    assert.equal(paragraphs[0], part.body, "topic body changed");
    assert.equal(paragraphs[1], `觀察限制：${part.limitations}`, "limitations changed");
    const links = [...content.matchAll(/\bhref="([^"]+)"/g)].map((m) => decode(m[1]));
    assert.deepEqual(links, part.urls, "sources changed or moved between topics");
    if (!part.urls.length)
      assert.ok(paragraphs[2]?.includes("來源：未知"), "missing unknown source label");
  });
  assert.ok(
    !/本機預覽|候選・待覆核|未部署|待人工確認/.test(plain(root)),
    "workflow label in public content",
  );
  assert.ok(
    !/Rickie|Lawrence|Running Soba|karo on|mcfai|運動筆記|田總/.test(plain(root)),
    "non-neutral display name",
  );
  assert.ok(
    !/\.editorial-private|id="rating-assessment-preview"/.test(html),
    "private material in page",
  );
  return {
    raceId: record.raceId,
    year: record.year,
    copyRevision: record.copyRevision,
    ratingRevision: record.ratingRevision,
    scores: Object.values(record.assessments).map((a) => a.score),
    topics: 5,
  };
}
