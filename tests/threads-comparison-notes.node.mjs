import { test } from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, relative, isAbsolute } from "node:path";
import { comparisonFixture } from "./fixtures/threads-comparison.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { renderComparison } from "../scripts/threads/comparison-view.mjs";
import { comparisonCsv } from "../scripts/threads/comparison.mjs";
function input(f, extra = {}) {
  const r = f.reviews.comparison(...f.ids),
    row = r.rows.find((r) => r.topic === "transport");
  return {
    left: f.ids[0],
    right: f.ids[1],
    selection: r.selection,
    note_topic: row.topic,
    differences: "【虛構測試】兩年留言提及不同接駁等候時間。",
    verification: "【虛構測試】待核對是否同一組別及出發時段。",
    expected_revision: row.manual_note?.revision ?? 0,
    expected_evidence_digest: row.evidence_digest,
    expected_comparison_fingerprint: r.comparison_fingerprint,
    ...extra,
  };
}
test("comparison notes save per theme with immutable source receipts and append-only edits including clearing", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  const before = f.compare(),
    first = input(f);
  f.reviews.saveComparisonNote(first);
  let r = f.reviews.comparison(...f.ids),
    row = r.rows[0];
  assert.equal(row.note_status, "current");
  assert.equal(row.manual_note.differences, first.differences);
  assert.deepEqual(row.left.points, before.rows[0].left.points);
  assert.equal(
    row.manual_note.history[0].basis.left.points[0].evidence.original_text,
    before.rows[0].left.points[0].evidence.original_text,
  );
  f.reviews.saveComparisonNote(input(f, { differences: "", verification: "" }));
  r = f.reviews.comparison(...f.ids);
  row = r.rows[0];
  assert.equal(row.manual_note.history.length, 2);
  assert.equal(row.manual_note.revision, 2);
  assert.equal(row.manual_note.differences, "");
  assert.equal(row.manual_note.history[1].differences, first.differences);
  assert.equal(r.rows[1].manual_note, null);
});
test("notes remain bound to orientation, snapshots, years and confirmed-only filter, independent of all/single-topic view", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  f.reviews.saveComparisonNote(input(f));
  assert.ok(f.reviews.comparison(...f.ids, { topic: "transport" }).rows[0].manual_note);
  assert.equal(f.reviews.comparison(...f.ids, { confirmed: true }).rows[0].manual_note, null);
  assert.equal(f.reviews.comparison(f.ids[1], f.ids[0]).rows[0].manual_note, null);
  assert.equal(
    f.reviews.comparison(...f.ids, { year_a: 2027, year_b: 2026 }).rows[0].manual_note,
    null,
  );
});
test("summary updates retain notes as stale until deliberately resaved against latest evidence", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  f.reviews.saveComparisonNote(input(f));
  f.save();
  let r = f.reviews.comparison(...f.ids);
  assert.equal(r.rows[0].note_status, "stale");
  assert.ok(r.rows[0].manual_note.differences.includes("虛構測試"));
  f.reviews.saveComparisonNote(input(f));
  r = f.reviews.comparison(...f.ids);
  assert.equal(r.rows[0].note_status, "current");
  assert.equal(r.rows[0].manual_note.history.length, 2);
});
test("invalid edits and stale revisions, comparison versions or evidence cannot overwrite notes", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  const before = input(f);
  for (const extra of [
    { differences: null },
    { verification: "x".repeat(2001) },
    { expected_revision: -1 },
    { original_text: "forged" },
    { selection: { ...before.selection, extra: 1 } },
    { note_topic: "bad" },
  ])
    assert.throws(() => f.reviews.saveComparisonNote({ ...before, ...extra }), { status: 400 });
  for (const extra of [
    { expected_revision: 1 },
    { expected_evidence_digest: "0".repeat(64) },
    { expected_comparison_fingerprint: "0".repeat(64) },
  ])
    assert.throws(() => f.reviews.saveComparisonNote({ ...before, ...extra }), { status: 409 });
  f.reviews.saveComparisonNote(before);
  assert.throws(() => f.reviews.saveComparisonNote(before), { status: 409 });
  assert.equal(f.reviews.comparison(...f.ids).rows[0].manual_note.history.length, 1);
});
test("history write failure rolls back note and current revision atomically", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  f.reviews.db.exec(
    "CREATE TRIGGER fail_note BEFORE INSERT ON comparison_note_events BEGIN SELECT RAISE(ABORT,'fictional note failure'); END;",
  );
  assert.throws(() => f.reviews.saveComparisonNote(input(f)), /fictional note failure/);
  assert.equal(f.reviews.comparisonNotes(...f.ids).length, 0);
});
test("excluding all evidence retains stale notes, chosen race/year and historical source receipts", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  f.reviews.saveComparisonNote(input(f));
  for (const id of f.ids) {
    const dec = f.reviews.decisions(id)[0];
    f.reviews.save(id, {
      record_key: dec.record_key,
      decision: "exclude",
      race_name: dec.race_name,
      event_year: dec.event_year,
      note: "【虛構測試】非使用者覆核。",
      expected_revision: 1,
    });
  }
  const r = f.reviews.comparison(...f.ids, { race: "hk-marathon", year_a: 2026, year_b: 2027 });
  assert.equal(r.rows[0].note_status, "stale");
  assert.equal(r.rows[0].left.points.length, 0);
  assert.ok(
    r.rows[0].manual_note.history[0].basis.left.points[0].evidence.source_url.includes(
      "COMPARE_2026",
    ),
  );
});
test("private comparison notes survive closing and reopening SQLite", () => {
  const dir = mkdtempSync(join(tmpdir(), "nxtgo-note-"));
  let f;
  try {
    f = comparisonFixture({
      reviewPath: join(dir, "reviews.sqlite"),
      manualPath: join(dir, "manual.sqlite"),
    });
    const ids = [...f.ids];
    f.reviews.saveComparisonNote(input(f));
    f.close();
    f = null;
    const store = new ReviewStore(join(dir, "reviews.sqlite"));
    try {
      const r = store.comparison(...ids);
      assert.equal(r.rows[0].manual_note.revision, 1);
      assert.equal(r.rows[0].manual_note.history.length, 1);
    } finally {
      store.close();
    }
  } finally {
    f?.close();
    const rel = relative(resolve(tmpdir()), resolve(dir));
    assert.ok(rel && !rel.startsWith("..") && !isAbsolute(rel));
    rmSync(dir, { recursive: true, force: true });
  }
});
test("HTML and comparison exports include notes, verification and history without executing untrusted content", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  f.reviews.saveComparisonNote(
    input(f, { differences: "<script>alert(1)</script>", verification: '=HYPERLINK("test")' }),
  );
  const r = f.reviews.comparison(...f.ids),
    html = renderComparison(r, { left: f.ids[0], right: f.ids[1], token: "fake" });
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("待核實事項"));
  new Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
  const csv = comparisonCsv(r);
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes("comparison_differences"));
  assert.equal(JSON.parse(JSON.stringify(r)).rows[0].manual_note.history.length, 1);
});
