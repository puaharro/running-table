import { test } from "node:test";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { cleanReport, cleaningDemo } from "../scripts/threads/clean.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { startReviewServer } from "../scripts/threads/review-server.mjs";

test("private review HTTP API: persistent decisions, conflicts, export and request isolation", async (t) => {
  const store = new ReviewStore(":memory:");
  const source = cleanReport(await cleaningDemo(), "hk-marathon"),
    id = store.register(source);
  const { server, url } = await startReviewServer({ store, datasetId: id });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close();
  });
  const html = await (await fetch(url)).text();
  const token = html.match(/name="review-token" content="([a-f0-9]+)"/)[1];
  const headers = { Origin: url, "X-Review-Token": token, "Content-Type": "application/json" };
  const input = {
    record_key: "comment:106",
    decision: "keep",
    race_name: "香港測試路跑（虛構）",
    event_year: 2026,
    note: "【自動化測試】虛構資料，非使用者覆核。",
    expected_revision: 0,
  };
  const post = (body = input, extra = {}) =>
    fetch(url + "/api/review", {
      method: "POST",
      headers: { ...headers, ...extra },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
  await t.test(
    "all records initially unreviewed; private database paths are unavailable",
    async () => {
      const response = await fetch(url + "/api/state");
      assert.equal(response.headers.get("access-control-allow-origin"), null);
      assert.equal((await response.json()).summary.pending, 11);
      assert.equal((await fetch(url + "/manual.sqlite")).status, 404);
      const foreignHostStatus = await new Promise((resolve, reject) => {
        const request = httpRequest(
          url + "/api/state",
          { headers: { Host: "evil.example" } },
          (response) => {
            response.resume();
            resolve(response.statusCode);
          },
        );
        request.on("error", reject);
        request.end();
      });
      assert.equal(foreignHostStatus, 403);
      assert.equal((await fetch(url, { method: "DELETE" })).status, 405);
    },
  );
  await t.test(
    "missing/wrong token, foreign origin and wrong content type do not mutate state",
    async () => {
      assert.equal((await post(input, { "X-Review-Token": "" })).status, 403);
      assert.equal((await post(input, { Origin: "https://evil.example" })).status, 403);
      assert.equal((await post(input, { "Content-Type": "text/plain" })).status, 415);
      assert.equal(store.decisions(id).length, 0);
    },
  );
  await t.test(
    "save confirms only the selected item, reload restores it, stale write returns 409",
    async () => {
      const response = await post();
      assert.equal(response.status, 200);
      assert.equal((await response.json()).decision.event_year, 2026);
      const state = await (await fetch(url + "/api/state")).json();
      assert.equal(state.summary.keep, 1);
      assert.equal(state.decisions[0].note, input.note);
      assert.match(await (await fetch(url)).text(), /香港測試路跑（虛構）/);
      assert.equal((await post({ ...input, decision: "exclude" })).status, 409);
      assert.equal(store.history(id, input.record_key).length, 1);
      assert.deepEqual(store.source(id), JSON.parse(JSON.stringify(source)));
    },
  );
  await t.test(
    "bad JSON, oversized data and invalid edits cannot damage prior reviews",
    async () => {
      assert.equal((await post("{broken")).status, 400);
      assert.equal((await post("x".repeat(17000))).status, 413);
      assert.equal((await post({ ...input, event_year: 12, expected_revision: 1 })).status, 400);
      assert.equal((await post({ ...input, record_key: "comment:999" })).status, 404);
      assert.equal(store.decisions(id)[0].revision, 1);
    },
  );
  await t.test(
    "export retains original, corrected fields and history and labels demo",
    async () => {
      const response = await fetch(url + "/api/export");
      assert.match(response.headers.get("content-disposition"), /attachment/);
      const result = await response.json();
      assert.equal(result.mode, "demo");
      assert.equal(result.summary.keep, 1);
      const row = result.records.find((row) => row.automatic.key === input.record_key);
      assert.equal(row.manual.race_name, input.race_name);
      assert.equal(row.history[0].event_year, 2026);
      assert.equal(
        result.records.find((row) => row.automatic.key === "comment:102").confirmed_decision,
        "pending",
      );
    },
  );
  await t.test(
    "confirmed dataset exports only current manual keeps and reflects subsequent changes",
    async () => {
      const response = await fetch(url + "/api/confirmed.json");
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.records.length, 1);
      assert.equal(data.records[0].event_year, 2026);
      assert.match(await (await fetch(url + "/api/confirmed")).text(), /已確認留言資料集/);
      const csv = await fetch(url + "/api/confirmed.csv");
      assert.match(csv.headers.get("content-type"), /text\/csv/);
      assert.match(await csv.text(), /race_name/);
      assert.equal(
        (await post({ ...input, decision: "pending", expected_revision: 1 })).status,
        200,
      );
      assert.equal((await (await fetch(url + "/api/confirmed.json")).json()).records.length, 0);
      assert.equal(
        (await fetch(url + "/api/confirmed.csv?review=" + data.review_fingerprint)).status,
        409,
      );
    },
  );
});
