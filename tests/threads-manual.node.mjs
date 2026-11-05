import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute } from "node:path";
import { execFileSync } from "node:child_process";
import {
  ManualStore,
  threadsReference,
  validateManualInput,
} from "../scripts/threads/manual-store.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { Store } from "../scripts/threads/store.mjs";
import { cleanReport } from "../scripts/threads/clean.mjs";
import { renderCleanReport } from "../scripts/threads/clean-view.mjs";
import { renderReview } from "../scripts/threads/review-view.mjs";
import { renderManualImport } from "../scripts/threads/manual-view.mjs";
import { parseImportOptions } from "../scripts/import-threads.mjs";

const ROOT = "https://www.threads.net/@fictional_fixture/post/DEMO_ROOT";
const COMMENT = "https://www.threads.com/@fictional_fixture/post/DEMO_COMMENT";
const input = (extra = {}) => ({
  preset: "hk-marathon",
  target_year: 2027,
  kind: "post",
  text: "【虛構測試】渣馬 2027 起點及寄存安排。",
  source_url: ROOT,
  username: "fixture",
  note: "虛構測試資料，非真實帖子。",
  link_scope: "item",
  root_url: "",
  parent_relation: "unknown",
  parent_url: "",
  ...extra,
});
function fixture(t) {
  const store = new ManualStore(":memory:");
  t.after(() => store.close());
  return store;
}
function removeTemp(directory) {
  const target = realpathSync(directory),
    root = realpathSync(tmpdir()),
    within = relative(root, target);
  assert.ok(within && !within.startsWith("..") && !isAbsolute(within));
  rmSync(target, { recursive: true, force: true });
}

test("source identities unify Threads domains, handles and tracking without inventing API IDs", () => {
  const first = threadsReference(ROOT + "?xmt=test#reply"),
    second = threadsReference("https://threads.com/@renamed/post/DEMO_ROOT/");
  assert.equal(first.id, second.id);
  assert.match(first.id, /^manual-[a-f0-9]{64}$/);
  assert.equal(first.url, "https://www.threads.com/@fictional_fixture/post/DEMO_ROOT");
  assert.equal(threadsReference("https://threads.net/t/DEMO_ROOT").id, first.id);
  for (const url of [
    "http://threads.net/@x/post/X",
    "https://threads.com.evil.example/@x/post/X",
    "https://u:p@threads.com/@x/post/X",
    "https://threads.com/search?q=abc",
    "javascript:alert(1)",
  ])
    assert.throws(() => threadsReference(url));
});

test("manual import preserves exact text, submitted link and unverified provenance", (t) => {
  const store = fixture(t),
    raw = "　【虛構測試】渣馬\r\n寄存安排。\u200b ";
  const saved = store.import(input({ text: raw, source_url: ROOT + "?xmt=test" }));
  const report = store.report(saved.batch_id),
    post = report.posts[0];
  assert.equal(report.mode, "manual");
  assert.equal(report.run.search_type, "MANUAL");
  assert.deepEqual(report.queries, []);
  assert.equal(post.raw.text, raw);
  assert.equal(post.raw.source_url_submitted, ROOT + "?xmt=test");
  assert.equal(post.raw.ingestion_method, "manual_paste");
  assert.equal(post.raw.source_verified, false);
  assert.equal(post.raw.timestamp, null);
  assert.equal(post.raw.id, threadsReference(ROOT).id);
});

test("exact resubmission is idempotent; edits and deliberate reversion retain version history", (t) => {
  const store = fixture(t),
    first = store.import(input());
  assert.equal(store.import(input()).status, "already_imported");
  assert.equal(store.batches()[0].versions, 1);
  assert.equal(store.import(input({ text: "【虛構測試】渣馬修訂後內容。" })).status, "new_version");
  assert.equal(store.batches()[0].items, 1);
  assert.equal(store.batches()[0].versions, 2);
  assert.equal(store.import(input()).status, "new_version");
  assert.equal(store.batches()[0].versions, 3);
  assert.equal(store.report(first.batch_id).posts[0].raw.text, input().text);
  assert.equal(store.exportRaw(first.batch_id).observations.length, 3);
});

