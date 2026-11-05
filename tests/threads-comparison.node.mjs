import { comparisonFixture } from "./fixtures/threads-comparison.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildComparison, comparisonCsv } from "../scripts/threads/comparison.mjs";
import { renderComparison } from "../scripts/threads/comparison-view.mjs";

test("cross-snapshot comparison uses corrected race aliases and years while preserving separate evidence", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  const r = f.compare(),
    row = r.rows.find((r) => r.topic === "transport");
  assert.equal(r.selection.year_a, 2026);
  assert.equal(r.selection.year_b, 2027);
  assert.equal(r.race_name, "渣打香港馬拉松");
  assert.equal(r.rows.length, 7);
  assert.ok(row.left.points[0].text.includes("十分鐘"));
  assert.ok(row.right.points[0].text.includes("二十分鐘"));
  assert.notEqual(row.left.dataset_id, row.right.dataset_id);
  assert.equal(row.left.points[0].evidence.source_scope, "root");
  assert.ok(row.left.points[0].evidence.source_url.includes("COMPARE_2026"));
  assert.equal(row.left.points[0].topic_status, "suggested");
});
test("manual summary edits are inherited, exclusions and confirmed-only filters remain distinct from missing data", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  f.save();
  let r = f.compare({ topic: "transport", confirmed: true });
  assert.equal(r.rows[0].left.points[0].status, "confirmed");
  assert.equal(r.rows[0].right.status, "no_confirmed_summary");
  f.save(1, "excluded", "");
  r = f.compare({ topic: "transport" });
  assert.equal(r.rows[0].right.status, "only_excluded");
  assert.equal(r.rows[0].right.counts.excluded, 1);
  assert.equal(f.compare({ topic: "aid_stations" }).rows[0].left.status, "no_records");
  assert.equal(f.reviews.decisions(f.ids[1])[0].decision, "keep");
});
test("single snapshot supports explicitly corrected multi-year records; a single year cannot fabricate comparison", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  const [a] = f.exports();
  assert.equal(buildComparison(a, a).selection_complete, false);
  assert.deepEqual(buildComparison(a, a).rows, []);
  const combined = structuredClone(a),
    extra = structuredClone(f.exports()[1].records[0]);
  combined.records.push(extra);
  const r = buildComparison(combined, combined, { topic: "baggage" });
  assert.equal(r.selection_complete, true);
  assert.equal(r.rows[0].left.points.length, 1);
  assert.equal(r.rows[0].right.points.length, 1);
  assert.equal(f.compare({ year_a: 2026, year_b: 2026 }).selection_complete, false);
});
test("different races never enter a shared race comparison and malformed filters fail", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  const [a, b] = f.exports();
  b.records[0].manual.race_name = "另一場香港路跑（虛構）";
  const r = buildComparison(a, b, {
    race: "hk-marathon",
    year_a: 2026,
    year_b: 2027,
    topic: "transport",
  });
  assert.equal(r.rows[0].right.status, "no_records");
  assert.equal(r.rows[0].left.points.length, 1);
  for (const options of [
    { race: "invented" },
    { topic: "bad" },
    { year_a: 12 },
    { year_b: "2027" },
    { confirmed: "yes" },
  ])
    assert.throws(() => f.compare(options));
});
test("shared source identities across years are warned, not counted as independent new runners", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  const [a, b] = f.exports();
  b.records[0].automatic.id = a.records[0].automatic.id;
  const r = buildComparison(a, b, { topic: "transport" });
  assert.equal(r.rows[0].shared_identity_ids.length, 1);
  assert.ok(renderComparison(r).includes("同一來源身份出現在左右兩年"));
});
test("comparison fingerprints change on summary, topic or content updates but stay stable on repeated reads", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  const before = f.compare();
  assert.equal(before.comparison_fingerprint, f.compare().comparison_fingerprint);
  f.save();
  assert.notEqual(before.comparison_fingerprint, f.compare().comparison_fingerprint);
  const old = f.compare().comparison_fingerprint,
    dec = f.reviews.decisions(f.ids[0])[0];
  f.reviews.save(f.ids[0], {
    record_key: dec.record_key,
    decision: "exclude",
    race_name: dec.race_name,
    event_year: 2026,
    note: "【虛構測試】",
    expected_revision: 1,
  });
  assert.notEqual(old, f.compare({ year_a: 2026, year_b: 2027 }).comparison_fingerprint);
});
test("HTML and selected comparison exports preserve source receipts, statuses and escaping", (t) => {
  const f = comparisonFixture();
  t.after(f.close);
  f.save(0, "confirmed", "<script>alert(1)</script>");
  const r = f.compare({ topic: "transport" });
  const html = renderComparison(r, {
    catalog: f.reviews.catalog(),
    left: f.ids[0],
    right: f.ids[1],
    summaryBase: (id) => `/api/reviews/${id}`,
  });
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(html.includes("/summary#point-"));
  assert.ok(html.includes("沒有留言獨立連結"));
  assert.ok(html.includes("只看人工確認摘要"));
  assert.ok(html.includes("COMPARE_2026"));
  const csv = comparisonCsv(r);
  assert.ok(csv.includes("original_text"));
  assert.ok(csv.includes("transport"));
  assert.ok(!csv.includes('"baggage"'));
  assert.ok(comparisonCsv(f.compare({ topic: "aid_stations" })).includes("no_records"));
  assert.equal(JSON.parse(JSON.stringify(r)).rows[0].left.points[0].manual.history.length, 1);
});
