import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute } from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cleanReport, cleaningDemo } from "../scripts/threads/clean.mjs";
import { ReviewStore, validateDataset } from "../scripts/threads/review-store.mjs";
import { renderReview } from "../scripts/threads/review-view.mjs";
import { parseReviewOptions } from "../scripts/review-threads.mjs";
import { Store } from "../scripts/threads/store.mjs";

async function fixture(t) {
  const source = cleanReport(await cleaningDemo(), "hk-marathon");
  const store = new ReviewStore(":memory:");
  t.after(() => store.close());
  return { source, store, id: store.register(source) };
}
const input = (extra = {}) => ({
  record_key: "comment:106",
  decision: "keep",
  race_name: "渣打香港馬拉松",
  event_year: 2026,
  note: "【虛構自動測試】改為上屆。",
  expected_revision: 0,
  ...extra,
});
function removeTemp(directory) {
  const root = realpathSync(tmpdir()),
    target = realpathSync(directory),
    within = relative(root, target);
  assert.ok(within && !within.startsWith("..") && !isAbsolute(within));
  rmSync(target, { recursive: true, force: true });
}

test("all records start pending regardless of automatic keep/exclude decisions", async (t) => {
  const { store, id, source } = await fixture(t);
  const state = store.state(id);
  assert.equal(state.summary.pending, source.records.length);
  assert.equal(state.summary.keep, 0);
  assert.deepEqual(state.decisions, []);
  const exported = store.export(id);
  assert.equal(exported.mode, "demo");
  assert.ok(
    exported.records.every((row) => row.confirmed_decision === "pending" && row.manual === null),
  );
});

test("save race/year corrections and notes independently from immutable raw evidence", async (t) => {
  const { source, store, id } = await fixture(t);
  const before = JSON.stringify(store.source(id));
  const result = store.save(id, input());
  assert.equal(result.decision.event_year, 2026);
  assert.equal(result.decision.revision, 1);
  assert.equal(result.summary.keep, 1);
  assert.equal(JSON.stringify(store.source(id)), before);
  assert.deepEqual(store.source(id), JSON.parse(JSON.stringify(source)));
  const exported = store.export(id).records.find((row) => row.automatic.key === "comment:106");
  assert.equal(exported.automatic.disposition, "review");
  assert.equal(exported.manual.decision, "keep");
  assert.equal(exported.history.length, 1);
});

test("change decisions and restore pending while retaining append-only revisions", async (t) => {
  const { store, id } = await fixture(t);
  store.save(id, input());
  store.save(
    id,
    input({ decision: "exclude", expected_revision: 1, note: "【虛構自動測試】改為排除。" }),
  );
  const third = store.save(
    id,
    input({
      decision: "pending",
      race_name: "",
      event_year: null,
      expected_revision: 2,
      note: "【虛構自動測試】重新待覆核。",
    }),
  );
  assert.equal(third.decision.revision, 3);
  assert.equal(third.decision.race_name, null);
  assert.equal(third.decision.event_year, null);
  assert.equal(third.summary.keep, 0);
  assert.equal(third.summary.exclude, 0);
  assert.equal(third.summary.pending, 11);
  assert.deepEqual(
    store.history(id, "comment:106").map((row) => row.decision),
    ["pending", "exclude", "keep"],
  );
});

test("stale revisions never overwrite a decision made in another window", async (t) => {
  const { store, id } = await fixture(t);
  store.save(id, input());
  assert.throws(
    () => store.save(id, input({ decision: "exclude" })),
    (error) => error.status === 409,
  );
  assert.equal(store.decisions(id)[0].decision, "keep");
  assert.equal(store.history(id, "comment:106").length, 1);
});

test("invalid values, raw edits and unknown records cannot create saved decisions", async (t) => {
  const { store, id } = await fixture(t);
  for (const change of [
    { decision: "approved" },
    { event_year: "2026" },
    { event_year: 1800 },
    { event_year: 2026.5 },
    { expected_revision: -1 },
    { race_name: "x".repeat(201) },
    { note: "x".repeat(2001) },
    { raw: { text: "changed" } },
    { dataset_id: "other" },
  ]) {
    assert.throws(
      () => store.save(id, input(change)),
      (error) => error.status === 400,
    );
  }
  assert.throws(
    () => store.save(id, input({ record_key: "comment:999" })),
    (error) => error.status === 404,
  );
  assert.equal(store.decisions(id).length, 0);
});