test("comment with only a root link preserves unknown parent and never invents a permalink", (t) => {
  const store = fixture(t),
    batch = store.import(input());
  store.import(
    input({
      kind: "comment",
      source_url: ROOT,
      link_scope: "root",
      text: "【虛構測試】寄存區喺邊度？",
      username: "demo_reply",
    }),
  );
  const report = store.report(batch.batch_id),
    comment = report.comments[0];
  assert.equal(comment.parent_id, null);
  assert.equal(comment.raw.permalink, null);
  assert.equal(comment.raw.replied_to, undefined);
  assert.equal(comment.raw.manual_identity, "root_text_observation");
  assert.equal(comment.root_post_id, threadsReference(ROOT).id);
  assert.equal(comment.raw.source_post_url, threadsReference(ROOT).url);
  assert.equal(
    cleanReport(report, "hk-marathon").records.find((row) => row.kind === "comment").disposition,
    "review",
  );
});

test("explicit root/nested relationships flow through cleaning even when root is imported last", (t) => {
  const store = fixture(t);
  const first = store.import(
    input({
      kind: "comment",
      source_url: COMMENT,
      root_url: ROOT,
      parent_relation: "root",
      text: "【虛構測試】寄存安排好清楚。",
    }),
  );
  store.import(
    input({
      kind: "comment",
      source_url: "https://threads.com/@fixture/post/DEMO_NESTED",
      root_url: ROOT,
      parent_relation: "comment",
      parent_url: COMMENT,
      text: "【虛構測試】幾點到起點？",
    }),
  );
  assert.ok(
    cleanReport(store.report(first.batch_id), "hk-marathon").records.every(
      (row) => row.disposition === "review",
    ),
  );
  store.import(input());
  const cleaned = cleanReport(store.report(first.batch_id), "hk-marathon");
  assert.ok(cleaned.records.every((row) => row.disposition === "keep"));
  assert.equal(
    cleaned.records.find((row) => row.id === threadsReference(COMMENT).id).relevance_basis,
    "parent_context",
  );
});

test("invalid input cannot create a batch or forged parent context", (t) => {
  const store = fixture(t);
  for (const extra of [
    { text: "  " },
    { target_year: 2027.5 },
    { preset: "toString" },
    { text: "x".repeat(20001) },
    { source_url: "https://evil.example/" },
    { kind: "comment", root_url: ROOT },
    {
      kind: "comment",
      source_url: COMMENT,
      root_url: ROOT,
      parent_relation: "comment",
      parent_url: COMMENT,
    },
    {
      kind: "comment",
      source_url: COMMENT,
      root_url: ROOT,
      parent_relation: "root",
      parent_url: COMMENT,
    },
    { kind: "post", link_scope: "root" },
  ])
    assert.throws(() => store.import(input(extra)));
  assert.equal(store.batches().length, 0);
});

test("transactions roll back an import completely when storing evidence fails", (t) => {
  const store = fixture(t);
  store.db.exec(
    "CREATE TRIGGER reject_test BEFORE INSERT ON manual_observations BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
  );
  assert.throws(() => store.import(input()));
  assert.equal(store.batches().length, 0);
});

test("race/year batches stay separate and selection alone never becomes relevance evidence", (t) => {
  const store = fixture(t);
  const first = store.import(input({ text: "【虛構測試】今日去食飯。" }));
  store.import(input({ preset: "mizuno-run-fest" }));
  store.import(input({ target_year: 2026 }));
  assert.equal(store.batches().length, 3);
  assert.equal(
    cleanReport(store.report(first.batch_id), "hk-marathon").records[0].relevance,
    "review",
  );
});

