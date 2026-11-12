import { ResearchBridge } from "./research-bridge.mjs";
import { createHash } from "node:crypto";
import { materials, importMaterials } from "./materials.mjs";
import { ReviewError } from "../threads/review-store.mjs";

export const agentPermissions = {
  reader: ["context", "research_context"],
  private_editor: [
    "context",
    "import_materials",
    "create_draft",
    "update_draft",
    "research_prepare",
    "research_context",
    "research_review",
  ],
};
function fail(code, message, status = 400) {
  const e = new ReviewError(status, message);
  e.code = code;
  throw e;
}
function exact(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join() !== [...keys].sort().join()
  )
    fail("INVALID_INPUT", "操作欄位不正確。");
}
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
export class AgentService {
  constructor(content, { store, reviews } = {}) {
    this.content = content;
    this.research = new ResearchBridge(content, store, reviews);
    content.db.exec(`CREATE TABLE IF NOT EXISTS agent_commands(
      request_key TEXT PRIMARY KEY, request_hash TEXT NOT NULL, role TEXT NOT NULL,
      action TEXT NOT NULL, reason TEXT NOT NULL, metadata_json TEXT NOT NULL,
      result_json TEXT NOT NULL, created_at TEXT NOT NULL);`);
  }
  execute(role, request) {
    exact(request, ["action", "input", "reason", "agent", "idempotency_key"]);
    if (!Object.hasOwn(agentPermissions, role) || !agentPermissions[role].includes(request.action))
      fail("FORBIDDEN", "此角色不能執行確認、發布或其他未授權操作。", 403);
    exact(request.agent, ["provider", "model", "task_version", "prompt_version"]);
    if (
      ![request.reason, request.idempotency_key, ...Object.values(request.agent)].every(
        (v) => typeof v === "string" && v.trim() && v.length <= 2000,
      )
    )
      fail("INVALID_INPUT", "請填理由、操作識別及模型資料。");
    if (request.action === "research_context") return this.research.context(request.input);
    if (request.action === "context") {
      exact(request.input, ["race_id", "year"]);
      const { race_id, year } = request.input;
      if (
        !this.content.catalog.some((r) => r.id === race_id) ||
        !Number.isInteger(year) ||
        year < 1900 ||
        year > 2200
      )
        fail("INVALID_INPUT", "請指定有效賽事及年份。");
      return {
        race: this.content.catalog.find((r) => r.id === race_id),
        year,
        materials: materials(this.content, race_id).filter((m) => m.year === year),
        drafts: this.content.list().filter((d) => d.race_id === race_id && d.year === year),
        research: this.research.links().filter((l) => l.race_id === race_id && l.year === year),
        permissions: agentPermissions[role],
      };
    }
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(canonical({ role, request })))
      .digest("hex");
    const db = this.content.db;
    db.exec("BEGIN IMMEDIATE");
    try {
      const prior = db
        .prepare("SELECT * FROM agent_commands WHERE request_key=?")
        .get(request.idempotency_key);
      if (prior) {
        if (prior.request_hash !== fingerprint)
          fail("IDEMPOTENCY_CONFLICT", "操作識別已用於不同內容。", 409);
        db.exec("COMMIT");
        return JSON.parse(prior.result_json);
      }
      let result;
      if (request.action === "import_materials")
        result = importMaterials(this.content, request.input, { nested: true });
      else if (request.action === "research_prepare") result = this.research.prepare(request.input);
      else if (request.action === "research_review")
        result = this.research.review(request.input, request, fingerprint);
      else if (request.action === "update_draft") {
        if (typeof request.input?.id !== "string") fail("INVALID_INPUT", "請指定私人草稿。");
        const prior = this.content.get(request.input.id);
        if (
          prior.status !== "draft" ||
          prior.kind !== request.input.kind ||
          prior.race_id !== request.input.race_id ||
          prior.year !== request.input.year
        )
          fail("FORBIDDEN", "AI只可更新同一賽事及年份的私人草稿，不能覆寫待確認稿件。", 403);
        result = this.content.save(request.input, { nested: true });
      } else {
        if (request.input?.id !== null || request.input?.expected_revision !== 0)
          fail("FORBIDDEN", "AI 只可建立新私人草稿；修改現有稿件請提交建議交人手覆核。", 403);
        result = this.content.save(request.input, { nested: true });
      }
      db.prepare("INSERT INTO agent_commands VALUES(?,?,?,?,?,?,?,?)").run(
        request.idempotency_key,
        fingerprint,
        role,
        request.action,
        request.reason,
        JSON.stringify(request.agent),
        JSON.stringify(result),
        new Date().toISOString(),
      );
      db.exec("COMMIT");
      return result;
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
  audit() {
    return this.content.db
      .prepare(
        "SELECT request_key,role,action,reason,metadata_json,created_at FROM agent_commands ORDER BY created_at DESC LIMIT 100",
      )
      .all();
  }
}
