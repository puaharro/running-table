import { test } from "node:test";
import assert from "node:assert/strict";
import { Script } from "node:vm";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ContentStore } from "../scripts/content-management/store.mjs";
import { Workflow, TOPICS, newWorkflowId } from "../scripts/content-management/workflow.mjs";
import { ProposalService } from "../scripts/content-management/proposals.mjs";
import {
  confirmedHandoff,
  handoffHtml,
  contentHash,
} from "../scripts/content-management/handoff.mjs";
import { workspacePanel } from "../scripts/content-management/workspace-view.mjs";
import { importMaterials, materials } from "../scripts/content-management/materials.mjs";
import {
  renderRaceEditor,
  renderProgress,
  renderWebsite,
} from "../scripts/content-management/workflow-view.mjs";
const raceInput = () => ({
  id: newWorkflowId("race"),
  expected_revision: 0,
  kind: "race",
  data: {
    name: "虛構測試賽事",
    year: 2026,
    date: "",
    groups: "15公里\n5公里",
    official_url: "https://example.com/",
    notes: "虛構資料；日期未知",
  },
});
const confirm = (w, r, allow = false) =>
  w.confirm({
    id: r.id,
    expected_revision: r.revision,
    content_hash: w.hash(r),
    acknowledge: true,
    allow_incomplete: allow,
    note: "虛構示範人工確認；不批准發布",
  });
const website = (race) => ({
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
      limitations: "虛構測試，材料不足。",
      urls: [],
    })),
  },
});
function setup() {
  const content = new ContentStore(":memory:", "demo");
  const w = new Workflow(content);
  const r = w.save(raceInput());
  return { content, w, r };
}
test("handoff accepts only the exact confirmed version and excludes private research", () => {
  const { content, w, r } = setup();
  try {
    const input = website(r);
    input.data.sections[0].body = '<script>alert("fixture")</script> 未知。';
    input.data.sections[0].urls = ["https://example.com/source"];
    input.data.sections[4].urls = ["https://example.com/source"];
    const copy = w.save(input);
    assert.throws(() => confirmedHandoff(content, copy.id, 1), /確認/);
    confirm(w, copy, true);
    const result = confirmedHandoff(content, copy.id, 1, { audit: true });
    assert.deepEqual(result.public_copy.sections, input.data.sections);
    assert.equal(result.manifest.public_content_hash, contentHash(result.public_copy));
    assert.deepEqual(result.manifest.citations, ["https://example.com/source"]);
    assert.equal(result.manifest.publication_approved, false);
    assert.equal(result.manifest.research_complete, false);
    assert.equal(result.manifest.demo, true);
    assert.equal("basis" in result, false);
    const html = handoffHtml(result);
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("虛構示範"));
    assert.ok(w.events(copy.id).some((e) => e.action === "handoff_exported"));
    assert.throws(() => confirmedHandoff(content, copy.id, 2), /確認/);
    w.save({ ...input, expected_revision: 1 });
    assert.throws(() => confirmedHandoff(content, copy.id, 1), /確認/);
  } finally {
    content.close();
  }
});

test("internal title status cannot be confirmed and upstream changes block handoff", () => {
  const { content, w, r } = setup();
  try {
    const input = website(r);
    input.data.title += "【候選・待覆核】";
    let copy = w.save(input);
    assert.throws(() => confirm(w, copy, true), /公開標題/);
    assert.equal(w.get(copy.id).status, "draft");
    input.data.title = "虛構公開標題";
    copy = w.save({ ...input, expected_revision: 1 });
    confirm(w, copy, true);
    const cov = w.coverage(r.id, 2026)[0];
    w.save({
      id: cov.id,
      kind: "coverage",
      expected_revision: 0,
      data: { ...cov.data, state: "searching", query: "fictional query" },
    });
    assert.throws(() => confirmedHandoff(content, copy.id, 2), /依據版本已改/);
  } finally {
    content.close();
  }
});