test("cleaned manual evidence enters review; changed input preserves old snapshots and decisions", (t) => {
  const store = fixture(t),
    reviews = new ReviewStore(":memory:");
  t.after(() => reviews.close());
  const saved = store.import(input()),
    cleaned = cleanReport(store.report(saved.batch_id), "hk-marathon"),
    id = reviews.register(cleaned);
  store.remember(saved.batch_id, id);
  reviews.save(id, {
    record_key: cleaned.records[0].key,
    decision: "keep",
    race_name: "渣打香港馬拉松",
    event_year: 2027,
    note: "【虛構測試】非使用者覆核。",
    expected_revision: 0,
  });
  const same = reviews.register(cleanReport(store.report(saved.batch_id), "hk-marathon"));
  assert.equal(same, id);
  store.import(input({ text: "【虛構測試】渣馬不同版本。" }));
  const next = reviews.register(cleanReport(store.report(saved.batch_id), "hk-marathon"));
  store.remember(saved.batch_id, next);
  assert.notEqual(next, id);
  assert.equal(reviews.state(next).summary.pending, 1);
  assert.equal(reviews.state(id).summary.keep, 1);
  assert.equal(reviews.export(id).records[0].automatic.raw.text, input().text);
  assert.equal(reviews.source(id).mode, "manual");
  assert.equal(store.batches()[0].snapshots.length, 2);
});

test("manual database and versioned originals survive reopening and reject other database families", () => {
  const directory = mkdtempSync(join(tmpdir(), "nxtgo-manual-"));
  let store;
  try {
    const path = join(directory, "manual.sqlite");
    store = new ManualStore(path);
    const saved = store.import(input());
    store.close();
    store = new ManualStore(path);
    assert.equal(store.report(saved.batch_id).posts[0].raw.text, input().text);
    store.close();
    store = undefined;
    assert.throws(() => new ManualStore(path, "demo"), /獨立資料庫/);
    const before = readFileSync(path);
    assert.throws(() => new ReviewStore(path));
    assert.deepEqual(readFileSync(path), before);
    const rawPath = join(directory, "collector.sqlite"),
      raw = new Store(rawPath);
    raw.close();
    const rawBefore = readFileSync(rawPath);
    assert.throws(() => new ManualStore(rawPath));
    assert.deepEqual(readFileSync(rawPath), rawBefore);
  } finally {
    store?.close();
    removeTemp(directory);
  }
});

test("manual source links remain visible as root-only and all HTML stays escaped", (t) => {
  const store = fixture(t),
    reviews = new ReviewStore(":memory:");
  t.after(() => reviews.close());
  const saved = store.import(
    input({
      kind: "comment",
      link_scope: "root",
      text: "<img src=x onerror=alert(1)>渣馬",
      username: "<svg>",
    }),
  );
  const source = cleanReport(store.report(saved.batch_id), "hk-marathon"),
    id = reviews.register(source);
  const html = renderCleanReport(source, { reviewUrl: "/review/" + id });
  assert.match(html, /來源及作者未經 API 驗證/);
  assert.match(html, /沒有留言獨立連結/);
  assert.doesNotMatch(html, /<img|<svg/);
  const review = renderReview(source, reviews.state(id), {}, "test", {
    apiBase: "/api/reviews/" + id,
    importNavigation: true,
  });
  assert.match(review, /name="review-api" content="\/api\/reviews\//);
  assert.match(review, /href="\/api\/reviews\/.*\/export"/);
  assert.doesNotMatch(review, /<img|<svg/);
  assert.match(renderManualImport("manual", "test"), /不會開啟或抓取連結/);
});

test("CLI defaults to a private empty manual workspace with offline help", () => {
  const options = parseImportOptions([]);
  assert.equal(options.mode, "manual");
  assert.equal(options.port, 3332);
  assert.notEqual(options.db, options.reviewDb);
  for (const args of [
    ["--db", "public/leak.sqlite"],
    ["--port", "70000"],
    ["--db", ".editorial-private/a.sqlite", "--review-db", ".editorial-private/a.sqlite"],
  ])
    assert.throws(() => parseImportOptions(args));
  assert.match(
    execFileSync(process.execPath, ["scripts/import-threads.mjs", "--help"], { encoding: "utf8" }),
    /no token or scoring/,
  );
  assert.throws(() => validateManualInput({ ...input(), raw: { verified: true } }));
});
