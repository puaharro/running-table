import { initMaterials, materials } from "./materials.mjs";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { ReviewError } from "../threads/review-store.mjs";

export const raceCatalog = JSON.parse(
  readFileSync(new URL("../../src/data/catalog.json", import.meta.url), "utf8"),
);

export class ContentStore {
  constructor(path, mode = "manual", catalog = raceCatalog) {
    if (!["manual", "demo"].includes(mode)) throw new ReviewError(400, "工作區模式無效。");
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    const tables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();
    if (tables.length && !tables.some((t) => t.name === "content_meta")) {
      this.db.close();
      throw new ReviewError(400, "請使用獨立內容管理資料庫。");
    }
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS content_meta(id INTEGER PRIMARY KEY CHECK(id=1),mode TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS content_drafts(id TEXT PRIMARY KEY,revision INTEGER NOT NULL,status TEXT NOT NULL,
        payload_json TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS content_versions(draft_id TEXT NOT NULL REFERENCES content_drafts(id),revision INTEGER NOT NULL,
        status TEXT NOT NULL,payload_json TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(draft_id,revision));`);
    this.db.prepare("INSERT OR IGNORE INTO content_meta VALUES(1,?)").run(mode);
    if (this.db.prepare("SELECT mode FROM content_meta WHERE id=1").get().mode !== mode) {
      this.db.close();
      throw new ReviewError(400, "示範與真實內容需要獨立資料庫。");
    }
    this.mode = mode;
    this.catalog = catalog;
    initMaterials(this);
  }
  close() {
    this.db.close();
  }
  list() {
    return this.db
      .prepare("SELECT * FROM content_drafts ORDER BY updated_at DESC,id")
      .all()
      .map((row) => this.decode(row));
  }
  decode(row) {
    return {
      id: row.id,
      revision: row.revision,
      status: row.status,
      ...JSON.parse(row.payload_json),
      updated_at: row.updated_at,
    };
  }
  get(id) {
    const row = this.db.prepare("SELECT * FROM content_drafts WHERE id=?").get(id);
    if (!row) throw new ReviewError(404, "找不到草稿。");
    return this.decode(row);
  }
  history(id) {
    this.get(id);
    return this.db
      .prepare(
        "SELECT revision,status,payload_json,created_at FROM content_versions WHERE draft_id=? ORDER BY revision DESC",
      )
      .all(id)
      .map(({ payload_json, ...row }) => ({ ...row, content: JSON.parse(payload_json) }));
  }
  save(input) {
    const fields = [
      "id",
      "expected_revision",
      "kind",
      "race_id",
      "year",
      "group",
      "title",
      "body",
      "sources",
      "scope",
      "material_ids",
    ];
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some((k) => !fields.includes(k)) ||
      !(input.id === null || typeof input.id === "string") ||
      !Number.isInteger(input.expected_revision) ||
      input.expected_revision < 0 ||
      !["review", "race-data"].includes(input.kind) ||
      !this.catalog.some((r) => r.id === input.race_id) ||
      !Number.isInteger(input.year) ||
      input.year < 1900 ||
      input.year > 2200 ||
      ![
        ["title", 160],
        ["group", 120],
        ["body", 20000],
        ["sources", 4000],
        ["scope", 2000],
      ].every(([k, n]) => typeof input[k] === "string" && input[k].length <= n) ||
      !input.title.trim()
    )
      throw new ReviewError(400, "請填寫標題、賽事及年份，並檢查內容長度。");
    const ids = input.material_ids ?? [];
    if (
      !Array.isArray(ids) ||
      ids.length > 30 ||
      ids.some(
        (id) =>
          !materials(this).some(
            (r) => r.id === id && r.race_id === input.race_id && r.year === input.year,
          ),
      )
    )
      throw new ReviewError(400, "材料與賽事／年份不符。");
    const payload = Object.fromEntries(
      ["kind", "race_id", "year", "group", "title", "body", "sources", "scope"].map((k) => [
        k,
        input[k],
      ]),
    );
    payload.material_ids = [...new Set(ids)];
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = input.id ? this.get(input.id) : null;
      if ((prior?.revision ?? 0) !== input.expected_revision)
        throw new ReviewError(409, "草稿已有新版本，請重新載入後再修改。");
      const id = prior?.id ?? randomUUID(),
        revision = (prior?.revision ?? 0) + 1,
        at = new Date().toISOString();
      // Editing always returns to draft. A pending version is never silently carried forward.
      this.db
        .prepare(
          "INSERT INTO content_drafts VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,status=excluded.status,payload_json=excluded.payload_json,updated_at=excluded.updated_at",
        )
        .run(id, revision, "draft", JSON.stringify(payload), at);
      this.db
        .prepare("INSERT INTO content_versions VALUES(?,?,?,?,?)")
        .run(id, revision, "draft", JSON.stringify(payload), at);
      this.db.exec("COMMIT");
      return this.get(id);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  markPending(input) {
    if (
      !input ||
      typeof input !== "object" ||
      Object.keys(input).sort().join(",") !== "expected_revision,id" ||
      typeof input.id !== "string" ||
      !Number.isInteger(input.expected_revision)
    )
      throw new ReviewError(400, "請選擇已儲存草稿。");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.get(input.id);
      if (prior.revision !== input.expected_revision)
        throw new ReviewError(409, "草稿已有新版本，請重新載入。");
      if (!prior.body.trim() || !prior.sources.trim() || !prior.scope.trim())
        throw new ReviewError(400, "標記待確認前，請先儲存正文、材料／來源及觀察範圍。");
      if (prior.status === "pending") {
        this.db.exec("COMMIT");
        return prior;
      }
      const revision = prior.revision + 1,
        at = new Date().toISOString();
      const row = this.db
        .prepare("SELECT payload_json FROM content_drafts WHERE id=?")
        .get(input.id);
      this.db
        .prepare("UPDATE content_drafts SET revision=?,status='pending',updated_at=? WHERE id=?")
        .run(revision, at, input.id);
      this.db
        .prepare("INSERT INTO content_versions VALUES(?,?,?,?,?)")
        .run(input.id, revision, "pending", row.payload_json, at);
      this.db.exec("COMMIT");
      return this.get(input.id);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  export(id) {
    return {
      kind: "private_content_draft",
      mode: this.mode,
      confirmation_required: true,
      published: false,
      draft: this.get(id),
      versions: this.history(id),
    };
  }
}
