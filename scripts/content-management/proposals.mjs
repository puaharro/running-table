import { createHash, randomUUID } from "node:crypto";
import { materials } from "./materials.mjs";
import { ReviewError } from "../threads/review-store.mjs";

function fail(code, message, status = 400) {
  const error = new ReviewError(status, message);
  error.code = code;
  throw error;
}
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const hash = (value) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
function exact(input, keys) {
  if (!input || typeof input !== "object" || Array.isArray(input) ||
      Object.keys(input).sort().join() !== [...keys].sort().join())
    fail("INVALID_INPUT", "操作欄位不正確。");
}
function text(value, max) { return typeof value === "string" && value.trim() && value.length <= max; }

// A local trusted operator owns the database. The agent CLI only exposes proposals,
// never review/apply. This is not an OS sandbox for agents with arbitrary file access.
export class ProposalService {
  constructor(content) {
    this.content = content;
    this.db = content.db;
    this.db.exec(`CREATE TABLE IF NOT EXISTS ai_proposals(
      id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL, basis_digest TEXT NOT NULL, revision INTEGER NOT NULL,
      status TEXT NOT NULL, result_json TEXT, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS ai_proposal_audit(
      sequence INTEGER PRIMARY KEY AUTOINCREMENT, proposal_id TEXT NOT NULL REFERENCES ai_proposals(id),
      event_json TEXT NOT NULL, created_at TEXT NOT NULL);`);
  }
  basis(draft) {
    const selected = materials(this.content).filter(r => (draft.material_ids ?? []).includes(r.id));
    return hash({ target: draft.id ? this.content.get(draft.id) : null, materials: selected });
  }
  get(id) {
    const row = this.db.prepare("SELECT * FROM ai_proposals WHERE id=?").get(id);
    if (!row) fail("NOT_FOUND", "找不到建議。", 404);
    return { id: row.id, revision: row.revision, status: row.status,
      ...JSON.parse(row.payload_json), basis_digest: row.basis_digest,
      result: row.result_json ? JSON.parse(row.result_json) : null, created_at: row.created_at };
  }
  list() {
    return this.db.prepare("SELECT id FROM ai_proposals ORDER BY created_at DESC,id").all().map(r => this.get(r.id));
  }
  audit(id) {
    this.get(id);
    return this.db.prepare("SELECT sequence,event_json,created_at FROM ai_proposal_audit WHERE proposal_id=? ORDER BY sequence")
      .all(id).map(({ event_json, ...r }) => ({ ...r, ...JSON.parse(event_json) }));
  }
  event(id, data) {
    this.db.prepare("INSERT INTO ai_proposal_audit(proposal_id,event_json,created_at) VALUES(?,?,?)")
      .run(id, JSON.stringify(data), new Date().toISOString());
  }
  propose(input) {
    exact(input, ["idempotency_key", "agent", "reason", "draft"]);
    exact(input.agent, ["provider", "model", "task_version", "prompt_version"]);
    if (!text(input.idempotency_key, 160) || !text(input.reason, 4000) ||
        !Object.values(input.agent).every(v => text(v, 160))) fail("INVALID_INPUT", "請填操作識別、模型版本及建議理由。");
    // Validate before storage; unknown fields (including approvals) are rejected.
    this.content.validateDraft(input.draft);
    const fingerprint = hash(input);
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const previous = this.db.prepare("SELECT id,request_hash FROM ai_proposals WHERE request_key=?").get(input.idempotency_key);
      if (previous) {
        if (previous.request_hash !== fingerprint) fail("IDEMPOTENCY_CONFLICT", "同一操作識別不可用於不同內容。", 409);
        this.db.exec("COMMIT");
        return this.get(previous.id);
      }
      if ((input.draft.id ? this.content.get(input.draft.id).revision : 0) !== input.draft.expected_revision)
        fail("VERSION_CONFLICT", "草稿版本已改，請重新讀取。", 409);
      const id = randomUUID();
      this.db.prepare("INSERT INTO ai_proposals VALUES(?,?,?,?,?,1,'pending',NULL,?)")
        .run(id, input.idempotency_key, fingerprint, JSON.stringify({ agent: input.agent, reason: input.reason, draft: input.draft }), this.basis(input.draft), new Date().toISOString());
      this.event(id, { action: "proposed", actor_type: "agent", agent: input.agent, input_hash: fingerprint, after_revision: 1 });
      this.db.exec("COMMIT");
      return this.get(id);
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
  decide(input) {
    exact(input, ["id", "expected_revision", "decision", "note"]);
    if (!text(input.id, 160) || !Number.isSafeInteger(input.expected_revision) ||
        !["accept", "reject"].includes(input.decision) || !text(input.note, 2000))
      fail("INVALID_INPUT", "請填建議版本、決定及覆核備註。");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const p = this.get(input.id);
      if (p.revision !== input.expected_revision || p.status !== "pending")
        fail("VERSION_CONFLICT", "建議已處理或版本已改，請重新載入。", 409);
      let result = null;
      if (input.decision === "accept") {
        if (this.basis(p.draft) !== p.basis_digest)
          fail("STALE_BASIS", "草稿或材料依據已改，請建立新建議。", 409);
        result = this.content.save(p.draft, { nested: true }); // Always a private draft; never pending/approved/published.
      }
      const status = input.decision === "accept" ? "accepted" : "rejected";
      this.db.prepare("UPDATE ai_proposals SET status=?,revision=revision+1,result_json=? WHERE id=?")
        .run(status, result ? JSON.stringify({ draft_id: result.id, draft_revision: result.revision }) : null, p.id);
      this.event(p.id, { action: status, actor_type: "local_operator", note: input.note,
        before_revision: p.revision, after_revision: p.revision + 1,
        basis_digest: p.basis_digest, result_draft_id: result?.id ?? null, result_draft_revision: result?.revision ?? null,
        publication_approved: false });
      this.db.exec("COMMIT");
      return this.get(p.id);
    } catch (error) { this.db.exec("ROLLBACK"); throw error; }
  }
}
