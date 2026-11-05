import { test } from "node:test";
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { ManualStore } from "../scripts/threads/manual-store.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";

test("manual paste → cleaning → saved review works without a Threads token", async (t) => {
  const store = new ManualStore(":memory:"),
    reviews = new ReviewStore(":memory:");
  const { server, url } = await startManualServer({ store, reviews });
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    store.close();
    reviews.close();
  });
  const page = await (await fetch(url)).text(),
    token = page.match(/name="import-token" content="([a-f0-9]+)"/)[1];
  const headers = { Origin: url, "Content-Type": "application/json", "X-Import-Token": token };
  const rootUrl = "https://www.threads.net/@fictional_fixture/post/HTTP_DEMO_ROOT";
  const input = {
    preset: "hk-marathon",
    target_year: 2027,
    kind: "post",
    source_url: rootUrl,
    text: "【虛構測試】渣馬起點及寄存安排。",
    username: "fixture",
    note: "自動測試，非真實帖子。",
    link_scope: "item",
    root_url: "",
    parent_relation: "unknown",
    parent_url: "",
  };
  const post = (path, input, extra = {}) =>
    fetch(url + path, {
      method: "POST",
      headers: { ...headers, ...extra },
      body: typeof input === "string" ? input : JSON.stringify(input),
    });
  let batchId, datasetId, cleaned, commentKey;
  await t.test("starts empty and rejects invalid sources and cross-origin writes", async () => {
    assert.deepEqual((await (await fetch(url + "/api/batches")).json()).batches, []);
    assert.equal((await post("/api/import", input, { "X-Import-Token": "" })).status, 403);
    assert.equal(
      (await post("/api/import", input, { Origin: "https://evil.example" })).status,
      403,
    );
    assert.equal((await post("/api/import", input, { "Content-Type": "text/plain" })).status, 415);
    assert.equal(
      (await post("/api/import", { ...input, source_url: "https://evil.example/" })).status,
      400,
    );
    assert.equal((await post("/api/import", "x".repeat(131073))).status, 413);
    assert.equal(store.batches().length, 0);
    const status = await new Promise((resolve, reject) => {
      const req = httpRequest(
        url + "/api/batches",
        { headers: { Host: "evil.example" } },
        (res) => {
          res.resume();
          resolve(res.statusCode);
        },
      );
      req.on("error", reject);
      req.end();
    });
    assert.equal(status, 403);
    assert.equal((await fetch(url + "/manual.sqlite")).status, 404);
  });
  await t.test(
    "paste root and root-only reply with explicit parent; repeated paste adds no item",
    async () => {
      const root = await post("/api/import", input);
      assert.equal(root.status, 200);
      batchId = (await root.json()).batch_id;
      assert.equal((await (await post("/api/import", input)).json()).status, "already_imported");
      const comment = await post("/api/import", {
        ...input,
        kind: "comment",
        link_scope: "root",
        parent_relation: "root",
        text: "【虛構測試】寄存位置好清楚，我排咗十分鐘。",
        username: "fixture_reply",
      });
      assert.equal(comment.status, 200);
      const batches = await (await fetch(url + "/api/batches")).json();
      assert.equal(batches.batches[0].items, 2);
      assert.equal(batches.batches[0].versions, 2);
    },
  );
  await t.test(
    "prepares a manual snapshot whose clean view links directly to unreviewed items",
    async () => {
      const prepared = await post("/api/prepare", { batch_id: batchId });
      assert.equal(prepared.status, 200);
      const result = await prepared.json();
      datasetId = result.dataset_id;
      const cleanPage = await (await fetch(url + result.clean_url)).text();
      assert.match(cleanPage, /手動貼上資料/);
      assert.match(cleanPage, /沒有留言獨立連結/);
      assert.ok(cleanPage.includes(result.review_url));
      cleaned = await (await fetch(url + result.export_url)).json();
      assert.equal(cleaned.mode, "manual");
      assert.ok(
        cleaned.records.every(
          (record) =>
            record.raw.source_verified === false && record.raw.ingestion_method === "manual_paste",
        ),
      );
      commentKey = cleaned.records.find((record) => record.kind === "comment").key;
      const reviewPage = await (await fetch(url + result.review_url)).text();
      assert.ok(reviewPage.includes(`/api/reviews/${datasetId}`));
      assert.equal(reviews.state(datasetId).summary.pending, 2);
    },
  );
  await t.test(
    "review saves through the imported-snapshot endpoint and exports corrected fields",
    async () => {
      const path = `/api/reviews/${datasetId}/review`;
      const decision = {
        record_key: commentKey,
        decision: "keep",
        race_name: "渣打香港馬拉松",
        event_year: 2026,
        note: "【虛構自動測試】驗證修正，非使用者覆核。",
        expected_revision: 0,
      };
      assert.equal((await post(path, decision, { "X-Review-Token": "wrong" })).status, 403);
      const saved = await post(path, decision, { "X-Review-Token": token });
      assert.equal(saved.status, 200);
      assert.equal((await saved.json()).decision.revision, 1);
      const exportResponse = await fetch(`${url}/api/reviews/${datasetId}/export`);
      assert.match(exportResponse.headers.get("content-disposition"), /attachment/);
      const data = await exportResponse.json(),
        row = data.records.find((row) => row.automatic.key === commentKey);
      assert.equal(data.mode, "manual");
      assert.equal(row.manual.event_year, 2026);
      assert.equal(
        row.automatic.raw.source_post_url,
        "https://www.threads.com/@fictional_fixture/post/HTTP_DEMO_ROOT",
      );
      assert.match(await (await fetch(`${url}/review/${datasetId}`)).text(), /第 1 版/);
    },
  );
  await t.test(
    "new versions create a new pending snapshot while old review and raw versions survive",
    async () => {
      await post("/api/import", { ...input, text: "【虛構測試】渣馬修訂後的主帖內容。" });
      const next = await (await post("/api/prepare", { batch_id: batchId })).json();
      assert.notEqual(next.dataset_id, datasetId);
      assert.equal(reviews.state(next.dataset_id).summary.pending, 2);
      assert.equal(reviews.state(datasetId).summary.keep, 1);
      assert.equal(
        reviews.source(datasetId).records.find((row) => row.kind === "post").raw.text,
        input.text,
      );
      const originals = await (await fetch(`${url}/api/raw-export/${batchId}`)).json();
      assert.equal(originals.observations.length, 3);
      assert.equal(originals.source_verified, false);
      assert.equal((await fetch(url + "/review/" + "f".repeat(64))).status, 404);
      assert.equal((await post("/api/prepare", { batch_id: "missing" })).status, 404);
      const oldConfirmed = await (
        await fetch(`${url}/api/reviews/${datasetId}/confirmed.json`)
      ).json();
      const newConfirmed = await (
        await fetch(`${url}/api/reviews/${next.dataset_id}/confirmed.json`)
      ).json();
      assert.equal(oldConfirmed.records.length, 1);
      const csv = await fetch(
        `${url}/api/reviews/${datasetId}/confirmed.csv?review=${oldConfirmed.review_fingerprint}`,
      );
      assert.equal(csv.status, 200);
      assert.match(csv.headers.get("content-type"), /text\/csv/);
      assert.equal(
        (await fetch(`${url}/api/reviews/${datasetId}/confirmed.json?review=stale`)).status,
        409,
      );
      assert.equal(newConfirmed.records.length, 0);
      const confirmedPage = await (await fetch(`${url}/api/reviews/${datasetId}/confirmed`)).text();
      assert.ok(confirmedPage.includes(`/api/reviews/${datasetId}/confirmed.csv`));
      assert.equal(
        (await fetch(`${url}/api/reviews/${"f".repeat(64)}/confirmed.json`)).status,
        404,
      );
    },
  );
});
