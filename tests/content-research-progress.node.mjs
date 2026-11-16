import { test } from "node:test";
import assert from "node:assert/strict";
import { ContentStore } from "../scripts/content-management/store.mjs";
import { AgentService } from "../scripts/content-management/agent.mjs";
import { ManualStore } from "../scripts/threads/manual-store.mjs";
import { ReviewStore } from "../scripts/threads/review-store.mjs";
import { Workflow, TOPICS, newWorkflowId } from "../scripts/content-management/workflow.mjs";
import { draftBasisStatus } from "../scripts/content-management/research-state.mjs";
import {
  researchDashboard,
  renderResearchDashboard,
} from "../scripts/content-management/research-dashboard.mjs";
import { renderWebsite } from "../scripts/content-management/workflow-view.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";
const request = (action, input, key) => ({
  action,
  input,
  idempotency_key: key,
  reason: "虛構整合測試",
  agent: { provider: "fixture", model: "fake", task_version: "v1", prompt_version: "v1" },
});
function setup() {
  const c = new ContentStore(":memory:", "demo"),
    s = new ManualStore(":memory:", "demo", { multiSource: true }),
    r = new ReviewStore(":memory:"),
    a = new AgentService(c, { store: s, reviews: r }),
    w = new Workflow(c);
  return {
    c,
    s,
    r,
    a,
    w,
    race: c.catalog[0].id,
    run: (action, input, key) => a.execute("private_editor", request(action, input, key)),
    close() {
      c.close();
      s.close();
      r.close();
    },
  };
}
function coverage(t, state = "awaiting_login") {
  return {
    id: `coverage:${t.race}:2025:threads`,
    kind: "coverage",
    expected_revision: 0,
    data: {
      race_id: t.race,
      year: 2025,
      platform: "threads",
      state,
      query: "虛構2025搜尋",
      checked_at: "2025-01-01T00:00:00Z",
      links: [],
      notes: "只讀主帖，完整留言待登入",
    },
  };
}
function materialDraft(t) {
  t.run(
    "import_materials",
    [
      {
        race_id: t.race,
        year: 2025,
        group: "半馬",
        platform: "blog",
        url: "https://example.com/race",
        text: "虛構短摘",
        posted_at: null,
        scope: "虛構材料",
        topic: "course",
      },
    ],
    "m",
  );
  const ids = t.run("context", { race_id: t.race, year: 2025 }, "ctx").materials.map((m) => m.id);
  const link = t.run("research_prepare", { material_ids: ids }, "p").links[0];
  t.run(
    "research_review",
    { material_id: ids[0], decision: "keep", note: "虛構保留", expected_revision: 0 },
    "keep",
  );
  const draft = t.run(
    "create_draft",
    {
      id: null,
      expected_revision: 0,
      kind: "review",
      race_id: t.race,
      year: 2025,
      group: "半馬",
      title: "虛構草稿",
      body: "虛構研究正文",
      sources: "https://example.com/race",
      scope: "虛構",
      material_ids: ids,
    },
    "d",
  );
  return { draft, link };
}
function site(t, draft) {
  return {
    id: newWorkflowId("website"),
    kind: "website",
    expected_revision: 0,
    data: {
      race_id: t.race,
      year: 2025,
      title: "虛構網站稿",
      draft_id: draft.id,
      sections: TOPICS.map((topic) => ({
        topic,
        body: "虛構未知",
        limitations: "虛構限制",
        urls: [],
      })),
    },
  };
}
test("source progress uses original workflow, audit and role boundaries; retries, stale updates and audit failures are safe", () => {
  const t = setup();
  try {
    const input = coverage(t);
    const r = t.run("coverage_save", input, "coverage");
    assert.equal(r.revision, 1);
    assert.equal(t.w.events(r.id)[0].actor_type, "agent");
    assert.deepEqual(t.run("coverage_save", input, "coverage"), r);
    assert.equal(t.w.history(r.id).length, 1);
    assert.throws(
      () => t.a.execute("reader", request("coverage_save", input, "reader")),
      (e) => e.code === "FORBIDDEN",
    );
    assert.throws(
      () => t.run("coverage_save", { ...input, kind: "website" }, "illegal"),
      (e) => e.status === 403,
    );
    assert.throws(
      () => t.run("coverage_save", input, "stale"),
      (e) => e.status === 409,
    );
    const next = { ...input, expected_revision: 1 };
    t.c.db.exec(
      "CREATE TRIGGER fixture_failure BEFORE INSERT ON agent_commands WHEN NEW.action='coverage_save' BEGIN SELECT RAISE(ABORT,'fixture'); END",
    );
    assert.throws(() => t.run("coverage_save", next, "fail"));
    assert.equal(t.w.get(r.id).revision, 1);
    t.c.db.exec("DROP TRIGGER fixture_failure");
    t.w.save(next);
    assert.throws(
      () => t.run("coverage_save", { ...input, expected_revision: 2 }, "human"),
      (e) => e.status === 403,
    );
  } finally {
    t.close();
  }
});
test("a human research decision invalidates draft and confirmed website, blocks export, and produces scoped tasks", () => {
  const t = setup();
  try {
    const { draft, link } = materialDraft(t);
    t.run("coverage_save", coverage(t), "coverage");
    const d = t.w.save(site(t, draft));
    t.w.confirm({
      id: d.id,
      expected_revision: 1,
      content_hash: t.w.hash(d),
      acknowledge: true,
      allow_incomplete: true,
      note: "虛構人手確認",
    });
    assert.equal(t.w.export(d.id, 1).published, false);
    t.r.save(link.dataset_id, {
      record_key: link.record_key,
      decision: "exclude",
      race_name: "虛構",
      event_year: 2025,
      note: "虛構撤回",
      expected_revision: 1,
    });
    assert.equal(draftBasisStatus(t.c, draft).stale, true);
    assert.throws(
      () => t.w.export(d.id, 1),
      (e) => e.status === 409,
    );
    assert.throws(
      () => t.c.markPending({ id: draft.id, expected_revision: 1 }),
      (e) => e.status === 409,
    );
    assert.throws(
      () => t.w.save({ ...site(t, draft), id: d.id, expected_revision: 1 }),
      (e) => e.status === 409,
    );
    const dash = researchDashboard(t.c, { race: t.race, year: 2025 });
    assert.equal(dash.counts.stale, 2);
    assert.equal(dash.counts.login, 1);
    assert.equal(dash.summary.recorded, 1);
    assert.equal(researchDashboard(t.c, { year: 2024 }).tasks.length, 0);
    assert.ok(renderWebsite(t.c, "fake", { id: d.id }).includes("確認及匯出已停止"));
    const { revision, status, updated_at, ...fields } = draft;
    const updated = t.c.save({
      ...fields,
      expected_revision: 1,
      body: "虛構撤去排除材料後正文",
      material_ids: [],
    });
    assert.equal(draftBasisStatus(t.c, updated).stale, false);
    const fresh = t.w.save({ ...site(t, updated), id: d.id, expected_revision: 1 });
    assert.equal(fresh.status, "draft");
    assert.throws(
      () => t.w.export(d.id, 2),
      (e) => e.status === 409,
    );
  } finally {
    t.close();
  }
});
test("a new snapshot invalidates selected evidence; an untracked legacy draft is not silently trusted", () => {
  const t = setup();
  try {
    const { draft } = materialDraft(t);
    t.s.import({
      preset: "hzmb-half",
      target_year: 2025,
      kind: "comment",
      text: "虛構新增同批材料",
      source_url: "https://example.com/second",
      link_scope: "root",
      root_url: "",
      parent_relation: "unknown",
      parent_url: "",
      username: "",
      note: "虛構新增觀察",
      source_platform: "blog",
      posted_date: "",
      race_group: "半馬",
      runner_segment: "unknown",
      experience: "unknown",
      event_page_year: null,
    });
    t.run("research_prepare", { material_ids: draft.material_ids }, "new-snapshot");
    assert.equal(draftBasisStatus(t.c, draft).stale, true);
    t.c.db.prepare("DELETE FROM draft_research_basis WHERE draft_id=?").run(draft.id);
    assert.equal(draftBasisStatus(t.c, draft).tracked, false);
    assert.equal(draftBasisStatus(t.c, draft).stale, true);
    assert.ok(researchDashboard(t.c, { year: 2025 }).counts.stale);
    assert.equal(t.c.history(draft.id).length, 1);
  } finally {
    t.close();
  }
});
test("shared research page renders login/verification tasks and keeps agent and human write permissions separate", async (context) => {
  const t = setup();
  const { draft } = materialDraft(t);
  t.run("coverage_save", coverage(t), "coverage");
  const { server, url } = await startManualServer({
    content: t.c,
    store: t.s,
    reviews: t.r,
    agentToken: "e".repeat(40),
  });
  context.after(async () => {
    await new Promise((r) => server.close(r));
    t.close();
  });
  const page = await (await fetch(url + "/materials?year=2025")).text();
  assert.ok(page.includes("需要處理"));
  assert.ok(page.includes("來源研究進度"));
  assert.ok(page.includes("等待你登入"));
  assert.ok(!page.includes('href="/agent-tools"'));
  assert.equal((await fetch(url + "/materials?year=bad")).status, 400);
  const bad = await fetch(url + "/api/content/workflow/save", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + "e".repeat(40) },
    body: JSON.stringify(coverage(t)),
  });
  assert.equal(bad.status, 403);
  const input = { ...coverage(t), expected_revision: 1 };
  const response = await fetch(url + "/api/agent/execute", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + "e".repeat(40) },
    body: JSON.stringify(request("coverage_save", input, "http-progress")),
  });
  assert.equal(response.status, 200);
});