test("workspace separates years and renders executable combined scripts without executing content", () => {
  const { content, w, r } = setup();
  try {
    const input = website(r);
    input.data.title = "本屆虛構稿";
    const copy = w.save(input);
    w.save({ ...website(r), data: { ...website(r).data, year: 2025, title: "上屆獨立稿" } });
    const panel = workspacePanel(content, r.id, 2026);
    assert.ok(panel.body.includes("本屆虛構稿"));
    assert.ok(!panel.body.includes("上屆獨立稿"));
    const html = renderWebsite(content, "fictional-token", { id: copy.id, workspace: true });
    for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(match[1]);
    assert.ok(html.includes("賽事工作頁"));
    assert.ok(html.includes("網站稿版本及預覽"));
  } finally {
    content.close();
  }
});
test("private new races support material imports and existing AI proposals without altering public catalog", () => {
  const before = readFileSync(new URL("../src/data/catalog.json", import.meta.url), "utf8");
  const { content, w, r } = setup();
  try {
    assert.equal(content.catalog.find((x) => x.id === r.id).date, "");
    assert.equal(r.data.official_url, "https://example.com/");
    importMaterials(content, [
      {
        race_id: r.id,
        year: 2026,
        group: "15公里",
        platform: "blog",
        url: "https://example.com/fixture",
        text: "虛構原文",
        posted_at: null,
        scope: "虛構測試",
        topic: "course",
      },
    ]);
    const p = new ProposalService(content).propose({
      idempotency_key: "fixture-private-race",
      agent: { provider: "fictional", model: "fixture", task_version: "v1", prompt_version: "v1" },
      reason: "虛構測試",
      draft: {
        id: null,
        expected_revision: 0,
        kind: "review",
        race_id: r.id,
        year: 2026,
        group: "15公里",
        title: "虛構",
        body: "虛構",
        sources: "虛構",
        scope: "虛構",
        material_ids: [materials(content)[0].id],
      },
    });
    assert.equal(p.status, "pending");
    assert.throws(() => w.export(r.id, 1), /確認/);
    const c = confirm(w, r);
    assert.equal(c.status, "confirmed");
    assert.equal(w.export(r.id, 1).publication_approved, false);
    assert.throws(() => w.save({ ...raceInput(), id: r.id }), /新版本/);
    assert.throws(
      () => w.save({ ...raceInput(), data: { ...r.data, date: "2026-02-30" } }),
      /日期/,
    );
    assert.equal(
      readFileSync(new URL("../src/data/catalog.json", import.meta.url), "utf8"),
      before,
    );
  } finally {
    content.close();
  }
});
test("all seven source categories remain pending during login and completion needs actual inspection details", () => {
  const { content, w, r } = setup();
  try {
    const rows = w.coverage(r.id, 2026);
    assert.equal(rows.length, 7);
    const first = rows[0];
    const save = (data, revision = 0) =>
      w.save({
        id: first.id,
        expected_revision: revision,
        kind: "coverage",
        data: { ...first.data, ...data },
      });
    assert.throws(
      () => save({ state: "reviewed", query: "fixture", checked_at: new Date().toISOString() }),
      /連結/,
    );
    assert.throws(() => save({ state: "no_results", query: "fixture", notes: "無結果" }), /時間/);
    const login = save({ state: "awaiting_login", query: "fixture", notes: "請協助登入" });
    assert.equal(w.coverage(r.id, 2026)[0].data.state, "awaiting_login");
    const resumed = save({ ...login.data, state: "searching" }, 1);
    assert.equal(resumed.data.state, "searching");
    assert.throws(() =>
      save(
        {
          ...resumed.data,
          state: "reviewed",
          checked_at: new Date().toISOString(),
          links: ["https://facebook.com/reel/123"],
        },
        2,
      ),
    );
    assert.equal(w.coverage(r.id, 2026).filter((x) => x.data.state === "not_started").length, 6);
    const copy = w.save(website(r));
    assert.throws(() => confirm(w, copy), /來源尚未完成/);
    assert.equal(confirm(w, copy, true).status, "confirmed");
    const bundle = w.export(copy.id, 1);
    assert.equal(bundle.research_complete, false);
    assert.equal(bundle.coverage.length, 7);
    assert.equal(bundle.publication_approved, false);
  } finally {
    content.close();
  }
});
test("confirmation is bound to complete content, race, draft and coverage versions; edits cannot reuse it", () => {
  const { content, w, r } = setup();
  try {
    for (const row of w.coverage(r.id, 2026))
      w.save({
        id: row.id,
        expected_revision: 0,
        kind: "coverage",
        data: {
          ...row.data,
          state: "no_results",
          query: "fictional fixture",
          checked_at: new Date().toISOString(),
          notes: "虛構搜尋，無結果",
        },
      });
    const input = website(r),
      first = w.save(input);
    assert.throws(
      () =>
        w.confirm({
          id: first.id,
          expected_revision: 1,
          content_hash: "wrong",
          acknowledge: true,
          allow_incomplete: false,
          note: "fixture",
        }),
      /版本/,
    );
    confirm(w, first);
    assert.equal(w.export(first.id, 1).research_complete, true);
    const edited = w.save({
      ...input,
      expected_revision: 1,
      data: { ...input.data, title: "虛構修訂" },
    });
    assert.equal(edited.status, "draft");
    assert.throws(() => w.export(edited.id, 2), /確認/);
    confirm(w, edited);
    const row = w.coverage(r.id, 2026)[0];
    w.save({
      id: row.id,
      expected_revision: 1,
      kind: "coverage",
      data: { ...row.data, notes: "虛構新觀察" },
    });
    assert.throws(() => w.export(edited.id, 2), /依據版本/);
    assert.equal(w.history(edited.id).length, 2);
    assert.equal(w.history(edited.id)[1].data.title, "虛構網站稿");
  } finally {
    content.close();
  }
});
test("website validation rejects missing topics, unsafe sources and scope mismatches; private versions survive reopen", () => {
  const dir = mkdtempSync(join(tmpdir(), "workflow-fixture-"));
  const path = join(dir, "demo.sqlite");
  let content = new ContentStore(path, "demo");
  try {
    let w = new Workflow(content);
    const r = w.save(raceInput());
    let input = website(r);
    assert.throws(() =>
      w.save({ ...input, data: { ...input.data, sections: input.data.sections.slice(1) } }),
    );
    input.data.sections[0].urls = ["http://localhost/private"];
    assert.throws(() => w.save(input));
    input.data.sections[0].urls = ["https://example.com/source"];
    const saved = w.save(input);
    confirm(w, saved, true);
    content.close();
    content = new ContentStore(path, "demo");
    w = new Workflow(content);
    assert.equal(w.export(saved.id, 1).content.sections[0].urls[0], "https://example.com/source");
    assert.equal(w.events(saved.id).filter((e) => e.action === "content_confirmed").length, 1);
  } finally {
    content.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
test("workflow pages safely render source links and complete previews with syntactically valid scripts", () => {
  const { content, w, r } = setup();
  try {
    const input = website(r);
    input.data.sections[0].body = "</textarea><script>alert(1)</script>";
    const copy = w.save(input);
    for (const html of [
      renderRaceEditor(content, "fixture", r.id),
      renderProgress(content, "fixture", r.id, 2026),
      renderWebsite(content, "fixture", { id: copy.id }),
    ]) {
      for (const [, script] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new Script(script);
      assert.ok(!html.includes("</textarea><script>alert(1)"));
      assert.ok(html.includes("內容管理"));
    }
    assert.ok(renderWebsite(content, "fixture", { id: copy.id }).includes("&lt;script&gt;"));
  } finally {
    content.close();
  }
});
