import { test } from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, relative, isAbsolute } from "node:path";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { cleanReport, cleaningDemo } from "../scripts/threads/clean.mjs";
import { buildConfirmed } from "../scripts/threads/confirmed.mjs";
import { buildSummary, extractPoint, summaryCsv } from "../scripts/threads/summary.mjs";
import { classifyTopics } from "../scripts/threads/topics.mjs";
import { renderSummary } from "../scripts/threads/summary-view.mjs";

async function fixture(t, path = ":memory:") {
  const store = new ReviewStore(path),
    source = cleanReport(await cleaningDemo(), "hk-marathon"),
    id = store.register(source);
  t?.after(() => store.close());
  const keep = (key = "comment:101", extra = {}) =>
    store.save(id, {
      record_key: key,
      decision: "keep",
      race_name: "渣打香港馬拉松",
      event_year: 2027,
      note: "【虛構測試】非使用者覆核。",
      expected_revision: store.decisions(id).find((row) => row.record_key === key)?.revision ?? 0,
      ...extra,
    });
  keep();
  const current = () => buildSummary(store.export(id));
  const input = (extra = {}) => {
    const result = current(),
      p = result.points[0];
    return {
      point_id: p.id,
      status: "confirmed",
      text: "【虛構測試】跑手提到寄存標示及所需時間。",
      note: "【虛構測試】非使用者覆核。",
      expected_revision: p.manual?.revision ?? 0,
      expected_evidence_digest: p.evidence_digest,
      expected_summary_fingerprint: result.summary_fingerprint,
      ...extra,
    };
  };
  const topics = (labels, status = "confirmed") => {
    const c = buildConfirmed(store.export(id)),
      p = c.records[0];
    return store.saveTopics(id, {
      item_id: p.id,
      status,
      labels,
      note: "【虛構測試】",
      expected_revision: p.topics.manual?.revision ?? 0,
      expected_evidence_digest: p.topics.evidence_digest,
      expected_review_fingerprint: c.review_fingerprint,
    });
  };
  return {
    store,
    source,
    id,
    keep,
    current,
    input,
    topics,
    save: (extra) => store.saveSummary(id, input(extra)),
  };
}

