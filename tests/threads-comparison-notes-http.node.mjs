import { test } from "node:test";
import assert from "node:assert/strict";
import { comparisonFixture } from "./fixtures/threads-comparison.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";
import { startReviewServer } from "../scripts/threads/review-server.mjs";
import { buildSummary } from "../scripts/threads/summary.mjs";

for (const mode of ["manual", "standalone"])
  test(`${mode}: comparison notes authenticate, persist history and bind evidence and exports`, async (t) => {
    const f = comparisonFixture();
    let left = f.ids[0],
      right = f.ids[1];
    if (mode === "standalone") {
      const source = f.reviews.source(left);
      source.records.push(f.reviews.source(right).records[0]);
      left = right = f.reviews.register(source);
      for (const [i, record] of source.records.entries())
        f.reviews.save(left, {
          record_key: record.key,
          decision: "keep",
          race_name: "渣打香港馬拉松",
          event_year: 2026 + i,
          note: "【虛構測試】非使用者覆核。",
          expected_revision: 0,
        });
    }
    const { server, url } =
      mode === "manual"
        ? await startManualServer({ store: f.manual, reviews: f.reviews })
        : await startReviewServer({ store: f.reviews, datasetId: left });
    t.after(async () => {
      await new Promise((r) => server.close(r));
      f.close();
    });
    const path = mode === "manual" ? "/compare" : "/api/compare",
      api = path + "-note",
      query = new URLSearchParams({
        left,
        right,
        race: "hk-marathon",
        year_a: "2026",
        year_b: "2027",
      }).toString();
    const html = await (await fetch(url + path + "?" + query)).text(),
      token = html.match(/name="comparison-token" content="([a-f0-9]+)"/)[1];
    const get = async () => (await fetch(url + path + ".json?" + query)).json();
    const before = await get(),
      row = before.rows[0];
    assert.ok(html.includes("留言差異"));
    assert.ok(html.includes("待核實事項"));
    const input = {
      left,
      right,
      selection: before.selection,
      note_topic: "transport",
      differences: "【虛構 HTTP 測試】兩年接駁等候時間不同。",
      verification: "【虛構 HTTP 測試】待核對組別，非使用者覆核。",
      expected_revision: 0,
      expected_evidence_digest: row.evidence_digest,
      expected_comparison_fingerprint: before.comparison_fingerprint,
    };
    const post = (body = input, extra = {}) =>
      fetch(url + api, {
        method: "POST",
        headers: {
          Origin: url,
          "Content-Type": "application/json",
          "X-Review-Token": token,
          ...extra,
        },
        body: JSON.stringify(body),
      });
    assert.equal((await post(input, { "X-Review-Token": "wrong" })).status, 403);
    assert.equal((await post(input, { Origin: "https://evil.example" })).status, 403);
    assert.equal((await post(input, { "Content-Type": "text/plain" })).status, 415);
    assert.equal((await post({ ...input, differences: null })).status, 400);
    assert.equal((await post({ ...input, left: "0".repeat(64) })).status, 404);
    assert.equal((await post()).status, 200);
    const after = await get();
    assert.deepEqual(after.rows[0].left.points, row.left.points);
    assert.equal(after.rows[0].manual_note.history.length, 1);
    assert.equal(after.rows[0].manual_note.verification, input.verification);
    assert.equal((await post()).status, 409);
    assert.equal(
      (await fetch(url + path + ".csv?" + query + "&version=" + before.comparison_fingerprint))
        .status,
      409,
    );
    const csv = await fetch(
      url + path + ".csv?" + query + "&version=" + after.comparison_fingerprint,
    );
    assert.equal(csv.status, 200);
    assert.ok((await csv.text()).includes(input.verification));
    assert.ok((await (await fetch(url + path + "?" + query)).text()).includes(input.differences));
    const summary = buildSummary(f.reviews.export(left)),
      p = summary.points[0];
    f.reviews.saveSummary(left, {
      point_id: p.id,
      status: "confirmed",
      text: "【虛構測試】摘要文字修改。",
      note: "【虛構測試】非使用者覆核。",
      expected_revision: 0,
      expected_evidence_digest: p.evidence_digest,
      expected_summary_fingerprint: summary.summary_fingerprint,
    });
    const changed = await get();
    assert.equal(changed.rows[0].note_status, "stale");
    assert.ok((await (await fetch(url + path + "?" + query)).text()).includes("比較依據已變"));
    assert.equal(
      (
        await post({
          ...input,
          differences: "",
          verification: "",
          expected_revision: 1,
          expected_evidence_digest: changed.rows[0].evidence_digest,
          expected_comparison_fingerprint: changed.comparison_fingerprint,
        })
      ).status,
      200,
    );
    assert.equal((await get()).rows[0].manual_note.history.length, 2);
  });
