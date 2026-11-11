import { test } from "node:test";
import assert from "node:assert/strict";
import { ContentStore } from "../scripts/content-management/store.mjs";
import { Workflow, TOPICS, newWorkflowId } from "../scripts/content-management/workflow.mjs";
import { ManualStore } from "../scripts/threads/manual-store.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";
test("new workflow HTTP preserves CSRF, exact-version confirmation and export boundaries", async (t) => {
  const content = new ContentStore(":memory:", "demo"),
    store = new ManualStore(":memory:", "demo", { multiSource: true }),
    reviews = new ReviewStore(":memory:");
  const { server, url } = await startManualServer({ content, store, reviews });
  t.after(async () => {
    await new Promise((r) => server.close(r));
    content.close();
    store.close();
    reviews.close();
  });
  const home = await (await fetch(url)).text();
  const token = home.match(/name="import-token" content="([^"]+)"/)[1];
  const post = (path, body, extra = {}) =>
    fetch(url + path, {
      method: "POST",
      headers: {
        Origin: url,
        "Content-Type": "application/json",
        "X-Import-Token": token,
        ...extra,
      },
      body: JSON.stringify(body),
    });
  const save = "/api/content/workflow/save",
    confirmation = "/api/content/workflow/confirm",
    exp = "/api/content/workflow/export";
  const raceInput = {
    id: newWorkflowId("race"),
    expected_revision: 0,
    kind: "race",
    data: {
      name: "虛構HTTP賽事",
      year: 2026,
      date: "",
      groups: "15公里",
      official_url: "",
      notes: "虛構資料",
    },
  };
  assert.equal((await post(save, raceInput, { "X-Import-Token": "wrong" })).status, 403);
  const race = await (await post(save, raceInput)).json();
  assert.equal(race.status, "draft");
  for (const path of [
    "/race-editor",
    "/race-editor?id=" + race.id,
    "/research-progress?race=" + race.id + "&year=2026",
    "/website-copy?race=" + race.id + "&year=2026",
    "/website-copies",
  ]) {
    const r = await fetch(url + path);
    assert.equal(r.status, 200, path);
  }
  assert.equal((await fetch(url + "/research-progress?race=missing")).status, 400);
  assert.equal((await post(exp, { id: race.id, expected_revision: 1 })).status, 409);
  const website = {
    id: newWorkflowId("website"),
    expected_revision: 0,
    kind: "website",
    data: {
      race_id: race.id,
      year: 2026,
      title: "虛構網站稿",
      draft_id: null,
      sections: TOPICS.map((topic) => ({
        topic,
        body: "未知。",
        limitations: "虛構示範",
        urls: [],
      })),
    },
  };
  const copy = await (await post(save, website)).json();
  const w = new Workflow(content);
  const payload = {
    id: copy.id,
    expected_revision: 1,
    content_hash: w.hash(copy),
    acknowledge: true,
    allow_incomplete: true,
    note: "虛構示範人工確認；未批准發布",
  };
  assert.equal(
    (await post(confirmation, payload, { Origin: "https://foreign.example" })).status,
    403,
  );
  assert.equal((await post(confirmation, { ...payload, acknowledge: false })).status, 400);
  assert.equal((await post(confirmation, payload)).status, 200);
  const result = await (await post(exp, { id: copy.id, expected_revision: 1 })).json();
  assert.equal(result.published, false);
  assert.equal(result.publication_approved, false);
  assert.equal(result.demo, true);
  assert.equal(result.content.sections.length, 5);
  assert.equal((await post(save, { ...website, expected_revision: 1 })).status, 200);
  assert.equal((await post(exp, { id: copy.id, expected_revision: 1 })).status, 409);
  assert.equal(
    (await fetch(url + "/.editorial-private/content-management/demo.sqlite")).status,
    404,
  );
  assert.equal((await post("/api/content/workflow/publish", { id: copy.id })).status, 404);
});
