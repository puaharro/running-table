import { test } from "node:test";
import assert from "node:assert/strict";
import { ContentStore, raceCatalog } from "../scripts/content-management/store.mjs";
import { AgentService } from "../scripts/content-management/agent.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";
const draft = () => ({
  id: null,
  expected_revision: 0,
  kind: "review",
  race_id: raceCatalog[0].id,
  year: 2025,
  group: "半馬",
  title: "虛構測試私人草稿",
  body: "未審閱",
  sources: "測試",
  scope: "虛構",
  material_ids: [],
});
const req = (action, input, key = "test") => ({
  action,
  input,
  idempotency_key: key,
  reason: "虛構測試",
  agent: { provider: "fixture", model: "fake", task_version: "v1", prompt_version: "v1" },
});
test("roles reject approval, overwrite and supplied privileges; retries create one private draft", () => {
  const c = new ContentStore(":memory:", "demo"),
    s = new AgentService(c);
  try {
    for (const a of ["confirm", "publish", "mark_pending", "run_sql", "approve_snapshot"])
      assert.throws(
        () => s.execute("private_editor", req(a, {})),
        (e) => e.code === "FORBIDDEN",
      );
    assert.throws(
      () => s.execute("reader", req("create_draft", draft())),
      (e) => e.code === "FORBIDDEN",
    );
    assert.throws(() =>
      s.execute("private_editor", { ...req("create_draft", draft()), role: "owner" }),
    );
    assert.throws(() =>
      s.execute("private_editor", req("create_draft", { ...draft(), approval: true })),
    );
    const input = req("create_draft", draft()),
      r = s.execute("private_editor", input);
    assert.equal(r.status, "draft");
    assert.equal(s.execute("private_editor", input).id, r.id);
    assert.equal(c.list().length, 1);
    assert.equal(s.audit().length, 1);
    assert.throws(
      () => s.execute("private_editor", { ...input, reason: "changed" }),
      (e) => e.code === "IDEMPOTENCY_CONFLICT",
    );
    assert.throws(
      () =>
        s.execute(
          "private_editor",
          req("create_draft", { ...draft(), id: r.id, expected_revision: 1 }, "overwrite"),
        ),
      (e) => e.code === "FORBIDDEN",
    );
    c.db.exec(
      "CREATE TRIGGER fail_agent BEFORE INSERT ON agent_commands BEGIN SELECT RAISE(ABORT,'audit unavailable'); END",
    );
    assert.throws(
      () => s.execute("private_editor", req("create_draft", draft(), "rollback")),
      /audit unavailable/,
    );
    assert.equal(c.list().length, 1);
  } finally {
    c.close();
  }
});
test("material collection remains immutable, atomic and unconfirmed; context is scoped", () => {
  const c = new ContentStore(":memory:", "demo"),
    s = new AgentService(c);
  const m = {
    race_id: raceCatalog[0].id,
    year: 2025,
    group: "未知",
    platform: "blog",
    url: "https://example.com/race-report",
    text: "虛構材料",
    posted_at: null,
    scope: "虛構，屆次待核實",
    topic: "other",
  };
  try {
    assert.throws(() =>
      s.execute("private_editor", req("import_materials", [m, { ...m, url: "javascript:bad" }])),
    );
    const read = () => s.execute("reader", req("context", { race_id: m.race_id, year: 2025 }));
    assert.equal(read().materials.length, 0);
    assert.equal(s.execute("private_editor", req("import_materials", [m])).added, 1);
    assert.equal(read().materials.length, 1);
    assert.equal(s.execute("private_editor", req("import_materials", [m], "again")).duplicates, 1);
    assert.equal(
      s.execute("reader", req("context", { race_id: m.race_id, year: 2026 })).materials.length,
      0,
    );
  } finally {
    c.close();
  }
});
test("Bearer keys grant only fixed roles and cannot invoke human endpoints", async (t) => {
  const c = new ContentStore(":memory:", "demo");
  const edit = "e".repeat(40),
    read = "r".repeat(40);
  const { server, url } = await startManualServer({
    content: c,
    agentToken: edit,
    agentReadToken: read,
  });
  t.after(async () => {
    await new Promise((r) => server.close(r));
    c.close();
  });
  const post = (
    key,
    path = "/api/agent/execute",
    input = req("create_draft", draft()),
    extra = {},
  ) =>
    fetch(url + path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, ...extra },
      body: JSON.stringify(input),
    });
  assert.equal((await post("bad")).status, 403);
  assert.equal((await post(read)).status, 403);
  assert.equal((await post(edit, "/api/agent/execute", req("confirm", {}))).status, 403);
  assert.equal((await post(edit, "/api/content/workflow/confirm", {})).status, 403);
  assert.equal(
    (await post(edit, "/api/agent/execute", req("create_draft", draft()), { Origin: url })).status,
    403,
  );
  assert.equal((await post(edit)).status, 200);
  assert.equal(
    (await fetch(url + "/api/agent/execute", { headers: { Authorization: `Bearer ${edit}` } }))
      .status,
    405,
  );
  const redirect = await fetch(url + "/agent-tools", { redirect: "manual" });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get("location"), "/materials");
  const page = await (await fetch(url + "/materials")).text();
  assert.ok(page.includes("研究批次及逐條覆核"));
  assert.ok(!page.includes("AI 工作介面"));
  assert.ok(!page.includes('href="/agent-tools"'));
  assert.ok(!page.includes(edit));
  assert.ok(!page.includes(read));
});
import { ManualStore } from "../scripts/threads/manual-store.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";

