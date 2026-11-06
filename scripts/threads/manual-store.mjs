import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { PRESETS } from "./clean.mjs";
import { ReviewError } from "./review-store.mjs";
import { sourceLink } from "./report.mjs";
import { publicReference } from "../research/sources.mjs";

const hash = (value) => createHash("sha256").update(value).digest("hex");
export function threadsReference(value) {
  if (typeof value !== "string" || value.length > 2000)
    throw new ReviewError(400, "請貼上有效的 HTTPS Threads 貼文／留言連結。");
  const safe = sourceLink(value.trim());
  if (!safe) throw new ReviewError(400, "只接受 threads.com 或 threads.net 的 HTTPS 連結。");
  const url = new URL(safe),
    match = url.pathname.match(/^\/(?:@[^/]+\/post|t)\/([a-zA-Z0-9_-]+)\/?$/);
  if (!match)
    throw new ReviewError(400, "需要完整 Threads 貼文／留言連結，例如 /@名稱/post/代碼。");
  return {
    id: `manual-${hash("threads-shortcode:" + match[1])}`,
    url: `https://www.threads.com${url.pathname.replace(/\/$/, "")}`,
    shortcode: match[1],
  };
}

export function validateManualInput(input, { multiSource = false } = {}) {
  const extraFields = [
    "source_platform",
    "posted_date",
    "race_group",
    "runner_segment",
    "experience",
    "event_page_year",
  ];
  const allowed = [
    ...(multiSource ? extraFields : []),
    "preset",
    "target_year",
    "kind",
    "text",
    "source_url",
    "link_scope",
    "root_url",
    "parent_relation",
    "parent_url",
    "username",
    "note",
  ];
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((key) => !allowed.includes(key)) ||
    !Object.hasOwn(PRESETS, input.preset ?? "") ||
    !Number.isInteger(input.target_year) ||
    input.target_year < 1900 ||
    input.target_year > 2200 ||
    !["post", "comment"].includes(input.kind) ||
    typeof input.text !== "string" ||
    !input.text.trim() ||
    input.text.length > 20000 ||
    typeof input.username !== "string" ||
    input.username.length > 100 ||
    typeof input.note !== "string" ||
    input.note.length > 2000 ||
    !["item", "root"].includes(input.link_scope) ||
    !["unknown", "root", "comment"].includes(input.parent_relation) ||
    typeof input.root_url !== "string" ||
    typeof input.parent_url !== "string"
  )
    throw new ReviewError(400, "請檢查賽事、目標年份、原文及來源欄位；原文最多 20000 字。");
  let metadata = {};
  if (multiSource) {
    if (
      typeof input.posted_date !== "string" ||
      (input.posted_date !== "" &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(input.posted_date) ||
          !Number.isFinite(Date.parse(input.posted_date)) ||
          new Date(input.posted_date).toISOString().slice(0, 10) !== input.posted_date)) ||
      typeof input.race_group !== "string" ||
      input.race_group.length > 120 ||
      !["unknown", "front", "middle", "back"].includes(input.runner_segment) ||
      !["unknown", "self_reported", "secondhand", "organizer"].includes(input.experience) ||
      !(
        input.event_page_year === null ||
        (Number.isInteger(input.event_page_year) &&
          input.event_page_year >= 1900 &&
          input.event_page_year <= 2200)
      )
    )
      throw new ReviewError(400, "請檢查出帖日期、組別及觀察範圍；未知可以留空。");
    metadata = {
      source_platform: input.source_platform,
      posted_date: input.posted_date || null,
      race_group: input.race_group.trim() || null,
      runner_segment: input.runner_segment,
      experience: input.experience,
      event_page_year: input.event_page_year,
    };
  }
  const reference = (url) => {
    if (!multiSource) return threadsReference(url);
    try {
      return publicReference(input.source_platform, url);
    } catch (error) {
      throw new ReviewError(400, error.message);
    }
  };
  const source = reference(input.source_url);
  let root = source,
    parent = null,
    id = source.id;
  const username = input.username.trim() || null;
  if (input.kind === "post") {
    if (
      input.link_scope !== "item" ||
      input.parent_relation !== "unknown" ||
      input.root_url.trim() ||
      input.parent_url.trim()
    )
      throw new ReviewError(400, "主帖請使用獨立連結，毋須填父回覆。");
  } else {
    root = input.link_scope === "root" ? source : reference(input.root_url);
    if (
      input.link_scope === "root" &&
      input.root_url.trim() &&
      reference(input.root_url).id !== source.id
    )
      throw new ReviewError(400, "只有主帖來源時，來源連結與主帖連結必須相同。");
    if (input.link_scope === "item" && source.id === root.id)
      throw new ReviewError(
        400,
        "留言獨立連結不能等於主帖；如只有主帖來源，請改選「只有主帖連結」。",
      );
    if (input.parent_relation === "root") {
      if (input.parent_url.trim()) throw new ReviewError(400, "直接回覆主帖時，請清空父留言連結。");
      parent = root;
    } else if (input.parent_relation === "comment") {
      parent = reference(input.parent_url);
      if (parent.id === root.id)
        throw new ReviewError(400, "這是回覆主帖，請改選「直接回覆主帖」。");
    } else if (input.parent_url.trim())
      throw new ReviewError(400, "未確定父回覆時，請清空父留言連結。");
    if (input.link_scope === "root") {
      // No comment permalink: this is a local observation identity, never a platform comment ID.
      id = `manual-${hash(JSON.stringify(["root-text-observation", root.id, username, input.text, input.parent_relation, parent?.id ?? null]))}`;
    }
    if (parent?.id === id) throw new ReviewError(400, "留言不能回覆自己。");
  }
  return {
    ...metadata,
    preset: input.preset,
    target_year: input.target_year,
    kind: input.kind,
    id,
    root_post_id: input.kind === "post" ? id : root.id,
    parent_id: parent?.id ?? null,
    text: input.text,
    username,
    source_url_submitted: input.source_url,
    permalink: input.link_scope === "item" ? source.url : null,
    source_post_url: root.url,
    link_scope: input.link_scope,
    parent_relation: input.parent_relation,
    root_url_submitted: input.root_url,
    parent_url_submitted: input.parent_url,
    note: input.note.trim(),
  };
}

