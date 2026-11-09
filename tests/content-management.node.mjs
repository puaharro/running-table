import { test } from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContentStore, raceCatalog } from "../scripts/content-management/store.mjs";
import {
  renderDrafts,
  renderRaces,
  decorateResearch,
} from "../scripts/content-management/views.mjs";
import { ManualStore } from "../scripts/threads/manual-store.mjs";
import { parseImportOptions } from "../scripts/import-threads.mjs";

const input = (extra) => ({
  id: null,
  expected_revision: 0,
  kind: "review",
  race_id: raceCatalog[0].id,
  year: 2025,
  group: "半馬",
  title: "【虛構測試】評論草稿",
  body: "【虛構測試】賽道有起伏，但接駁順暢。",
  sources: "虛構訪談材料，僅供測試。",
  scope: "一位前段跑手自述；未有後段觀察。",
  ...extra,
});

test("draft history survives pending and every edit requires a fresh confirmation", () => {
  const store = new ContentStore(":memory:", "demo");
  try {
    const first = store.save(input());
    assert.equal(first.status, "draft");
    const pending = store.markPending({ id: first.id, expected_revision: 1 });
    assert.equal(pending.status, "pending");
    assert.equal(pending.revision, 2);
    assert.equal(store.markPending({ id: first.id, expected_revision: 2 }).revision, 2);
    const edited = store.save(
      input({ id: first.id, expected_revision: 2, body: "【虛構測試】修改後需要重新確認。" }),
    );
    assert.equal(edited.status, "draft");
    assert.equal(edited.revision, 3);
    assert.equal(store.history(first.id).length, 3);
    assert.equal(store.history(first.id)[1].content.body, first.body);
    assert.equal(store.export(first.id).published, false);
    assert.equal(store.export(first.id).confirmation_required, true);
    assert.ok(!JSON.stringify(store.export(first.id)).includes('"approval"'));
  } finally {
    store.close();
  }
});

test("incomplete and stale drafts cannot move forward or overwrite newer content", () => {
  const store = new ContentStore(":memory:");
  try {
    const first = store.save(input({ body: "", sources: "", scope: "" }));
    assert.throws(() => store.markPending({ id: first.id, expected_revision: 1 }), /正文/);
    const updated = store.save(input({ id: first.id, expected_revision: 1 }));
    assert.throws(() => store.save(input({ id: first.id, expected_revision: 1 })), /新版本/);
    assert.throws(() => store.markPending({ id: first.id, expected_revision: 1 }), /新版本/);
    assert.equal(store.get(first.id).revision, updated.revision);
    assert.equal(store.history(first.id).length, 2);
    for (const extra of [
      { status: "approved" },
      { approval: { by: "bot" } },
      { race_id: "missing" },
      { year: 2025.5 },
      { title: "" },
      { body: "x".repeat(20001) },
    ])
      assert.throws(() => store.save(input(extra)));
  } finally {
    store.close();
  }
});

test("race proposals never mutate published race or editorial files", () => {
  const files = ["catalog.json", "editorial-reviews.json"];
  const before = files.map((name) =>
    readFileSync(new URL("../src/data/" + name, import.meta.url), "utf8"),
  );
  const store = new ContentStore(":memory:");
  try {
    const row = store.save(
      input({ kind: "race-data", body: "【虛構測試】日期更新建議，尚未核實。" }),
    );
    store.markPending({ id: row.id, expected_revision: row.revision });
    files.forEach((name, i) =>
      assert.equal(
        readFileSync(new URL("../src/data/" + name, import.meta.url), "utf8"),
        before[i],
      ),
    );
  } finally {
    store.close();
  }
});