test("research bridge uses original cleaning, preserves shared-video excerpts, audits AI decisions and protects human revisions", () => {
  const c = new ContentStore(":memory:", "demo"),
    store = new ManualStore(":memory:", "demo", { multiSource: true }),
    reviews = new ReviewStore(":memory:");
  const s = new AgentService(c, { store, reviews });
  const run = (action, input, key) => s.execute("private_editor", req(action, input, key));
  try {
    const race_id = "rmac-gold-coast-15k-2026";
    const rows = ["頭1K是上斜", "最大的挑戰性就是彎多", "凹凸不平"].map((text, i) => ({
      race_id,
      year: 2025,
      group: "15公里",
      platform: "youtube",
      url: `https://www.youtube.com/watch?v=Etm-sLE5sDA&t=${i * 60}s`,
      text,
      posted_at: null,
      scope: "虛構摘錄測試，未覆聽",
      topic: "course",
    }));
    run("import_materials", rows, "import-video");
    const ids = s
      .execute("reader", req("context", { race_id, year: 2025 }))
      .materials.map((m) => m.id);
    assert.throws(
      () => s.execute("reader", req("research_prepare", { material_ids: ids })),
      (e) => e.code === "FORBIDDEN",
    );
    const p = run("research_prepare", { material_ids: ids }, "prepare-video");
    assert.equal(p.links.length, 3);
    assert.equal(new Set(p.links.map((l) => l.record_key)).size, 3);
    assert.equal(new Set(p.links.map((l) => l.dataset_id)).size, 1);
    assert.equal(reviews.source(p.links[0].dataset_id).records.length, 3);
    assert.deepEqual(run("research_prepare", { material_ids: ids }, "prepare-video"), p);
    run("research_prepare", { material_ids: ids }, "prepare-video-again");
    assert.equal(store.batches()[0].versions, 3);
    const input = {
      material_id: ids[0],
      decision: "pending",
      note: "逐字稿待覆聽，不作獨立跑手樣本",
      expected_revision: 0,
    };
    const saved = run("research_review", input, "review-first");
    assert.equal(saved.decision.actor.type, "agent");
    assert.equal(saved.history.length, 1);
    assert.deepEqual(run("research_review", input, "review-first"), saved);
    assert.throws(
      () => run("research_review", { ...input, note: "stale" }, "stale"),
      (e) => e.status === 409,
    );
    assert.throws(() =>
      run("research_review", { ...input, actor: { type: "human" } }, "fake-actor"),
    );
    reviews.save(saved.dataset_id, {
      record_key: saved.record_key,
      decision: "exclude",
      race_name: "測試",
      event_year: 2025,
      note: "人手決定",
      expected_revision: 1,
    });
    assert.throws(
      () => run("research_review", { ...input, expected_revision: 2 }, "human-protect"),
      (e) => e.status === 403,
    );
    const d = run("create_draft", { ...draft(), race_id, material_ids: ids }, "draft-first");
    const update = {
      ...draft(),
      race_id,
      material_ids: ids,
      id: d.id,
      expected_revision: 1,
      body: "覆核後私人版本",
    };
    assert.equal(run("update_draft", update, "draft-update").revision, 2);
    assert.throws(
      () => run("update_draft", update, "stale-draft"),
      (e) => e.status === 409,
    );
    c.markPending({ id: d.id, expected_revision: 2 });
    assert.throws(
      () => run("update_draft", { ...update, expected_revision: 3 }, "pending-protect"),
      (e) => e.code === "FORBIDDEN",
    );
    assert.equal(c.get(d.id).status, "pending");
  } finally {
    c.close();
    store.close();
    reviews.close();
  }
});

test("research DB writes recover after audit failure without another review revision", () => {
  const c = new ContentStore(":memory:", "demo"),
    store = new ManualStore(":memory:", "demo", { multiSource: true }),
    reviews = new ReviewStore(":memory:");
  const s = new AgentService(c, { store, reviews }),
    run = (a, i, k) => s.execute("private_editor", req(a, i, k));
  try {
    run(
      "import_materials",
      [
        {
          race_id: raceCatalog[0].id,
          year: 2025,
          group: "半馬",
          platform: "blog",
          url: "https://example.com/run",
          text: "測試",
          posted_at: null,
          scope: "虛構測試",
          topic: "other",
        },
      ],
      "m",
    );
    const id = s.execute("reader", req("context", { race_id: raceCatalog[0].id, year: 2025 }))
      .materials[0].id;
    const link = run("research_prepare", { material_ids: [id] }, "p").links[0];
    c.db.exec(
      "CREATE TRIGGER fail_review_audit BEFORE INSERT ON agent_commands WHEN NEW.action='research_review' BEGIN SELECT RAISE(ABORT,'fixture audit failure'); END",
    );
    const input = { material_id: id, decision: "keep", note: "測試", expected_revision: 0 };
    assert.throws(() => run("research_review", input, "r"));
    c.db.exec("DROP TRIGGER fail_review_audit");
    const result = run("research_review", input, "r");
    assert.equal(result.decision.revision, 1);
    assert.equal(reviews.history(link.dataset_id, link.record_key).length, 1);
  } finally {
    c.close();
    store.close();
    reviews.close();
  }
});
