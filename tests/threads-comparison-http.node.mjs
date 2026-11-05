import { test } from "node:test";
import assert from "node:assert/strict";
import { comparisonFixture } from "./fixtures/threads-comparison.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";
import { startReviewServer } from "../scripts/threads/review-server.mjs";
import { ManualStore } from "../scripts/threads/manual-store.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";

test("manual cross-year HTTP comparison selects explicit snapshots, reflects edits, binds exports and isolates private data", async (t) => {
  const f = comparisonFixture(),
    { server, url } = await startManualServer({ store: f.manual, reviews: f.reviews });
  t.after(async () => {
    await new Promise((r) => server.close(r));
    f.close();
  });
  const query = new URLSearchParams({
    left: f.ids[0],
    right: f.ids[1],
    race: "hk-marathon",
    year_a: "2026",
    year_b: "2027",
    topic: "transport",
  }).toString();
  const path = url + "/compare",
    get = async () => (await fetch(path + ".json?" + query)).json();
  const html = await (await fetch(path + "?" + query)).text();
  assert.ok(html.includes("2026 年"));
  assert.ok(html.includes("2027 年"));
  assert.ok(html.includes("COMPARE_2027"));
  assert.ok(html.includes(`/api/reviews/${f.ids[0]}/summary#point-`));
  const before = await get();
  assert.equal(before.rows.length, 1);
  assert.equal(before.rows[0].left.points[0].status, "draft");
  assert.equal((await fetch(path + "?left=" + "0".repeat(64))).status, 404);
  assert.equal((await fetch(path + "?" + query + "&race=hk-marathon")).status, 400);
  assert.equal((await fetch(path + "?" + query + "&confirmed=bad")).status, 400);
  assert.equal((await fetch(path + "?left=" + f.ids[0] + "&year_a=2")).status, 400);
  const fp = before.comparison_fingerprint;
  f.save(0, "confirmed", "【虛構測試】人工摘要修正會出現在比較。");
  assert.equal((await fetch(path + ".csv?" + query + "&version=" + fp)).status, 409);
  const after = await get();
  assert.ok(after.rows[0].left.points[0].text.includes("人工摘要修正"));
  assert.equal(after.rows[0].left.points[0].manual.history.length, 1);
  const response = await fetch(path + ".csv?" + query + "&version=" + after.comparison_fingerprint);
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("content-disposition").includes("attachment"));
  assert.ok((await response.text()).includes("COMPARE_2026"));
  const filtered = await (await fetch(path + ".json?" + query + "&confirmed=1")).json();
  assert.equal(filtered.rows[0].right.status, "no_confirmed_summary");
  const dec = f.reviews.decisions(f.ids[0])[0];
  f.reviews.save(f.ids[0], {
    record_key: dec.record_key,
    decision: "exclude",
    race_name: dec.race_name,
    event_year: 2026,
    note: "【虛構測試】非使用者覆核。",
    expected_revision: 1,
  });
  assert.equal((await get()).rows[0].left.status, "no_records");
  assert.equal((await fetch(path, { method: "POST", headers: { Origin: url } })).status, 403);
  assert.ok(
    (await (await fetch(url + `/api/reviews/${f.ids[1]}/summary`)).text()).includes(
      "/compare?left=",
    ),
  );
});
test("standalone comparison stays in its opened dataset and empty workspaces remain usable", async (t) => {
  const f = comparisonFixture(),
    a = await startReviewServer({ store: f.reviews, datasetId: f.ids[0] }),
    manual = new ManualStore(":memory:"),
    reviews = new ReviewStore(":memory:"),
    b = await startManualServer({ store: manual, reviews });
  t.after(async () => {
    await Promise.all([a.server, b.server].map((server) => new Promise((r) => server.close(r))));
    f.close();
    manual.close();
    reviews.close();
  });
  const response = await fetch(a.url + "/api/compare");
  assert.equal(response.status, 200);
  assert.ok((await response.text()).includes("兩個不同年份"));
  assert.equal((await fetch(a.url + "/api/compare?right=" + f.ids[1])).status, 404);
  assert.equal((await fetch(b.url + "/compare")).status, 200);
  assert.ok((await (await fetch(b.url + "/compare")).text()).includes("尚未有保存的覆核快照"));
  assert.equal((await (await fetch(b.url + "/compare.json")).json()).selection_complete, false);
});