export class ManualStore {
  constructor(path, mode = "manual", { multiSource = false } = {}) {
    if (!["manual", "demo"].includes(mode)) throw new ReviewError(400, "不支援這種手動匯入模式。");
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    if (
      this.db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type='table' AND name IN ('collection_runs','review_datasets')",
        )
        .get()
    ) {
      this.db.close();
      throw new ReviewError(400, "請使用獨立的手動匯入資料庫。");
    }
    const existed = this.db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='manual_import_meta'")
      .get();
    const hasSourceMode = this.db
      .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='manual_source_meta'")
      .get();
    if (multiSource && existed && !hasSourceMode) {
      this.db.close();
      throw new ReviewError(400, "請使用獨立多來源資料庫，保留原 Threads 工作區。");
    }
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS manual_import_meta (id INTEGER PRIMARY KEY CHECK(id=1),mode TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS manual_batches (id TEXT PRIMARY KEY,preset TEXT NOT NULL,target_year INTEGER NOT NULL,
        created_at TEXT NOT NULL,UNIQUE(preset,target_year));
      CREATE TABLE IF NOT EXISTS manual_observations (sequence INTEGER PRIMARY KEY AUTOINCREMENT,batch_id TEXT NOT NULL REFERENCES manual_batches(id),
        source_id TEXT NOT NULL,kind TEXT NOT NULL,payload_json TEXT NOT NULL,fingerprint TEXT NOT NULL,imported_at TEXT NOT NULL,
        CHECK(kind IN ('post','comment')));
      CREATE INDEX IF NOT EXISTS manual_batch_records ON manual_observations(batch_id,source_id);
      CREATE TABLE IF NOT EXISTS manual_preparations (dataset_id TEXT PRIMARY KEY,batch_id TEXT NOT NULL REFERENCES manual_batches(id),prepared_at TEXT NOT NULL);`);
    this.db.prepare("INSERT OR IGNORE INTO manual_import_meta VALUES (1,?)").run(mode);
    if (this.db.prepare("SELECT mode FROM manual_import_meta WHERE id=1").get().mode !== mode) {
      this.db.close();
      throw new ReviewError(400, "示範與手動真實資料需要獨立資料庫。");
    }
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS manual_source_meta (id INTEGER PRIMARY KEY CHECK(id=1),source_mode TEXT NOT NULL)",
    );
    this.db
      .prepare("INSERT OR IGNORE INTO manual_source_meta VALUES (1,?)")
      .run(multiSource ? "multi" : "threads");
    if (
      this.db.prepare("SELECT source_mode FROM manual_source_meta WHERE id=1").get().source_mode !==
      (multiSource ? "multi" : "threads")
    ) {
      this.db.close();
      throw new ReviewError(400, "多來源與 Threads 工作區需要獨立資料庫。");
    }
    this.multiSource = multiSource;
    this.mode = mode;
  }
  close() {
    this.db.close();
  }
  import(input) {
    const record = validateManualInput(input, { multiSource: this.multiSource }),
      payload = JSON.stringify(record),
      fingerprint = hash(payload),
      at = new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("INSERT OR IGNORE INTO manual_batches VALUES (?,?,?,?)")
        .run(randomUUID(), record.preset, record.target_year, at);
      const batch = this.db
        .prepare("SELECT * FROM manual_batches WHERE preset=? AND target_year=?")
        .get(record.preset, record.target_year);
      const latest = this.db
        .prepare(
          "SELECT fingerprint FROM manual_observations WHERE batch_id=? AND source_id=? ORDER BY sequence DESC LIMIT 1",
        )
        .get(batch.id, record.id);
      const prior = latest?.fingerprint === fingerprint;
      const versions = this.db
        .prepare("SELECT COUNT(*) AS n FROM manual_observations WHERE batch_id=? AND source_id=?")
        .get(batch.id, record.id).n;
      if (!prior)
        this.db
          .prepare(
            "INSERT INTO manual_observations(batch_id,source_id,kind,payload_json,fingerprint,imported_at) VALUES (?,?,?,?,?,?)",
          )
          .run(batch.id, record.id, record.kind, payload, fingerprint, at);
      this.db.exec("COMMIT");
      return {
        batch_id: batch.id,
        source_id: record.id,
        status: prior ? "already_imported" : versions ? "new_version" : "imported",
        mode: this.mode,
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  batches() {
    return this.db
      .prepare("SELECT * FROM manual_batches ORDER BY created_at DESC,id")
      .all()
      .map((batch) => {
        const entries = this.entries(batch.id),
          snapshots = this.db
            .prepare(
              "SELECT dataset_id,prepared_at FROM manual_preparations WHERE batch_id=? ORDER BY prepared_at DESC,dataset_id DESC",
            )
            .all(batch.id);
        return {
          ...batch,
          name: PRESETS[batch.preset].name,
          items: entries.length,
          versions: this.db
            .prepare("SELECT COUNT(*) AS n FROM manual_observations WHERE batch_id=?")
            .get(batch.id).n,
          previews: entries.slice(-3).map((row) => ({
            kind: row.record.kind,
            text: row.record.text.slice(0, 160),
            source_url: row.record.permalink ?? row.record.source_post_url,
          })),
          dataset_id: snapshots[0]?.dataset_id ?? null,
          snapshots,
        };
      });
  }
  entries(batchId) {
    const byId = new Map();
    for (const row of this.db
      .prepare("SELECT * FROM manual_observations WHERE batch_id=? ORDER BY sequence")
      .all(batchId))
      byId.set(row.source_id, {
        record: JSON.parse(row.payload_json),
        imported_at: row.imported_at,
      });
    return [...byId.values()];
  }
  report(batchId) {
    this.db.exec("BEGIN");
    try {
      const batch = this.db.prepare("SELECT * FROM manual_batches WHERE id=?").get(batchId);
      if (!batch) throw new ReviewError(404, "找不到這批手動資料。");
      const entries = this.entries(batchId),
        posts = [],
        comments = [];
      for (const { record, imported_at } of entries) {
        const raw = {
          id: record.id,
          text: record.text,
          username: record.username,
          timestamp: record.posted_date ?? null,
          ...(record.source_platform
            ? {
                source_platform: record.source_platform,
                race_group: record.race_group,
                runner_segment: record.runner_segment,
                experience: record.experience,
                event_page_year: record.event_page_year,
              }
            : {}),
          permalink: record.permalink,
          source_post_url: record.source_post_url,
          ingestion_method: "manual_paste",
          source_verified: false,
          manual_identity:
            record.link_scope === "root"
              ? "root_text_observation"
              : this.multiSource
                ? "submitted_permalink"
                : "permalink_shortcode",
          link_scope: record.link_scope,
          source_url_submitted: record.source_url_submitted,
          root_url_submitted: record.root_url_submitted,
          parent_url_submitted: record.parent_url_submitted,
          parent_relation: record.parent_relation,
          import_note: record.note,
          imported_at,
        };
        if (record.kind === "comment") {
          raw.root_post = { id: record.root_post_id };
          if (record.parent_id) raw.replied_to = { id: record.parent_id };
        }
        (record.kind === "post" ? posts : comments).push({
          id: record.id,
          root_post_id: record.root_post_id,
          parent_id: record.parent_id,
          collected_at: imported_at,
          keywords: [],
          raw,
        });
      }
      const updated =
        this.db
          .prepare(
            "SELECT imported_at FROM manual_observations WHERE batch_id=? ORDER BY sequence DESC LIMIT 1",
          )
          .get(batchId)?.imported_at ?? batch.created_at;
      return {
        schema_version: 1,
        mode: this.mode,
        generated_at: new Date().toISOString(),
        run: {
          id: `manual-${batch.id}`,
          race: PRESETS[batch.preset].name,
          target_year: batch.target_year,
          status: "manual_input",
          started_at: batch.created_at,
          updated_at: updated,
          search_type: "MANUAL",
        },
        queries: [],
        posts,
        comments,
      };
    } finally {
      this.db.exec("ROLLBACK");
    }
  }
  remember(batchId, datasetId) {
    this.db
      .prepare("INSERT OR IGNORE INTO manual_preparations VALUES (?,?,?)")
      .run(datasetId, batchId, new Date().toISOString());
  }
  hasSnapshot(datasetId) {
    return Boolean(
      this.db.prepare("SELECT 1 FROM manual_preparations WHERE dataset_id=?").get(datasetId),
    );
  }
  exportRaw(batchId) {
    this.db.exec("BEGIN");
    try {
      const batch = this.db.prepare("SELECT * FROM manual_batches WHERE id=?").get(batchId);
      if (!batch) throw new ReviewError(404, "找不到這批手動資料。");
      const observations = this.db
        .prepare(
          "SELECT sequence,source_id,kind,payload_json,imported_at FROM manual_observations WHERE batch_id=? ORDER BY sequence",
        )
        .all(batchId)
        .map(({ payload_json, ...row }) => ({ ...row, original: JSON.parse(payload_json) }));
      return {
        schema_version: 1,
        mode: this.mode,
        ingestion_method: "manual_paste",
        source_verified: false,
        batch,
        observations,
      };
    } finally {
      this.db.exec("ROLLBACK");
    }
  }
}