test("history and current decision commit atomically on a storage failure", async (t) => {
  const { store, id } = await fixture(t);
  store.db.exec(
    "CREATE TRIGGER block_test_audit BEFORE INSERT ON manual_review_events BEGIN SELECT RAISE(ABORT,'fictional test failure'); END;",
  );
  assert.throws(() => store.save(id, input()));
  assert.deepEqual(store.decisions(id), []);
  assert.deepEqual(store.history(id, "comment:106"), []);
});

test("reopening SQLite restores corrections and the stable fictional demo source", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nxtgo-review-"));
  let store;
  try {
    const path = join(directory, "review.sqlite"),
      source = cleanReport(await cleaningDemo(), "hk-marathon");
    store = new ReviewStore(path);
    const id = store.register(source);
    store.save(id, input({ race_name: "其他香港路跑（虛構測試）" }));
    store.close();
    store = new ReviewStore(path);
    assert.equal(store.register(store.latestDemo()), id);
    assert.equal(store.decisions(id)[0].race_name, "其他香港路跑（虛構測試）");
    assert.equal(store.history(id, "comment:106").length, 1);
  } finally {
    store?.close();
    removeTemp(directory);
  }
});

test("same evidence retains reviews on rerun; changed evidence gets a separate dataset", async (t) => {
  const { store, id, source } = await fixture(t);
  store.save(id, input());
  const replay = structuredClone(source);
  replay.generated_at = "2099-01-01T00:00:00Z";
  assert.equal(store.register(replay), id);
  replay.records[0].raw.text += " edited";
  const changed = store.register(replay);
  assert.notEqual(changed, id);
  assert.deepEqual(store.decisions(changed), []);
  const real = structuredClone(source);
  real.mode = "collected";
  assert.notEqual(store.register(real), id);
  assert.equal(store.decisions(id).length, 1);
});

test("overriding one duplicate never propagates to other comments or publication data", async (t) => {
  const { store, id } = await fixture(t);
  store.save(id, input({ record_key: "comment:102", event_year: 2027 }));
  assert.equal(store.state(id).summary.keep, 1);
  assert.equal(store.state(id).summary.pending, 10);
  assert.equal(
    store.export(id).records.find((row) => row.automatic.key === "comment:101").confirmed_decision,
    "pending",
  );
});

test("review database refuses an existing collector file without changing its bytes", () => {
  const directory = mkdtempSync(join(tmpdir(), "nxtgo-review-guard-"));
  try {
    const path = join(directory, "raw.sqlite"),
      raw = new Store(path);
    raw.close();
    const original = readFileSync(path);
    assert.throws(() => new ReviewStore(path), /獨立覆核資料庫/);
    assert.deepEqual(readFileSync(path), original);
  } finally {
    removeTemp(directory);
  }
});

test("UI escapes original text, custom race names and notes, including export history", async (t) => {
  const { source, store, id } = await fixture(t);
  store.save(
    id,
    input({
      race_name: '\"><img src=x onerror=alert(1)>',
      note: "</textarea><script>alert(2)</script>",
    }),
  );
  source.records[0].clean_text = "<svg onload=alert(3)>";
  const history = Object.fromEntries(
    source.records.map((row) => [row.key, store.history(id, row.key)]),
  );
  const html = renderReview(source, store.state(id), history, "test-token");
  assert.doesNotMatch(html, /<img|<svg|<script>alert/);
  assert.match(html, /&lt;img/);
  assert.match(html, /&lt;script/);
  assert.match(html, /覆核修改歷史/);
  assert.match(html, /匯出覆核結果 JSON/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.ok(
    html.includes(`script-src 'sha256-${createHash("sha256").update(script).digest("base64")}'`),
  );
  assert.match(html, /connect-src 'self'/);
});

test("CLI validates private paths and dataset format, with help usable offline", async () => {
  assert.equal(parseReviewOptions(["--demo"]).port, 3330);
  for (const args of [
    [],
    ["--demo", "--input", ".editorial-private/source.json"],
    ["--input", "public/data.json"],
    ["--demo", "--review-db", "out/leak.sqlite"],
    ["--demo", "--port", "99999"],
  ])
    assert.throws(() => parseReviewOptions(args));
  const source = cleanReport(await cleaningDemo(), "hk-marathon");
  assert.throws(() => validateDataset({ ...source, target: { preset: "toString" } }));
  assert.throws(() =>
    validateDataset({ ...source, records: [source.records[0], source.records[0]] }),
  );
  assert.doesNotThrow(() => validateDataset({ ...source, records: [] }));
  assert.match(
    execFileSync(process.execPath, ["scripts/review-threads.mjs", "--help"], { encoding: "utf8" }),
    /no scoring/,
  );
});