test("summary uses only explicit eligible keeps and carries exact originals, source scope and provenance", async (t) => {
  const f = await fixture(t),
    r = f.current();
  assert.equal(r.counts.items, 1);
  assert.equal(r.points.length, 1);
  const p = r.points[0];
  assert.equal(p.status, "draft");
  assert.equal(p.topic, "baggage");
  assert.equal(p.topic_status, "suggested");
  assert.ok(p.evidence.original_text.includes(p.automatic.text));
  assert.equal(p.evidence.source_url, buildConfirmed(f.store.export(f.id)).records[0].source_url);
  assert.equal(p.evidence.observations[0].manual.decision, "keep");
  f.keep("comment:106", { race_name: "" });
  assert.equal(f.current().counts.items, 1);
  assert.equal(f.current().counts.needs_attention, 1);
  f.keep("comment:101", { decision: "exclude" });
  assert.equal(f.current().points.length, 0);
});
test("topic-relevant sentence extraction stays verbatim, preserves negation and original Unicode offsets", () => {
  const text = "🏃 報名完成。水站冇水！交通好方便。";
  const record = { original_text: text, topics: { automatic: classifyTopics(text) } };
  const p = extractPoint(record, "aid_stations");
  assert.equal(p.text, "水站冇水！");
  assert.equal(text.slice(p.start, p.end), p.text);
  const long = "🏃".repeat(220) + "寄存" + "甲".repeat(250);
  const q = extractPoint(
    { original_text: long, topics: { automatic: classifyTopics(long) } },
    "baggage",
  );
  assert.ok([...q.text].length <= 180);
  assert.ok(q.text.includes("寄存"));
  assert.equal(long.slice(q.start, q.end), q.text);
  assert.ok(!q.text.includes("\ufffd"));
  assert.equal(q.truncated, true);
  const english = "\n\nFirst sentence. Bag drop took 10.5 minutes. More detail.";
  assert.equal(
    extractPoint(
      { original_text: english, topics: { automatic: classifyTopics(english) } },
      "baggage",
    ).text,
    " Bag drop took 10.5 minutes.",
  );
  assert.equal(
    extractPoint(
      { original_text: "\n\n多謝分享。之後再睇。", topics: { automatic: { evidence: [] } } },
      "other",
    ).text,
    "多謝分享。",
  );
});
test("race/year/topic groups retain multi-label points and unclassified content without invented consensus", async (t) => {
  const f = await fixture(t);
  f.topics(["baggage", "organization"]);
  let r = f.current();
  assert.equal(r.counts.items, 1);
  assert.equal(r.points.length, 2);
  assert.equal(r.groups.length, 2);
  assert.equal(r.points[0].evidence.identity, r.points[1].evidence.identity);
  f.topics([], "uncertain");
  r = f.current();
  assert.equal(r.groups[0].topic, "unclassified");
  assert.equal(r.points[0].topic_status, "uncertain");
  f.keep("comment:106", { race_name: "香港另一場路跑（虛構）", event_year: 2026 });
  r = f.current();
  assert.ok(
    r.groups.some((g) => g.event_year === 2026 && g.race_name === "香港另一場路跑（虛構）"),
  );
});
test("manual summary editing, uncertain, exclusion and reset retain immutable evidence and independent review states", async (t) => {
  const f = await fixture(t),
    raw = f.store.source(f.id),
    before = f.current().points[0];
  f.save();
  let p = f.current().points[0];
  assert.equal(p.status, "confirmed");
  assert.notEqual(p.text, p.automatic.text);
  assert.deepEqual(p.evidence, before.evidence);
  assert.equal(p.manual.history[0].basis.evidence.original_text, before.evidence.original_text);
  f.save({ status: "uncertain", text: "【虛構測試】需再核對。" });
  assert.equal(f.current().counts.uncertain, 1);
  f.save({ status: "excluded", text: "" });
  assert.equal(f.current().counts.points, 0);
  assert.equal(f.current().counts.excluded, 1);
  assert.equal(f.store.decisions(f.id)[0].decision, "keep");
  f.save({ status: "pending", text: "此字不會套用" });
  p = f.current().points[0];
  assert.equal(p.status, "draft");
  assert.equal(p.text, p.automatic.text);
  assert.equal(p.manual.history.length, 4);
  assert.deepEqual(f.store.source(f.id), raw);
});
test("invalid, stale, unknown and raw-evidence edit requests never overwrite saved summary", async (t) => {
  const f = await fixture(t),
    initial = f.input();
  for (const extra of [
    { status: "confirmed", text: "" },
    { status: "bad" },
    { text: "x".repeat(2001) },
    { note: null },
    { expected_revision: -1 },
    { original_text: "forged" },
  ])
    assert.throws(() => f.store.saveSummary(f.id, { ...initial, ...extra }), { status: 400 });
  for (const extra of [
    { point_id: "0".repeat(64) },
    { expected_evidence_digest: "0".repeat(64) },
    { expected_revision: 1 },
  ])
    assert.throws(() => f.store.saveSummary(f.id, { ...initial, ...extra }), { status: 409 });
  assert.equal(f.store.summaryDecisions(f.id).length, 0);
  f.save();
  assert.throws(() => f.store.saveSummary(f.id, initial), { status: 409 });
  assert.equal(f.current().points[0].manual.history.length, 1);
});
test("topic provenance change marks old wording stale; moving group or excluding evidence archives it with receipts", async (t) => {
  const f = await fixture(t);
  f.save();
  const old = f.current().points[0];
  f.topics(["baggage"]);
  let r = f.current();
  assert.equal(r.points[0].status, "stale");
  assert.equal(r.points[0].text, r.points[0].automatic.text);
  f.save();
  f.keep("comment:101", { event_year: 2026 });
  r = f.current();
  assert.equal(r.points[0].status, "draft");
  assert.notEqual(r.points[0].id, old.id);
  assert.equal(r.archived_reviews.length, 1);
  assert.equal(r.archived_reviews[0].history[0].basis.event_year, 2027);
  f.keep("comment:101", { decision: "exclude" });
  r = f.current();
  assert.equal(r.points.length, 0);
  assert.equal(r.archived_reviews.length, 1);
});
test("changed raw snapshots never inherit human summaries; note-only edits preserve same-evidence wording", async (t) => {
  const f = await fixture(t);
  f.save();
  f.keep("comment:101", { note: "【虛構測試】補充備註" });
  assert.equal(f.current().points[0].status, "confirmed");
  const next = structuredClone(f.source);
  next.records.find((r) => r.key === "comment:101").raw.text += "【虛構新版本】";
  const id = f.store.register(next);
  f.store.save(id, {
    record_key: "comment:101",
    decision: "keep",
    race_name: "渣打香港馬拉松",
    event_year: 2027,
    note: "【虛構測試】",
    expected_revision: 0,
  });
  assert.ok(buildSummary(f.store.export(id)).points.every((p) => p.manual === null));
});
test("summary decision and audit history commit atomically", async (t) => {
  const f = await fixture(t);
  f.store.db.exec(
    "CREATE TRIGGER fail_summary BEFORE INSERT ON summary_events BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
  );
  assert.throws(() => f.save(), /fictional failure/);
  assert.equal(f.store.summaryDecisions(f.id).length, 0);
  assert.equal(f.current().points[0].status, "draft");
});
test("summary corrections survive database reopen", async () => {
  const dir = mkdtempSync(join(tmpdir(), "nxtgo-summary-")),
    path = join(dir, "review.sqlite");
  try {
    const f = await fixture(null, path);
    f.save();
    const pointId = f.current().points[0].id;
    f.store.close();
    const store = new ReviewStore(path);
    try {
      assert.equal(buildSummary(store.export(f.id)).points[0].status, "confirmed");
      assert.equal(store.summaryHistory(f.id, pointId).length, 1);
    } finally {
      store.close();
    }
  } finally {
    const base = resolve(tmpdir()),
      target = resolve(dir),
      rel = relative(base, target);
    assert.ok(rel && !rel.startsWith("..") && !isAbsolute(rel));
    rmSync(target, { recursive: true, force: true });
  }
});
test("summary HTML/JSON/CSV keep receipts and escape untrusted manual text without executing it", async (t) => {
  const f = await fixture(t);
  f.save({ text: "<script>alert(1)</script>\n=SUM(A1)", note: '=HYPERLINK("test")' });
  const r = f.current(),
    html = renderSummary(r, { token: "fake" }),
    csv = summaryCsv(r);
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.match(csv, /'=HYPERLINK/);
  assert.ok(csv.includes("original_text"));
  assert.ok(csv.includes("summary_status"));
  assert.ok(html.includes("全部是虛構測試資料"));
  assert.ok(html.includes("原文及來源"));
  new Script(html.match(/<script>([\s\S]*)<\/script>/)[1]);
  const json = JSON.parse(JSON.stringify(r));
  assert.equal(json.points[0].manual.history.length, 1);
  assert.equal(json.points[0].evidence.original_text, f.current().points[0].evidence.original_text);
});
