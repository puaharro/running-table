import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { ContentStore, raceCatalog } from "../scripts/content-management/store.mjs";
import { ProposalService } from "../scripts/content-management/proposals.mjs";
import { startManualServer } from "../scripts/threads/manual-server.mjs";
const draft = () => ({ id: null, expected_revision: 0, kind: "review", race_id: raceCatalog[0].id,
  year: 2026, group: "半馬", title: "虛構測試", body: "虛構原文整理", sources: "虛構材料", scope: "未知，需覆核", material_ids: [] });
const request = (d = draft()) => ({ idempotency_key: "test-1", agent: { provider: "fictional", model: "test", task_version: "1", prompt_version: "1" }, reason: "虛構測試建議", draft: d });
const decision = (p, action = "accept") => ({ id: p.id, expected_revision: p.revision, decision: action, note: "虛構本機覆核" });
test("proposal retries, approval fields, private acceptance, rejection and optimistic concurrency", () => {
  const content = new ContentStore(":memory:", "demo"), service = new ProposalService(content);
  try {
    const input = request(), p = service.propose(input);
    assert.equal(content.list().length, 0);
    assert.equal(service.propose(input).id, p.id);
    assert.equal(service.audit(p.id).length, 1);
    assert.throws(() => service.propose({ ...input, reason: "different" }), e => e.code === "IDEMPOTENCY_CONFLICT");
    assert.throws(() => service.propose(request({ ...draft(), approval: true })));
    const accepted = service.decide(decision(p));
    assert.equal(content.get(accepted.result.draft_id).status, "draft");
    assert.equal(content.export(accepted.result.draft_id).published, false);
    assert.equal(service.audit(p.id)[1].publication_approved, false);
    assert.equal(service.audit(p.id)[0].actor_type, "agent");
    assert.throws(() => service.decide(decision(p)), e => e.code === "VERSION_CONFLICT");
    assert.equal(content.list().length, 1);
    const rejected = service.propose({ ...request(), idempotency_key: "reject" });
    service.decide(decision(rejected, "reject"));
    assert.equal(content.list().length, 1);
    assert.equal(service.audit(rejected.id).length, 2);
  } finally { content.close(); }
});
test("changed target invalidates pending proposals; audit failure rolls back draft and decision", () => {
  const content = new ContentStore(":memory:", "demo"), service = new ProposalService(content);
  try {
    const existing = content.save(draft());
    const p = service.propose(request({ ...draft(), id: existing.id, expected_revision: 1, body: "AI 修改建議" }));
    content.save({ ...draft(), id: existing.id, expected_revision: 1, body: "新的人工作業" });
    assert.throws(() => service.decide(decision(p)), e => e.code === "STALE_BASIS");
    assert.equal(service.get(p.id).status, "pending");
    assert.equal(content.get(existing.id).body, "新的人工作業");
    const fresh = service.propose({ ...request(), idempotency_key: "fresh" });
    content.db.exec("CREATE TRIGGER fail_audit BEFORE INSERT ON ai_proposal_audit BEGIN SELECT RAISE(ABORT,'audit unavailable'); END");
    assert.throws(() => service.decide(decision(fresh)), /audit unavailable/);
    assert.equal(content.list().length, 1);
    assert.equal(service.get(fresh.id).status, "pending");
    assert.equal(service.audit(fresh.id).length, 1);
  } finally { content.close(); }
});
test("review UI escapes source instructions, requires CSRF, and exposes no agent apply endpoint", async t => {
  const content = new ContentStore(":memory:", "demo"), service = new ProposalService(content);
  const p = service.propose(request({ ...draft(), body: '<script>publish()</script>' }));
  const { server, url } = await startManualServer({ content });
  t.after(async () => { await new Promise(resolve => server.close(resolve)); content.close(); });
  const page = await (await fetch(url + "/proposals")).text();
  assert.ok(page.includes("接受只會保存私人草稿"));
  assert.ok(!page.includes('<script>publish()</script>'));
  assert.ok(page.includes('&lt;script&gt;publish()&lt;/script&gt;'));
  const token = page.match(/name="import-token" content="([^"]+)"/)[1];
  const post = (headers = {}) => fetch(url + "/api/content/proposals/decide", { method: "POST", headers: { Origin: url, "Content-Type": "application/json", ...headers }, body: JSON.stringify(decision(p)) });
  assert.equal((await post()).status, 403);
  assert.equal(service.get(p.id).status, "pending");
  assert.equal((await post({ "X-Import-Token": token })).status, 200);
  const repeat = await post({ "X-Import-Token": token });
  assert.equal(repeat.status, 409);
  assert.equal((await repeat.json()).code, "VERSION_CONFLICT");
});

test("proposal and audit survive reopening the private workspace", () => {
  const directory = mkdtempSync(join(tmpdir(), "proposal-test-"));
  let content;
  try {
    const path = join(directory, "demo.sqlite");
    content = new ContentStore(path, "demo");
    const p = new ProposalService(content).propose(request());
    content.close();
    content = new ContentStore(path, "demo");
    const service = new ProposalService(content);
    assert.equal(service.propose(request()).id, p.id);
    assert.equal(service.audit(p.id).length, 1);
    service.decide(decision(p));
    content.close();
    content = new ContentStore(path, "demo");
    assert.equal(new ProposalService(content).get(p.id).status, "accepted");
    assert.equal(new ProposalService(content).audit(p.id).length, 2);
    assert.equal(content.list().length, 1);
  } finally { content?.close(); rmSync(directory, { recursive: true, force: true }); }
});
