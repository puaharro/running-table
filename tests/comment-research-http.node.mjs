import { test } from "node:test";
import assert from "node:assert/strict";
import { ManualStore } from "../scripts/threads/manual-store.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";

test("mixed sources flow through saved evidence, human review, topics and summary without losing links or scope", async (t) => {
  const store = new ManualStore(":memory:", "manual", { multiSource: true });
  const reviews = new ReviewStore(":memory:");
  const { server, url } = await startManualServer({ store, reviews });
  t.after(async () => {
    await new Promise((r) => server.close(r));
    reviews.close();
    store.close();
  });
  const home = await (await fetch(url)).text();
  const token = home.match(/name="import-token" content="([^"]+)"/)[1];
  const post = async (path, body, review = false, extra = {}) =>
    fetch(url + path, {
      method: "POST",
      headers: {
        Origin: url,
        "Content-Type": "application/json",
        [review ? "X-Review-Token" : "X-Import-Token"]: token,
        ...extra,
      },
      body: JSON.stringify(body),
    });
  const make = (platform, source_url, text) => ({
    preset: "hzmb-half",
    target_year: 2025,
    kind: "post",
    text,
    source_url,
    username: "fixture",
    note: "虛構測試",
    link_scope: "item",
    root_url: "",
    parent_relation: "unknown",
    parent_url: "",
    source_platform: platform,
    posted_date: "",
    race_group: "半馬",
    runner_segment: "unknown",
    experience: "unknown",
    event_page_year: 2025,
  });
  const data = [
    make(
      "marathonsworld",
      "https://marathonsworld.com/artapp/rating_detail.php?rid=123456",
      "【虛構測試】港珠澳大橋半馬水站足夠。",
    ),
    make(
      "facebook",
      "https://www.facebook.com/groups/123/posts/456/?comment_id=789",
      "【虛構測試】港珠澳大橋半馬寄存順暢，但希望有更多沿途打氣。",
    ),
    make(
      "youtube",
      "https://youtu.be/ABCDEFGHIJK?lc=fixture",
      "【虛構測試】港珠澳大橋半馬賽道有斜。<script>alert(1)</script>",
    ),
  ];
  assert.equal(
    (await post("/api/import", data[0], false, { Origin: "https://foreign.example" })).status,
    403,
  );
  let batchId;
  for (const row of data) {
    const response = await post("/api/import", row);
    assert.equal(response.status, 200);
    batchId = (await response.json()).batch_id;
  }
  const prepared = await (await post("/api/prepare", { batch_id: batchId })).json();
  const id = prepared.dataset_id;
  assert.equal(reviews.source(id).records.length, 3);
  const clean = await (await fetch(url + prepared.clean_url)).text();
  assert.ok(clean.includes("YouTube"));
  assert.ok(clean.includes("出帖：未知"));
  assert.ok(!clean.includes("<script>alert(1)</script>"));
  const before = await (await fetch(url + prepared.confirmed_url + ".json")).json();
  assert.equal(before.records.length, 0);
  for (const record of reviews.source(id).records) {
    const response = await post(
      `/api/reviews/${id}/review`,
      {
        record_key: record.key,
        decision: "keep",
        race_name: "港珠澳大橋香港段半馬拉松",
        event_year: 2025,
        note: "虛構測試決定",
        expected_revision: 0,
      },
      true,
    );
    assert.equal(response.status, 200);
  }
  const confirmed = await (await fetch(url + prepared.confirmed_url + ".json")).json();
  assert.equal(confirmed.records.length, 3);
  for (const record of confirmed.records) {
    assert.ok(record.source_url);
    assert.equal(record.source_metadata.posted_date, null);
    assert.equal(record.source_metadata.group, "半馬");
    assert.ok(record.warnings.includes("manual_source_unverified"));
    assert.ok(!Object.hasOwn(record, "score"));
  }
  const summary = await (await fetch(`${url}/api/reviews/${id}/summary.json`)).json();
  assert.ok(summary.points.length >= 3);
  for (const point of summary.points) {
    assert.ok(point.evidence.source_url);
    assert.equal(point.evidence.source_metadata.event_page_year, 2025);
  }
  const csv = await (await fetch(`${url}/api/reviews/${id}/confirmed.csv`)).text();
  assert.ok(csv.includes("source_metadata"));
  const summaryCsv = await (await fetch(`${url}/api/reviews/${id}/summary.csv`)).text();
  assert.ok(summaryCsv.includes("source_metadata"));
  assert.ok(summaryCsv.includes("marathonsworld"));
  const reviewPage = await (await fetch(url + prepared.review_url)).text();
  assert.ok(reviewPage.includes("Facebook 公開帖"));
  assert.ok(reviewPage.includes("查看來源原文"));
  assert.equal(
    (await fetch(url + "/.editorial-private/research/comments/manual.sqlite")).status,
    404,
  );
});
