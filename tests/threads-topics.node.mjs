import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, isAbsolute } from "node:path";
import { Script } from "node:vm";
import { classifyTopics, TOPIC_RULE_VERSION, topicsForRecord } from "../scripts/threads/topics.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { cleanReport, cleaningDemo } from "../scripts/threads/clean.mjs";
import { buildConfirmed, confirmedCsv } from "../scripts/threads/confirmed.mjs";
import { renderConfirmed } from "../scripts/threads/confirmed-view.mjs";

async function fixture(t, path = ":memory:") {
  const source = cleanReport(await cleaningDemo(), "hk-marathon"),
    store = new ReviewStore(path);
  t?.after(() => store.close());
  const id = store.register(source);
  const content = (decision = "keep", extra = {}) =>
    store.save(id, {
      record_key: "comment:101",
      decision,
      race_name: "渣打香港馬拉松",
      event_year: 2027,
      note: "【虛構測試】非使用者覆核。",
      expected_revision: 0,
      ...extra,
    });
  content();
  const current = () => buildConfirmed(store.export(id));
  const save = (extra = {}) => {
    const result = current(),
      item = result.records[0];
    return store.saveTopics(id, {
      item_id: item.id,
      status: "confirmed",
      labels: ["course"],
      note: "【虛構測試】人工主題修正，非使用者覆核。",
      expected_revision: item.topics.manual?.revision ?? 0,
      expected_evidence_digest: item.topics.evidence_digest,
      expected_review_fingerprint: result.review_fingerprint,
      ...extra,
    });
  };
  return { source, store, id, content, current, save };
}

test("multi-label Cantonese/English rules cover five themes without sentiment or quality ratings", () => {
  assert.deepEqual(
    classifyTopics("巴士接駁到起點，寄存快，水站唔夠水，賽道上斜，大會義工好清楚。").labels,
    ["transport", "baggage", "aid_stations", "course", "organization"],
  );
  assert.deepEqual(
    classifyTopics(
      "Shuttle bus, bag drop, water station, hilly route and race organization volunteers.",
    ).labels,
    ["transport", "baggage", "aid_stations", "course", "organization"],
  );
  assert.deepEqual(classifyTopics("冇水站").labels, ["aid_stations"]);
  assert.deepEqual(classifyTopics("水站非常好").labels, classifyTopics("水站非常差").labels);
});

test("matching uses literal discussion text, avoids URL/English-substring and generic-word guesses", () => {
  for (const text of [
    "business meeting",
    "of course I will run",
    "https://parking.example/route?baggage=1",
    "新加坡非常好",
    "安排好亂",
    "👍",
  ])
    assert.deepEqual(classifyTopics(text).labels, [], text);
  assert.deepEqual(classifyTopics(null).labels, []);
  assert.deepEqual(classifyTopics("巴士，https://example.com/route，寄存").labels, [
    "transport",
    "baggage",
  ]);
});

test("Unicode normalization keeps correct original-text evidence offsets and bounded excerpts", () => {
  const text = "🏃‍♀️ ＢＡＧＧＡＧＥ 與 巴士，冇水站；寄\u200b存。",
    result = classifyTopics(text);
  assert.deepEqual(result.labels, ["transport", "baggage", "aid_stations"]);
  assert.ok(result.evidence.some((row) => row.matched_text === "ＢＡＧＧＡＧＥ"));
  for (const hit of result.evidence) {
    assert.equal(text.slice(hit.start, hit.end), hit.matched_text);
    assert.ok(hit.excerpt.includes(hit.matched_text));
  }
  const repetitive = classifyTopics("寄存 ".repeat(1000));
  assert.ok(repetitive.evidence.length <= 10);
  assert.equal(repetitive.evidence_truncated, true);
  assert.equal(result.rule_version, TOPIC_RULE_VERSION);
});

