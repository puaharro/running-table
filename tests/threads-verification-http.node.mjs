import { test } from "node:test";
import assert from "node:assert/strict";
import { comparisonFixture } from "./fixtures/threads-comparison.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";
import { startReviewServer } from "../scripts/threads/review-server.mjs";

test("private tracker HTTP creates and updates individual tasks, protects scope and versions, exports evidence", async (t) => {
  const f = comparisonFixture(),
    c = f.reviews.comparison(...f.ids),
    row = c.rows[0];
  f.reviews.saveComparisonNote({
    left: f.ids[0],
    right: f.ids[1],
    selection: c.selection,
    note_topic: "transport",
    differences: "【虛構測試】",
    verification: "【虛構測試】核對組別。",
    expected_revision: 0,
    expected_evidence_digest: row.evidence_digest,
    expected_comparison_fingerprint: c.comparison_fingerprint,
  });
  const { server, url } = await startManualServer({ store: f.manual, reviews: f.reviews }),
    standalone = await startReviewServer({ store: f.reviews, datasetId: f.ids[0] });
  t.after(async () => {
    await Promise.all([server, standalone.server].map((s) => new Promise((r) => s.close(r))));
    f.close();
  });
  const path = "/verification?note=" + row.note_id,
    html = await (await fetch(url + path)).text(),
    token = html.match(/name="task-token" content="([a-f0-9]+)"/)[1],
    id = html.match(/name="id" value="([a-f0-9]+)"/)[1];
  assert.ok(html.includes("全部是虛構測試資料"));
  assert.ok(html.includes("尚未建立"));
  const state = await (await fetch(url + "/verification.json?note=" + row.note_id)).json();
  assert.equal(state.tasks.length, 0);
  const input = {
    id,
    note_id: row.note_id,
    title: "【虛構 HTTP 測試】核對組別。",
    status: "pending",
    result: "",
    sources: [],
    checked_on: "",
    expected_revision: 0,
    expected_note_revision: 1,
    expected_evidence_digest: state.basis.evidence_digest,
  };
  const post = (body = input, extra = {}) =>
    fetch(url + "/verification-save", {
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
  assert.equal((await post({ ...input, status: "verified" })).status, 400);
  assert.equal((await post()).status, 200);
  assert.equal((await post()).status, 409);
  const verified = {
    ...input,
    status: "verified",
    result: "【虛構測試】非真實核實。",
    sources: ["https://example.invalid/fictional"],
    checked_on: "2026-11-02",
    expected_revision: 1,
  };
  assert.equal((await post(verified)).status, 200);
  const data = await (await fetch(url + "/verification.json")).json();
  assert.equal(data.counts.verified, 1);
  assert.equal(data.tasks[0].history.length, 2);
  assert.ok(
    data.tasks[0].history[0].basis.row.left.points[0].evidence.source_url.includes("COMPARE_2026"),
  );
  const refreshed = await (await fetch(url + path + "&task=" + id)).text();
  assert.ok(refreshed.includes("已保存第 2 版"));
  assert.ok(refreshed.includes("https://example.invalid/fictional"));
  const csv = await fetch(url + "/verification.csv?status=verified");
  assert.equal(csv.status, 200);
  assert.ok((await csv.text()).includes("COMPARE_2026"));
  assert.equal(
    (await (await fetch(url + "/verification.json?status=pending")).json()).tasks.length,
    0,
  );
  assert.equal((await fetch(url + "/verification?note=" + "0".repeat(64))).status, 404);
  assert.equal((await fetch(url + "/verification?status=bad")).status, 400);
  assert.equal(
    (await fetch(url + "/verification?note=" + row.note_id + "&task=" + "0".repeat(64))).status,
    404,
  );
  assert.equal(
    (await (await fetch(standalone.url + "/api/verification.json")).json()).tasks.length,
    0,
  );
  const singleHtml = await (await fetch(standalone.url + "/api/verification")).text(),
    singleToken = singleHtml.match(/name="task-token" content="([a-f0-9]+)"/)[1];
  assert.equal(
    (
      await fetch(standalone.url + "/api/verification-save", {
        method: "POST",
        headers: {
          Origin: standalone.url,
          "Content-Type": "application/json",
          "X-Review-Token": singleToken,
        },
        body: JSON.stringify({ ...verified, expected_revision: 2 }),
      })
    ).status,
    404,
  );
});
