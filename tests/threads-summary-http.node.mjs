import { test } from "node:test";
import assert from "node:assert/strict";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { ManualStore } from "../scripts/threads/manual-store.mjs";
import { cleanReport, cleaningDemo } from "../scripts/threads/clean.mjs";
import { startReviewServer } from "../scripts/threads/review-server.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";

for (const mode of ["standalone", "manual"])
  test(`${mode}: summary grouping, authenticated corrections, receipts and stale exports work end-to-end`, async (t) => {
    const reviews = new ReviewStore(":memory:"),
      manual = new ManualStore(":memory:");
    let source, batch;
    if (mode === "manual") {
      batch = manual.import({
        preset: "hk-marathon",
        target_year: 2027,
        kind: "comment",
        source_url: "https://www.threads.net/@fictional/post/SUMMARY_ROOT",
        text: "【虛構自動測試】寄存標示清楚。水站冇水。",
        username: "fixture",
        note: "非使用者覆核。",
        link_scope: "root",
        root_url: "",
        parent_relation: "unknown",
        parent_url: "",
      }).batch_id;
      source = cleanReport(manual.report(batch), "hk-marathon");
    } else source = cleanReport(await cleaningDemo(), "hk-marathon");
    const id = reviews.register(source);
    if (batch) manual.remember(batch, id);
    const record = source.records.find((row) => row.kind === "comment");
    const content = {
      record_key: record.key,
      decision: "keep",
      race_name: "香港測試路跑（虛構）",
      event_year: 2027,
      note: "【虛構測試】非使用者覆核。",
      expected_revision: 0,
    };
    reviews.save(id, content);
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
    const page = await fetch(url + base + "/summary");
    assert.equal(page.status, 200);
    const html = await page.text();
    const token = html.match(/name="summary-token" content="([a-f0-9]+)"/)[1];
    assert.ok(html.includes("原文及來源"));
    assert.ok(html.includes("修正摘要重點"));
    assert.ok((await (await fetch(url + base + "/confirmed")).text()).includes(base + "/summary"));
    const get = async () => (await fetch(url + base + "/summary.json")).json();
    const before = await get(),
      p = before.points[0];
    if (mode === "manual") {
      assert.equal(p.evidence.source_scope, "root");
      assert.ok(p.evidence.source_url.includes("SUMMARY_ROOT"));
      assert.ok(p.evidence.warnings.includes("manual_source_unverified"));
    }
    const input = {
      point_id: p.id,
      status: "confirmed",
      text: "【虛構自動測試】留言提及寄存標示。",
      note: "【虛構自動測試】非使用者覆核。",
      expected_revision: 0,
      expected_evidence_digest: p.evidence_digest,
      expected_summary_fingerprint: before.summary_fingerprint,
    };
    const post = (body = input, extra = {}) =>
      fetch(url + base + "/summary-review", {
        method: "POST",
        headers: {
          Origin: url,
          "Content-Type": "application/json",
          "X-Review-Token": token,
          ...extra,
        },
        body: JSON.stringify(body),
      });
    assert.equal((await post(input, { "X-Review-Token": "" })).status, 403);
    assert.equal((await post(input, { Origin: "https://evil.example" })).status, 403);
    assert.equal((await post(input, { "Content-Type": "text/plain" })).status, 415);
    assert.equal((await post({ ...input, text: "" })).status, 400);
    assert.equal(reviews.summaryDecisions(id).length, 0);
    const saved = await post();
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).point.text, input.text);
    const after = await get(),
      updated = after.points.find((row) => row.id === p.id);
    assert.equal(updated.status, "confirmed");
    assert.deepEqual(updated.evidence, p.evidence);
    assert.equal(updated.manual.history.length, 1);
    assert.equal((await post()).status, 409);
    assert.equal(
      (await fetch(url + base + "/summary.csv?summary=" + before.summary_fingerprint)).status,
      409,
    );
    const csv = await fetch(url + base + "/summary.csv?summary=" + after.summary_fingerprint);
    assert.equal(csv.status, 200);
    assert.ok((await csv.text()).includes(input.text));
    assert.ok((await (await fetch(url + base + "/summary")).text()).includes(input.text));
    const excluded = await post({
      ...input,
      status: "excluded",
      expected_revision: 1,
      expected_summary_fingerprint: after.summary_fingerprint,
    });
    assert.equal(excluded.status, 200);
    const result = await get();
    assert.equal(result.counts.excluded, 1);
    assert.equal(reviews.decisions(id)[0].decision, "keep");
    reviews.save(id, { ...content, decision: "exclude", expected_revision: 1 });
    const removed = await get();
    assert.equal(removed.points.length, 0);
    assert.equal(removed.archived_reviews.length, 1);
    assert.equal(
      (
        await post({
          ...input,
          expected_revision: 2,
          expected_summary_fingerprint: removed.summary_fingerprint,
        })
      ).status,
      409,
    );
    const audit = await (await fetch(url + base + "/export")).json();
    assert.equal(audit.summary_reviews[0].history.length, 2);
    assert.equal(audit.summary_reviews[0].history[0].basis.evidence.original_text, record.raw.text);
  });