test("automatic suggestions remain unconfirmed and do not inherit parent/source topics", () => {
  const record = {
    identity: "manual:example",
    original_text: "多謝分享。",
    source_url: "https://threads.com/transport/baggage",
    observations: [{ parent_text: "巴士 水站" }],
  };
  const topics = topicsForRecord(record);
  assert.equal(topics.status, "unclassified");
  assert.equal(topics.source, "automatic");
  assert.equal(topics.needs_review, true);
  assert.deepEqual(topics.effective_labels, []);
});

test("manual correction changes effective topics while raw text, sources and original suggestions survive", async (t) => {
  const f = await fixture(t),
    before = JSON.stringify(f.store.source(f.id)),
    first = f.current();
  assert.deepEqual(first.records[0].topics.automatic.labels, ["baggage"]);
  assert.equal(first.records[0].topics.status, "suggested");
  const saved = f.save({ labels: ["organization", "baggage"] });
  assert.deepEqual(saved.topics.effective_labels, ["baggage", "organization"]);
  assert.equal(saved.topics.status, "confirmed");
  assert.deepEqual(saved.topics.automatic.labels, ["baggage"]);
  assert.equal(saved.topic_summary.confirmed, 1);
  assert.equal(JSON.stringify(f.store.source(f.id)), before);
  assert.equal(f.store.decisions(f.id)[0].decision, "keep");
  assert.notEqual(saved.review_fingerprint, first.review_fingerprint);
  assert.equal(saved.topics.manual.history.length, 1);
});

test("uncertain, other and reset-to-automatic are distinct persisted states with history", async (t) => {
  const f = await fixture(t);
  f.save({ labels: ["other"] });
  assert.deepEqual(f.current().records[0].topics.effective_labels, ["other"]);
  const uncertain = f.save({ status: "uncertain", labels: [] });
  assert.equal(uncertain.topics.status, "uncertain");
  assert.deepEqual(uncertain.topics.effective_labels, []);
  assert.equal(uncertain.topic_summary.needs_review, 1);
  const reset = f.save({ status: "pending", labels: [] });
  assert.equal(reset.topics.status, "suggested");
  assert.deepEqual(reset.topics.effective_labels, ["baggage"]);
  assert.equal(reset.topics.manual.revision, 3);
  assert.equal(reset.topics.manual.history.length, 3);
});

test("invalid labels, empty confirmation, unknown items and stale versions cannot overwrite data", async (t) => {
  const f = await fixture(t);
  for (const change of [
    { labels: [] },
    { labels: ["toString"] },
    { labels: ["baggage", "baggage"] },
    { status: "approved" },
    { note: "x".repeat(2001) },
    { expected_revision: -1 },
    { raw: { text: "edited" } },
  ])
    assert.throws(
      () => f.save(change),
      (error) => error.status === 400,
    );
  assert.throws(
    () => f.save({ item_id: "f".repeat(64) }),
    (error) => error.status === 409,
  );
  assert.throws(
    () => f.save({ expected_evidence_digest: "0".repeat(64) }),
    (error) => error.status === 409,
  );
  const result = f.current(),
    item = result.records[0],
    stale = {
      item_id: item.id,
      status: "confirmed",
      labels: ["course"],
      note: "虛構測試",
      expected_revision: 0,
      expected_evidence_digest: item.topics.evidence_digest,
      expected_review_fingerprint: result.review_fingerprint,
    };
  f.save();
  assert.throws(
    () => f.store.saveTopics(f.id, stale),
    (error) => error.status === 409,
  );
  assert.equal(f.store.topicHistory(f.id, item.id).length, 1);
});

test("content exclusion hides topic data without deleting it; metadata corrections retain same-text decisions", async (t) => {
  const f = await fixture(t);
  f.save();
  const digest = f.current().records[0].topics.evidence_digest;
  f.content("keep", { expected_revision: 1, race_name: "美津濃香港跑步祭", event_year: 2026 });
  assert.equal(f.current().records[0].topics.status, "confirmed");
  assert.equal(f.current().records[0].topics.evidence_digest, digest);
  const visible = f.current(),
    item = visible.records[0];
  f.content("exclude", { expected_revision: 2 });
  assert.equal(f.current().records.length, 0);
  assert.equal(f.store.topicDecisions(f.id).length, 1);
  assert.throws(
    () =>
      f.store.saveTopics(f.id, {
        item_id: item.id,
        status: "uncertain",
        labels: [],
        note: "虛構測試",
        expected_revision: 1,
        expected_evidence_digest: digest,
        expected_review_fingerprint: f.current().review_fingerprint,
      }),
    (error) => error.status === 409,
  );
  f.content("keep", { expected_revision: 3 });
  assert.equal(f.current().records[0].topics.status, "confirmed");
});

