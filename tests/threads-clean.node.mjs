import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { readFileSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { cleanReport, cleaningDemo, normalizeText, PRESETS } from "../scripts/threads/clean.mjs";
import { renderCleanReport } from "../scripts/threads/clean-view.mjs";
import { parseCleanOptions } from "../scripts/clean-threads.mjs";
import { Store } from "../scripts/threads/store.mjs";

const item = (id, text, root = id, parent = null, username = "runner") => ({
  id,
  root_post_id: root,
  parent_id: parent,
  collected_at: "2026-11-01T00:00:00Z",
  keywords: ["渣馬"],
  raw: { id, text, username, timestamp: "2026-01-01T00:00:00Z", permalink: null },
});
const report = (posts = [], comments = []) => ({
  mode: "demo",
  run: { id: "fictional-run", race: "Fictional Hong Kong race", target_year: 2027 },
  queries: [],
  posts,
  comments,
});
const clean = (source) => cleanReport(source, "hk-marathon");

test("fictional end-to-end demo separates relevant, duplicate, unrelated and review", async () => {
  const source = await cleaningDemo(),
    before = JSON.stringify(source);
  const result = clean(source);
  assert.deepEqual(result.summary, {
    total: 11,
    keep: 3,
    review: 5,
    exclude: 3,
    duplicates: 1,
    unrelated: 2,
  });
  assert.equal(JSON.stringify(source), before);
  assert.equal(result.records.find((r) => r.id === "102").duplicate_of, "comment:101");
  assert.ok(
    result.records.find((r) => r.id === "108").reasons.includes("promotion_or_spam_suspected"),
  );
  assert.equal(result.records.find((r) => r.id === "103").relevance_basis, "parent_context");
  assert.equal(result.mode, "demo");
  assert.deepEqual(clean(source).records, result.records);
  assert.equal(clean(source).source_digest, result.source_digest);
  source.comments[0].raw.text += " changed";
  assert.notEqual(clean(source).source_digest, result.source_digest);
});

test("normalization preserves emoji joiners, accents, punctuation and raw text", () => {
  assert.equal(normalizeText("\ufeff ＳＣＨＫＭ\u200b  \r\n café 👨‍👩‍👧‍👦!  "), "SCHKM\ncafé 👨‍👩‍👧‍👦!");
  assert.equal(normalizeText(null), "");
  const source = report([item("1", "　渣馬\u200b  起點　")]);
  const result = clean(source);
  assert.equal(result.records[0].clean_text, "渣馬 起點");
  assert.equal(result.records[0].raw.text, "　渣馬\u200b  起點　");
});

test("all four Hong Kong presets match their explicit race aliases", () => {
  for (const [key, preset] of Object.entries(PRESETS)) {
    const result = cleanReport(report([item("1", preset.aliases[0] + " 2027 寄存安排")]), key);
    assert.equal(result.records[0].disposition, "keep", key);
  }
  for (const text of [
    "SCHKM2027",
    "跑完Hong Kong Marathon好開心",
    "Ｈｏｎｇ Ｋｏｎｇ Ｍａｒａｔｈｏｎ",
  ])
    assert.equal(clean(report([item("1", text)])).records[0].relevance, "relevant");
  assert.equal(clean(report([item("1", "xxSCHKMxx")])).records[0].relevance, "review");
});

test("discovery keyword alone and timestamp year do not establish edition or relevance", () => {
  const unrelated = clean(report([item("1", "今日食咗個菠蘿包。")]));
  assert.equal(unrelated.records[0].relevance, "review");
  const result = clean(report([item("1", "渣馬個起點交通安排。")]));
  assert.equal(result.records[0].disposition, "keep");
  assert.deepEqual(result.records[0].mentioned_years, []);
});

test("year conflicts, negation, comparison and promotional language require review", () => {
  for (const text of [
    "2026 渣馬寄存安排。",
    "渣馬2026同2027有咩分別？",
    "我唔係跑渣馬。",
    "渣馬 vs 大阪馬拉松",
    "渣馬加我 Telegram 報名",
  ]) {
    assert.equal(clean(report([item("1", text)])).records[0].disposition, "review", text);
  }
  const result = clean(
    report([item("1", "渣馬 2026 起點安排")], [item("2", "寄存區點去？", "1", "1")]),
  );
  assert.ok(
    result.records.find((r) => r.id === "2").reasons.includes("parent_edition_year_needs_review"),
  );
});

test("context follows nested parent chains; mixed races propagate to descendants", () => {
  const source = report(
    [item("100", "渣馬起點交通討論")],
    [item("101", "幾點開始寄存？", "100", "100"), item("102", "七點前要到。", "100", "101")],
  );
  assert.equal(clean(source).records.find((r) => r.id === "102").disposition, "keep");
  source.comments[0].raw.text = "渣馬同大阪馬拉松嘅起點分別。";
  assert.equal(clean(source).records.find((r) => r.id === "102").disposition, "review");
});

test("missing, cyclic and cross-root parents never establish inherited relevance", () => {
  const source = report(
    [item("100", "渣馬寄存安排")],
    [
      item("101", "寄存幾點開始？", "100", null),
      item("102", "起點點去？", "100", "999"),
      item("103", "渣馬有冇寄存？", "100", "104"),
      item("104", "起點喺邊？", "100", "103"),
      item("105", "交通安排點？", "200", "100"),
    ],
  );
  const rows = clean(source).records;
  for (const id of ["101", "102", "104", "105"])
    assert.equal(rows.find((r) => r.id === id).disposition, "review", id);
  assert.ok(rows.find((r) => r.id === "104").reasons.includes("incomplete_parent_chain"));
});

test("same platform ID across discovery and conversation is one evidence identity", () => {
  const root = item("100", "渣馬安排");
  const source = report(
    [root, item("101", "渣馬寄存區好清楚", "100", "100")],
    [item("101", "渣馬寄存區好清楚", "100", "100")],
  );
  const result = clean(source);
  assert.equal(result.summary.duplicates, 1);
  const duplicate = result.records.find((r) => r.duplicate_of);
  assert.equal(duplicate.key, "post:101");
  assert.equal(duplicate.duplicate_of, "comment:101");
  assert.equal(result.records.length, 3);
});

test("short agreement from different IDs/users stays separate and in review", () => {
  const result = clean(
    report(
      [item("100", "渣馬寄存安排")],
      [
        item("1", "好", "100", "100", "a"),
        item("2", "好", "100", "100", "a"),
        item("3", "👍", "100", "100", "b"),
      ],
    ),
  );
  assert.equal(result.summary.duplicates, 0);
  assert.equal(
    result.records.filter((r) => r.kind === "comment" && r.disposition === "review").length,
    3,
  );
});

test("long repeated text across authors or conversations is a candidate, never auto-removed", () => {
  const text = "渣馬寄存安排詳細資訊，請大家提早到場並按指示排隊完成寄存。";
  const source = report(
    [item("100", "渣馬交通討論"), item("200", "渣馬另一篇討論")],
    [
      item("1", text, "100", "100", "a"),
      item("2", text, "100", "100", "b"),
      item("3", text, "200", "200", "a"),
    ],
  );
  const result = clean(source);
  assert.equal(result.summary.duplicates, 0);
  for (const id of ["2", "3"]) {
    const row = result.records.find((r) => r.id === id);
    assert.equal(row.disposition, "review");
    assert.ok(row.possible_duplicate_of);
  }
});

test("unknown authors are not silently deduplicated by text", () => {
  const text = "渣馬呢段長文字內容只用作驗證未知作者會保留待覆核而唔會自動去重。";
  const result = clean(
    report(
      [item("100", "渣馬交通討論")],
      [item("1", text, "100", "100", null), item("2", text, "100", "100", null)],
    ),
  );
  assert.equal(result.summary.duplicates, 0);
  assert.equal(
    result.records.filter((r) => r.kind === "comment" && r.disposition === "review").length,
    2,
  );
});

test("HTML escapes raw text and labels every decision without executing content", async () => {
  const result = clean(await cleaningDemo());
  result.records[0].clean_text = "<img src=x onerror=alert(1)>";
  result.records[0].raw.text = "</script><script>alert(1)</script>";
  const html = renderCleanReport(result);
  assert.doesNotMatch(html, /<img|<script>alert/);
  assert.match(html, /全部是虛構示範資料/);
  assert.match(html, /data-disposition="review"/);
  assert.doesNotMatch(html, /未知／主帖/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(
    html.includes(`script-src 'sha256-${createHash("sha256").update(script).digest("base64")}'`),
  );
});

test("stored-run CLI cleans privately without changing its source database", () => {
  const base = resolve(
    ".editorial-private/threads/cleaned",
    `stored-test-${process.pid}-${Date.now()}`,
  );
  const dbPath = base + ".sqlite",
    output = base + ".json";
  let store;
  try {
    store = new Store(dbPath);
    const id = store.createRun({
      race: "Fictional Hong Kong race",
      year: 2027,
      keywords: ["渣馬"],
    });
    store.savePage(
      id,
      store.pendingQueries(id)[0],
      { data: [{ id: "100", text: "渣馬起點安排", username: "demo" }], next: null },
      true,
    );
    store.savePage(
      id,
      store.pendingPosts(id)[0],
      {
        data: [
          { id: "101", text: "寄存安排好清楚。", username: "demo2", replied_to: { id: "100" } },
        ],
        next: null,
      },
      false,
    );
    store.setStatus(id, "complete");
    store.close();
    store = undefined;
    const original = readFileSync(dbPath);
    execFileSync(
      process.execPath,
      [
        "scripts/clean-threads.mjs",
        "--run",
        id,
        "--preset",
        "hk-marathon",
        "--db",
        dbPath,
        "--format",
        "json",
        "--output",
        output,
      ],
      { encoding: "utf8" },
    );
    const result = JSON.parse(readFileSync(output, "utf8"));
    assert.equal(result.run.id, id);
    assert.equal(result.summary.keep, 2);
    assert.deepEqual(readFileSync(dbPath), original);
  } finally {
    store?.close();
    rmSync(output, { force: true });
    rmSync(dbPath, { force: true });
  }
});

test("offline CLI exports full audit records privately and refuses overwrite", () => {
  const output = resolve(
    ".editorial-private/threads/cleaned",
    `test-${process.pid}-${Date.now()}.json`,
  );
  try {
    const args = [
      "scripts/clean-threads.mjs",
      "--demo",
      "--preset",
      "hk-marathon",
      "--format",
      "json",
      "--output",
      output,
    ];
    const stdout = JSON.parse(
      execFileSync(process.execPath, args, {
        encoding: "utf8",
        env: { ...process.env, THREADS_ACCESS_TOKEN: "" },
      }),
    );
    assert.equal(stdout.summary.total, 11);
    const bytes = readFileSync(output, "utf8"),
      data = JSON.parse(bytes);
    assert.equal(data.mode, "demo");
    assert.equal(data.rule_version, "hk-clean-v2");
    assert.equal(data.records.length, data.summary.total);
    const retry = spawnSync(process.execPath, args, { encoding: "utf8" });
    assert.equal(retry.status, 2);
    assert.equal(readFileSync(output, "utf8"), bytes);
  } finally {
    rmSync(output, { force: true });
  }
  assert.throws(() => parseCleanOptions(["--demo", "--preset", "unknown"]));
  assert.throws(() =>
    parseCleanOptions(["--demo", "--preset", "hk-marathon", "--output", "public/leak.html"]),
  );
});
