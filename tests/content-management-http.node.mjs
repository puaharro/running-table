import { test } from "node:test";
import assert from "node:assert/strict";
import { ContentStore, raceCatalog } from "../scripts/content-management/store.mjs";
import { ManualStore } from "../scripts/threads/manual-store.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";

test("three content areas preserve private drafts, pending versions and existing research", async (t) => {
  const store = new ManualStore(":memory:", "demo", { multiSource: true }),
    reviews = new ReviewStore(":memory:"),
    content = new ContentStore(":memory:", "demo");
  const { server, url } = await startManualServer({ store, reviews, content });
  t.after(async () => {
    await new Promise((r) => server.close(r));
    content.close();
    reviews.close();
    store.close();
  });
  const home = await (await fetch(url)).text();
  assert.ok(home.includes("賽事資料"));
  assert.ok(home.includes(raceCatalog[0].name));
  assert.ok(!home.includes('id="import-form"'));
  const token = home.match(/name="import-token" content="([^"]+)"/)[1];
  for (const path of ["/races", "/research", "/drafts", "/compare", "/verification"]) {
    const r = await fetch(url + path);
    assert.equal(r.status, 200);
    assert.ok((await r.text()).includes('aria-label="內容管理"'));
  }
  const research = await (await fetch(url + "/research")).text();
  assert.ok(research.includes('id="import-form"'));
  assert.ok(research.includes("Marathon’s World"));
  const post = (path, body, headers = {}) =>
    fetch(url + path, {
      method: "POST",
      headers: {
        Origin: url,
        "X-Import-Token": token,
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
    });
  const input = {
    id: null,
    expected_revision: 0,
    kind: "review",
    race_id: raceCatalog[0].id,
    year: 2025,
    group: "半馬",
    title: "虛構測試草稿",
    body: "虛構內容，不可發布。",
    sources: "虛構訪談",
    scope: "虛構前段觀察",
  };
  assert.equal(
    (await post("/api/content/drafts/save", input, { Origin: "https://foreign.example" })).status,
    403,
  );
  assert.equal(
    (await post("/api/content/drafts/save", input, { "X-Import-Token": "wrong" })).status,
    403,
  );
  const draft = await (await post("/api/content/drafts/save", input)).json();
  assert.equal(draft.status, "draft");
  const page = await (await fetch(url + "/drafts?id=" + draft.id)).text();
  assert.ok(page.includes(input.body));
  const pending = await (
    await post("/api/content/drafts/pending", { id: draft.id, expected_revision: 1 })
  ).json();
  assert.equal(pending.status, "pending");
  assert.equal(
    (await post("/api/content/drafts/save", { ...input, id: draft.id, expected_revision: 1 }))
      .status,
    409,
  );
  const revised = await (
    await post("/api/content/drafts/save", {
      ...input,
      id: draft.id,
      expected_revision: 2,
      body: "虛構修訂，需重新確認。",
    })
  ).json();
  assert.equal(revised.status, "draft");
  const exported = await (await fetch(url + `/api/content/drafts/${draft.id}/export`)).json();
  assert.equal(exported.versions.length, 3);
  assert.equal(exported.published, false);
  assert.equal(exported.confirmation_required, true);
  const proposal = await (
    await fetch(url + `/drafts?kind=race-data&race=${raceCatalog[0].id}`)
  ).text();
  assert.ok(proposal.includes('value="race-data" selected'));
  assert.equal((await post("/api/content/publish", { id: draft.id })).status, 404);
  assert.equal(
    (await fetch(url + "/.editorial-private/content-management/demo.sqlite")).status,
    404,
  );
  assert.equal((await fetch(url + "/drafts?id=missing")).status, 404);
  assert.equal((await fetch(url + "/drafts?race=missing")).status, 400);
});

test("material routes require CSRF, retain scope in draft exports and do not expose backups", async (t) => {
  const { rmSync } = await import("node:fs");
  const store = new ManualStore(":memory:", "demo", { multiSource: true }),
    reviews = new ReviewStore(":memory:"),
    content = new ContentStore(":memory:", "demo");
  const { server, url } = await startManualServer({ store, reviews, content });
  t.after(async () => {
    await new Promise((r) => server.close(r));
    content.close();
    reviews.close();
    store.close();
  });
  const html = await (await fetch(url + "/materials")).text();
  const token = html.match(/name="import-token" content="([^"]+)"/)[1];
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
  const row = {
    race_id: raceCatalog[0].id,
    year: 2025,
    group: "半馬",
    platform: "blog",
    url: "https://example.com/source",
    text: "<script>虛構測試</script>",
    posted_at: null,
    scope: "只限虛構測試",
    topic: "course",
  };
  assert.equal(
    (await post("/api/content/materials/import", [row], { "X-Import-Token": "bad" })).status,
    403,
  );
  assert.equal(
    (await post("/api/content/materials/import", [row, { ...row, year: 0 }])).status,
    400,
  );
  assert.deepEqual(await (await post("/api/content/materials/import", [row, row])).json(), {
    added: 1,
    duplicates: 1,
  });
  const list = await (await fetch(url + "/api/content/materials")).json();
  const draft = await (await post("/api/content/materials/draft", { ids: [list[0].id] })).json();
  const exported = await (await fetch(url + `/api/content/drafts/${draft.id}/export`)).json();
  assert.equal(exported.materials[0].text, row.text);
  assert.equal(exported.confirmation_required, true);
  assert.equal(exported.published, false);
  assert.ok((await (await fetch(url + "/materials")).text()).includes("&lt;script&gt;"));
  const legacy = store.import({
    preset: "hzmb-half",
    target_year: 2025,
    kind: "post",
    text: "虛構舊研究",
    source_url: "https://example.com/legacy",
    username: "fixture",
    note: "虛構測試",
    link_scope: "item",
    root_url: "",
    parent_relation: "unknown",
    parent_url: "",
    source_platform: "blog",
    posted_date: "",
    race_group: "半馬",
    runner_segment: "unknown",
    experience: "unknown",
    event_page_year: 2025,
  });
  const linked = await post("/api/content/materials/legacy", {
    batch_id: legacy.batch_id,
    race_id: raceCatalog[0].id,
    year: 2025,
  });
  assert.equal(linked.status, 200);
  assert.equal((await linked.json()).added, 1);
  const linkedRows = await (await fetch(url + "/api/content/materials")).json();
  assert.ok(linkedRows.some((r) => r.text === "虛構舊研究" && r.scope.includes("仍待覆核")));
  const b = await (await post("/api/content/backup", {})).json();
  try {
    assert.equal(b.files.length, 3);
    assert.equal(
      (
        await fetch(
          url + "/.editorial-private/backups/" + b.directory.split("/").pop() + "/content.sqlite",
        )
      ).status,
      404,
    );
  } finally {
    rmSync(b.directory, { recursive: true });
  }
  assert.equal((await post("/api/content/publish", {})).status, 404);
});