test("new evidence snapshots do not inherit manual themes; stale evidence cannot claim confirmation", async (t) => {
  const f = await fixture(t);
  f.save();
  const original = f.current().records[0];
  const changed = structuredClone(f.source);
  const row = changed.records.find((row) => row.key === "comment:101");
  row.raw.text = "【虛構測試】巴士接駁安排。";
  row.clean_text = row.raw.text;
  const id = f.store.register(changed);
  f.store.save(id, {
    record_key: row.key,
    decision: "keep",
    race_name: "渣打香港馬拉松",
    event_year: 2027,
    note: "虛構測試",
    expected_revision: 0,
  });
  assert.equal(buildConfirmed(f.store.export(id)).records[0].topics.source, "automatic");
  const mismatched = topicsForRecord(
    { ...original, original_text: "巴士安排" },
    original.topics.manual,
  );
  assert.equal(mismatched.status, "stale");
  assert.equal(mismatched.needs_review, true);
  assert.equal(mismatched.source, "automatic");
});

test("topic decision and history roll back together on audit-write failure", async (t) => {
  const f = await fixture(t);
  f.store.db.exec(
    "CREATE TRIGGER abort_topic_test BEFORE INSERT ON topic_events BEGIN SELECT RAISE(ABORT,'fictional failure'); END;",
  );
  assert.throws(() => f.save());
  assert.deepEqual(f.store.topicDecisions(f.id), []);
  assert.equal(f.current().records[0].topics.status, "suggested");
});

test("topic corrections survive closing and reopening the private review database", async () => {
  const directory = mkdtempSync(join(tmpdir(), "nxtgo-topics-"));
  let f, restored;
  try {
    f = await fixture(null, join(directory, "review.sqlite"));
    f.save();
    const id = f.id;
    f.store.close();
    f = null;
    restored = new ReviewStore(join(directory, "review.sqlite"));
    const result = buildConfirmed(restored.export(id));
    assert.equal(result.records[0].topics.status, "confirmed");
    assert.deepEqual(result.records[0].topics.effective_labels, ["course"]);
    assert.equal(result.records[0].topics.manual.history.length, 1);
  } finally {
    f?.store.close();
    restored?.close();
    const root = realpathSync(tmpdir()),
      target = realpathSync(directory),
      within = relative(root, target);
    assert.ok(within && !within.startsWith("..") && !isAbsolute(within));
    rmSync(target, { recursive: true, force: true });
  }
});

test("JSON/CSV preserve auto evidence, manual provenance and correction status with escaping", async (t) => {
  const f = await fixture(t);
  f.save({ note: '=HYPERLINK("test")' });
  const result = f.current(),
    json = JSON.stringify(result),
    csv = confirmedCsv(result);
  assert.match(json, /matched_text/);
  assert.match(json, /human_confirmed/);
  assert.match(csv, /topic_status/);
  assert.ok(csv.includes("'=HYPERLINK("));
  assert.ok(csv.includes("confirmed"));
});

test("topic UI compiles, escapes notes and evidence, and supports human correction/filter controls", async (t) => {
  const f = await fixture(t);
  f.save({ note: "</textarea><img src=x onerror=alert(1)>" });
  const html = renderConfirmed(f.current(), {
    topicToken: "test",
    apiBase: "/api/reviews/" + f.id,
  });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
  assert.match(html, /儲存主題修正/);
  assert.match(html, /主題修改歷史/);
  assert.match(html, /id="topic"/);
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotThrow(() => new Script(script));
});