test("separate private content databases persist and reject wrong workspace modes", () => {
  const dir = mkdtempSync(join(tmpdir(), "content-manager-"));
  try {
    const db = join(dir, "content.sqlite");
    let store = new ContentStore(db, "demo");
    const draft = store.save(input());
    store.close();
    assert.throws(() => new ContentStore(db, "manual"));
    store = new ContentStore(db, "demo");
    assert.equal(store.get(draft.id).body, draft.body);
    store.close();
    const old = join(dir, "manual.sqlite");
    const manual = new ManualStore(old);
    manual.close();
    assert.throws(() => new ContentStore(old), /獨立/);
    const options = parseImportOptions(["--multi-source"]);
    assert.match(
      options.contentDb.replaceAll("\\", "/"),
      /\.editorial-private\/content-management\/manual.sqlite$/,
    );
    assert.throws(() => parseImportOptions(["--content-db", options.contentDb]));
    assert.throws(() => parseImportOptions(["--multi-source", "--content-db", options.db]));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("simple navigation, escaped drafts and workflow status render without a publish action", () => {
  const store = new ContentStore(":memory:", "demo");
  try {
    const row = store.save(
      input({
        title: "<img src=x onerror=alert(1)>",
        body: "</textarea><script>alert(1)</script>",
      }),
    );
    const html = renderDrafts(store, "test-token", row);
    assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
    assert.ok(!html.includes("</textarea><script>alert(1)"));
    assert.ok(html.includes("標記待確認"));
    assert.ok(!html.includes(">發布</button>"));
    for (const page of [
      html,
      renderRaces(store, "test-token"),
      decorateResearch(
        '<html><head><title>test</title><style></style></head><body><div class="top">研究</div><a href="/">返回手動匯入</a></body></html>',
      ),
    ])
      for (const label of ["內容管理", "賽事資料", "賽事研究", "評論草稿"])
        assert.ok(page.includes(label));
    const original = decorateResearch(
      '<html><head><style></style></head><body><div class="top">研究</div><a href="/">返回手動匯入</a><blockquote>原文提到返回手動匯入，應原樣保留。</blockquote></body></html>',
    );
    assert.ok(original.includes('<a href="/research">返回賽事研究</a>'));
    assert.ok(original.includes("<blockquote>原文提到返回手動匯入，應原樣保留。</blockquote>"));
    for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script);
  } finally {
    store.close();
  }
});

test("batch material import is atomic, deduplicated, scoped and immutable in drafts", async () => {
  const { importMaterials, materials, draftFromMaterials } =
    await import("../scripts/content-management/materials.mjs");
  const s = new ContentStore(":memory:", "demo");
  const row = {
    race_id: raceCatalog[0].id,
    year: 2025,
    group: "半馬",
    platform: "blog",
    url: "https://example.com/test",
    text: "虛構材料",
    posted_at: null,
    scope: "虛構測試",
    topic: "course",
  };
  try {
    assert.throws(() => importMaterials(s, [row, { ...row, year: 0 }]));
    assert.equal(materials(s).length, 0);
    assert.deepEqual(importMaterials(s, [row, row]), { added: 1, duplicates: 1 });
    const first = materials(s)[0];
    const d = draftFromMaterials(s, { ids: [first.id] });
    assert.equal(d.status, "draft");
    assert.deepEqual(d.material_ids, [first.id]);
    importMaterials(s, [{ ...row, text: "虛構修訂" }]);
    assert.equal(materials(s).length, 2);
    assert.ok(s.get(d.id).body.includes("虛構材料"));
    const pending = s.markPending({ id: d.id, expected_revision: 1 });
    assert.equal(pending.status, "pending");
    assert.throws(() => s.save({ ...input(), material_ids: [first.id], year: 2026 }));
    assert.throws(() => importMaterials(s, [{ ...row, posted_at: "2025-02-30" }]));
  } finally {
    s.close();
  }
});
test("private backup retains history and verifies checksums in independently readable sqlite files", async () => {
  const { privateBackup, importMaterials } =
    await import("../scripts/content-management/materials.mjs");
  const { DatabaseSync } = await import("node:sqlite");
  const { createHash } = await import("node:crypto");
  const s = new ContentStore(":memory:", "demo");
  try {
    const d = s.save(input());
    s.markPending({ id: d.id, expected_revision: 1 });
    const result = await privateBackup({ content: s });
    assert.equal(result.published, false);
    assert.equal(result.confirmation_required, true);
    for (const f of result.files) {
      const path = join(result.directory, f.name);
      assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"), f.sha256);
      const db = new DatabaseSync(path, { readOnly: true });
      assert.equal(db.prepare("SELECT count(*) as n FROM content_versions").get().n, 2);
      db.close();
    }
    rmSync(result.directory, { recursive: true });
  } finally {
    s.close();
  }
});
