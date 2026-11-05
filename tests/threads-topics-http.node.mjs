import { test } from "node:test";
import assert from "node:assert/strict";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { ManualStore } from "../scripts/threads/manual-store.mjs";
import { cleanReport, cleaningDemo } from "../scripts/threads/clean.mjs";
import { startReviewServer } from "../scripts/threads/review-server.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";

for (const mode of ["standalone", "manual"]) {
  test(`${mode}: topic correction HTTP saves, rejects stale writes and preserves evidence`, async (t) => {
    const reviews = new ReviewStore(":memory:"),
      manual = new ManualStore(":memory:");
    let source, batch;
    if (mode === "manual") {
      batch = manual.import({
        preset: "hk-marathon",
        target_year: 2027,
        kind: "comment",
        source_url: "https://www.threads.net/@fictional/post/TOPIC_TEST",
        text: "【虛構自動測試】寄存同水站位置。",
        username: "fixture",
        note: "非使用者覆核",
        link_scope: "item",
        root_url: "https://www.threads.net/@fictional/post/TOPIC_ROOT",
        parent_relation: "unknown",
        parent_url: "",
      }).batch_id;
      source = cleanReport(manual.report(batch), "hk-marathon");
    } else source = cleanReport(await cleaningDemo(), "hk-marathon");
    const id = reviews.register(source);
    if (batch) manual.remember(batch, id);
    const record = source.records.find((row) => row.kind === "comment");
    reviews.save(id, {
      record_key: record.key,
      decision: "keep",
      race_name: "香港測試路跑（虛構）",
      event_year: 2027,
      note: "【虛構自動測試】非使用者覆核。",
      expected_revision: 0,
    });
    const { server, url } =
      mode === "manual"
        ? await startManualServer({ store: manual, reviews })
        : await startReviewServer({ store: reviews, datasetId: id });
    t.after(async () => {
      await new Promise((resolve) => server.close(resolve));
      reviews.close();
      manual.close();
    });
    const base = mode === "manual" ? `/api/reviews/${id}` : "/api";
    const html = await (await fetch(url + base + "/confirmed")).text();
    const token = html.match(/name="topic-token" content="([a-f0-9]+)"/)[1];
    const get = async () => (await fetch(url + base + "/confirmed.json")).json();
    const before = await get(),
      item = before.records[0];
    const body = {
      item_id: item.id,
      status: "confirmed",
      labels: ["baggage", "organization"],
      note: "【虛構自動測試】修正主題，非使用者覆核。",
      expected_revision: 0,
      expected_evidence_digest: item.topics.evidence_digest,
      expected_review_fingerprint: before.review_fingerprint,
    };
    const post = (input = body, extra = {}) =>
      fetch(url + base + "/topics", {
        method: "POST",
        headers: {
          Origin: url,
          "Content-Type": "application/json",
          "X-Review-Token": token,
          ...extra,
        },
        body: JSON.stringify(input),
      });
    assert.equal((await post(body, { "X-Review-Token": "wrong" })).status, 403);
    assert.equal((await post(body, { Origin: "https://evil.example" })).status, 403);
    assert.equal((await post(body, { "Content-Type": "text/plain" })).status, 415);
    assert.equal((await post({ ...body, labels: [] })).status, 400);
    assert.equal(reviews.topicDecisions(id).length, 0);
    const saved = await post();
    assert.equal(saved.status, 200);
    assert.deepEqual((await saved.json()).topics.effective_labels, body.labels);
    const after = await get();
    assert.deepEqual(after.records[0].topics.effective_labels, body.labels);
    assert.equal(after.records[0].topics.status, "confirmed");
    assert.equal(after.records[0].original_text, item.original_text);
    assert.deepEqual(after.records[0].observations, item.observations);
    assert.equal(after.records[0].topics.manual.history.length, 1);
    assert.equal((await post()).status, 409);
    assert.equal(
      (await fetch(url + base + "/confirmed.csv?review=" + before.review_fingerprint)).status,
      409,
    );
    const csv = await fetch(url + base + "/confirmed.csv?review=" + after.review_fingerprint);
    assert.equal(csv.status, 200);
    assert.match(await csv.text(), /human_confirmed/);
    const refreshed = await (await fetch(url + base + "/confirmed")).text();
    assert.match(refreshed, /人工已確認/);
    assert.match(refreshed, /修正主題，非使用者覆核/);
    reviews.save(id, {
      record_key: record.key,
      decision: "exclude",
      race_name: "香港測試路跑（虛構）",
      event_year: 2027,
      note: "【虛構測試】非使用者覆核。",
      expected_revision: 1,
    });
    const excluded = await get();
    assert.equal(excluded.records.length, 0);
    const response = await post({
      ...body,
      expected_revision: 1,
      expected_review_fingerprint: excluded.review_fingerprint,
    });
    assert.equal(response.status, 409);
    assert.equal(reviews.topicHistory(id, item.id).length, 1);
  });
}
