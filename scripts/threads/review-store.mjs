import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";
import { PRESETS } from "./clean.mjs";
import { buildConfirmed } from "./confirmed.mjs";
import { TOPICS, TOPIC_KEYS, TOPIC_RULE_VERSION } from "./topics.mjs";
import { buildSummary, SUMMARY_RULE_VERSION } from "./summary.mjs";
import { buildComparison } from "./comparison.mjs";
import { installVerification, verificationState, saveVerification } from "./verification-store.mjs";

export class ReviewError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function validateDataset(source) {
  if (
    source?.schema_version !== 1 ||
    !["demo", "collected", "manual"].includes(source.mode) ||
    typeof source.run?.id !== "string" ||
    !source.run.id ||
    !Number.isInteger(source.run.target_year) ||
    source.run.target_year < 1900 ||
    source.run.target_year > 2200 ||
    typeof source.source_digest !== "string" ||
    !/^[a-f0-9]{64}$/.test(source.source_digest) ||
    typeof source.rule_version !== "string" ||
    !Object.hasOwn(PRESETS, source.target?.preset ?? "") ||
    !Array.isArray(source.records)
  ) {
    throw new ReviewError(400, "需要有效的清理結果 JSON；請先執行 clean:threads。");
  }
  const keys = new Set();
  for (const record of source.records) {
    if (
      typeof record.key !== "string" ||
      !["post", "comment"].includes(record.kind) ||
      record.key !== `${record.kind}:${record.id}` ||
      !(
        /^\d+$/.test(record.id) ||
        (["manual", "demo"].includes(source.mode) &&
          record.raw?.ingestion_method === "manual_paste" &&
          /^manual-[a-f0-9]{64}$/.test(record.id))
      ) ||
      keys.has(record.key) ||
      !record.raw ||
      typeof record.clean_text !== "string" ||
      !["keep", "review", "exclude"].includes(record.disposition)
    ) {
      throw new ReviewError(400, "清理結果的項目格式或 ID 不正確。");
    }
    keys.add(record.key);
  }
  // Generated-at changes alone must not discard saved reviews on a repeated clean run.
  const { generated_at, ...identity } = JSON.parse(JSON.stringify(source));
  return createHash("sha256").update(canonical(identity)).digest("hex");
}

export class ReviewStore {
  constructor(path) {
    if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    if (
      this.db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type='table' AND name IN ('collection_runs','manual_batches')",
        )
        .get()
    ) {
      this.db.close();
      throw new ReviewError(400, "請使用獨立覆核資料庫，不能寫入原始收集資料庫。");
    }
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS review_datasets (
        id TEXT PRIMARY KEY, mode TEXT NOT NULL, source_json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS manual_decisions (
        dataset_id TEXT NOT NULL REFERENCES review_datasets(id), record_key TEXT NOT NULL,
        decision TEXT NOT NULL CHECK(decision IN ('pending','keep','exclude')), race_name TEXT,
        event_year INTEGER, note TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL,
        PRIMARY KEY(dataset_id,record_key));
      CREATE TABLE IF NOT EXISTS manual_review_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, dataset_id TEXT NOT NULL REFERENCES review_datasets(id),
        record_key TEXT NOT NULL, revision INTEGER NOT NULL, payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL, UNIQUE(dataset_id,record_key,revision));
      CREATE TABLE IF NOT EXISTS topic_decisions (
        dataset_id TEXT NOT NULL REFERENCES review_datasets(id),item_id TEXT NOT NULL,evidence_digest TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending','confirmed','uncertain')),labels_json TEXT NOT NULL,note TEXT NOT NULL,
        revision INTEGER NOT NULL,rule_version TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(dataset_id,item_id));
      CREATE TABLE IF NOT EXISTS topic_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,dataset_id TEXT NOT NULL REFERENCES review_datasets(id),item_id TEXT NOT NULL,
        revision INTEGER NOT NULL,payload_json TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(dataset_id,item_id,revision));
      CREATE TABLE IF NOT EXISTS summary_decisions (
        dataset_id TEXT NOT NULL REFERENCES review_datasets(id),point_id TEXT NOT NULL,evidence_digest TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending','confirmed','uncertain','excluded')),text TEXT NOT NULL,note TEXT NOT NULL,
        revision INTEGER NOT NULL,rule_version TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(dataset_id,point_id));
      CREATE TABLE IF NOT EXISTS summary_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,dataset_id TEXT NOT NULL REFERENCES review_datasets(id),point_id TEXT NOT NULL,
        revision INTEGER NOT NULL,payload_json TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(dataset_id,point_id,revision));
      CREATE TABLE IF NOT EXISTS comparison_notes (
        id TEXT PRIMARY KEY,left_dataset TEXT NOT NULL REFERENCES review_datasets(id),right_dataset TEXT NOT NULL REFERENCES review_datasets(id),
        payload_json TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS comparison_note_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,note_id TEXT NOT NULL REFERENCES comparison_notes(id),revision INTEGER NOT NULL,
        payload_json TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(note_id,revision));`);
    installVerification(this.db);
  }
  verificationState(allowed, noteId = null) {
    return verificationState(this, allowed, noteId);
  }
  saveVerification(input, allowed) {
    return saveVerification(this, input, allowed);
  }
  close() {
    this.db.close();
  }
  latestDemo() {
    const row = this.db
      .prepare(
        "SELECT source_json FROM review_datasets WHERE mode='demo' ORDER BY created_at DESC,id DESC LIMIT 1",
      )
      .get();
    return row ? JSON.parse(row.source_json) : null;
  }
  register(source) {
    const id = validateDataset(source);
    this.db
      .prepare("INSERT OR IGNORE INTO review_datasets VALUES (?,?,?,?)")
      .run(id, source.mode, JSON.stringify(source), new Date().toISOString());
    return id;
  }
  source(id) {
    const row = this.db.prepare("SELECT source_json FROM review_datasets WHERE id=?").get(id);
    if (!row) throw new ReviewError(404, "找不到這批資料。");
    return JSON.parse(row.source_json);
  }
  decisions(id) {
    return this.db
      .prepare(
        "SELECT record_key,decision,race_name,event_year,note,revision,updated_at FROM manual_decisions WHERE dataset_id=? ORDER BY record_key",
      )
      .all(id);
  }
  history(id, key) {
    return this.db
      .prepare(
        "SELECT revision,payload_json,created_at FROM manual_review_events WHERE dataset_id=? AND record_key=? ORDER BY revision DESC",
      )
      .all(id, key)
      .map((row) => ({
        revision: row.revision,
        ...JSON.parse(row.payload_json),
        saved_at: row.created_at,
      }));
  }
  state(id) {
    const source = this.source(id),
      decisions = this.decisions(id),
      byKey = new Map(decisions.map((row) => [row.record_key, row]));
    return {
      dataset_id: id,
      mode: source.mode,
      summary: {
        total: source.records.length,
        pending: source.records.filter(
          (row) => !byKey.has(row.key) || byKey.get(row.key).decision === "pending",
        ).length,
        keep: decisions.filter((row) => row.decision === "keep").length,
        exclude: decisions.filter((row) => row.decision === "exclude").length,
      },
      decisions,
    };
  }
  save(id, input) {
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some(
        (key) =>
          ![
            "record_key",
            "decision",
            "race_name",
            "event_year",
            "note",
            "expected_revision",
          ].includes(key),
      )
    )
      throw new ReviewError(400, "覆核欄位不正確。");
    const source = this.source(id);
    if (!source.records.some((record) => record.key === input.record_key))
      throw new ReviewError(404, "找不到這條原始項目。");
    if (
      !["pending", "keep", "exclude"].includes(input.decision) ||
      !Number.isSafeInteger(input.expected_revision) ||
      input.expected_revision < 0 ||
      typeof input.race_name !== "string" ||
      input.race_name.length > 200 ||
      typeof input.note !== "string" ||
      input.note.length > 2000 ||
      (input.event_year !== null &&
        (!Number.isInteger(input.event_year) || input.event_year < 1900 || input.event_year > 2200))
    )
      throw new ReviewError(400, "請檢查覆核結果、賽事、年份及備註（最多 2000 字）。");
    const payload = {
      decision: input.decision,
      race_name: input.race_name.trim() || null,
      event_year: input.event_year,
      note: input.note.trim(),
    };
    const at = new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.db
        .prepare("SELECT revision FROM manual_decisions WHERE dataset_id=? AND record_key=?")
        .get(id, input.record_key);
      if ((current?.revision ?? 0) !== input.expected_revision)
        throw new ReviewError(409, "其他頁面已更新這條覆核。請重新載入，再確認你的修改。");
      const revision = (current?.revision ?? 0) + 1;
      this.db
        .prepare(
          `INSERT INTO manual_decisions VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(dataset_id,record_key) DO UPDATE SET
        decision=excluded.decision,race_name=excluded.race_name,event_year=excluded.event_year,note=excluded.note,revision=excluded.revision,updated_at=excluded.updated_at`,
        )
        .run(
          id,
          input.record_key,
          payload.decision,
          payload.race_name,
          payload.event_year,
          payload.note,
          revision,
          at,
        );
      this.db
        .prepare(
          "INSERT INTO manual_review_events(dataset_id,record_key,revision,payload_json,created_at) VALUES (?,?,?,?,?)",
        )
        .run(id, input.record_key, revision, JSON.stringify(payload), at);
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
    const state = this.state(id);
    return {
      decision: state.decisions.find((row) => row.record_key === input.record_key),
      summary: state.summary,
      history: this.history(id, input.record_key),
    };
  }
  export(id) {
    this.db.exec("BEGIN");
    try {
      return this._export(id);
    } finally {
      this.db.exec("ROLLBACK");
    }
  }
  comparisonNotes(left, right) {
    return this.db
      .prepare(
        "SELECT id,payload_json,revision,updated_at FROM comparison_notes WHERE left_dataset=? AND right_dataset=? ORDER BY id",
      )
      .all(left, right)
      .map(({ payload_json, ...row }) => ({
        ...row,
        ...JSON.parse(payload_json),
        history: this.comparisonNoteHistory(row.id),
      }));
  }
  comparisonNoteHistory(id) {
    return this.db
      .prepare(
        "SELECT revision,payload_json,created_at FROM comparison_note_events WHERE note_id=? ORDER BY revision DESC",
      )
      .all(id)
      .map((row) => ({
        revision: row.revision,
        ...JSON.parse(row.payload_json),
        saved_at: row.created_at,
      }));
  }
  _comparison(left, right, selection) {
    return buildComparison(
      this._export(left),
      this._export(right),
      selection,
      this.comparisonNotes(left, right),
    );
  }
  comparison(left, right, selection = {}) {
    this.db.exec("BEGIN");
    try {
      return this._comparison(left, right, selection);
    } finally {
      this.db.exec("ROLLBACK");
    }
  }
  saveComparisonNote(input) {
    const allowed = [
      "left",
      "right",
      "selection",
      "note_topic",
      "differences",
      "verification",
      "expected_revision",
      "expected_evidence_digest",
      "expected_comparison_fingerprint",
    ];
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some((key) => !allowed.includes(key)) ||
      ![
        input.left,
        input.right,
        input.expected_evidence_digest,
        input.expected_comparison_fingerprint,
      ].every((v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v)) ||
      !input.selection ||
      typeof input.selection !== "object" ||
      Array.isArray(input.selection) ||
      Object.keys(input.selection).sort().join(",") !== "confirmed,race,topic,year_a,year_b" ||
      typeof input.selection.race !== "string" ||
      input.selection.race.length > 100 ||
      !Number.isInteger(input.selection.year_a) ||
      !Number.isInteger(input.selection.year_b) ||
      typeof input.selection.confirmed !== "boolean" ||
      !["all", ...TOPIC_KEYS, "unclassified"].includes(input.selection.topic) ||
      ![...TOPIC_KEYS, "unclassified"].includes(input.note_topic) ||
      ![input.differences, input.verification].every(
        (v) => typeof v === "string" && v.length <= 2000,
      ) ||
      !Number.isSafeInteger(input.expected_revision) ||
      input.expected_revision < 0
    )
      throw new ReviewError(400, "請檢查比較選擇、備註及版本；每欄最多 2000 字。");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      let before;
      try {
        before = this._comparison(input.left, input.right, input.selection);
      } catch (error) {
        if (error instanceof ReviewError) throw error;
        throw new ReviewError(400, error.message);
      }
      if (before.comparison_fingerprint !== input.expected_comparison_fingerprint)
        throw new ReviewError(409, "比較資料或備註已更新，請重新載入後再保存。");
      const row = before.rows.find((r) => r.topic === input.note_topic);
      if (!row || row.evidence_digest !== input.expected_evidence_digest)
        throw new ReviewError(409, "主題或比較依據已變，請重新載入。");
      if ((row.manual_note?.revision ?? 0) !== input.expected_revision)
        throw new ReviewError(409, "備註版本已更新，請重新載入。");
      const payload = {
        context: row.note_context,
        race_name: before.race_name,
        evidence_digest: row.evidence_digest,
        differences: input.differences.trim(),
        verification: input.verification.trim(),
      };
      const revision = (row.manual_note?.revision ?? 0) + 1,
        at = new Date().toISOString();
      this.db
        .prepare(
          `INSERT INTO comparison_notes VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,revision=excluded.revision,updated_at=excluded.updated_at`,
        )
        .run(row.note_id, input.left, input.right, JSON.stringify(payload), revision, at);
      const { manual_note, ...basis } = row;
      this.db
        .prepare(
          "INSERT INTO comparison_note_events(note_id,revision,payload_json,created_at) VALUES (?,?,?,?)",
        )
        .run(row.note_id, revision, JSON.stringify({ ...payload, basis }), at);
      const after = this._comparison(input.left, input.right, input.selection);
      this.db.exec("COMMIT");
      return {
        row: after.rows.find((r) => r.topic === input.note_topic),
        comparison_fingerprint: after.comparison_fingerprint,
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  exportMany(ids) {
    this.db.exec("BEGIN");
    try {
      return ids.map((id) => this._export(id));
    } finally {
      this.db.exec("ROLLBACK");
    }
  }
  catalog() {
    return this.db
      .prepare(
        "SELECT id,mode,created_at,source_json FROM review_datasets ORDER BY created_at DESC,id DESC",
      )
      .all()
      .map(({ source_json, ...row }) => {
        const source = JSON.parse(source_json);
        return { ...row, target_year: source.run.target_year };
      });
  }
  _export(id) {
    const source = this.source(id),
      state = this.state(id),
      byKey = new Map(state.decisions.map((row) => [row.record_key, row]));
    return {
      schema_version: 1,
      kind: "private_manual_review",
      mode: source.mode,
      dataset_id: id,
      exported_at: new Date().toISOString(),
      source_digest: source.source_digest,
      rule_version: source.rule_version,
      run: source.run,
      target: source.target,
      summary: state.summary,
      records: source.records.map((record) => ({
        automatic: record,
        manual: byKey.get(record.key) ?? null,
        confirmed_decision: byKey.get(record.key)?.decision ?? "pending",
        history: this.history(id, record.key),
      })),
      topic_reviews: this.topicDecisions(id).map((row) => ({
        ...row,
        history: this.topicHistory(id, row.item_id),
      })),
      summary_reviews: this.summaryDecisions(id).map((row) => ({
        ...row,
        history: this.summaryHistory(id, row.point_id),
      })),
    };
  }
  summaryDecisions(id) {
    return this.db
      .prepare(
        "SELECT point_id,evidence_digest,status,text,note,revision,rule_version,updated_at FROM summary_decisions WHERE dataset_id=? ORDER BY point_id",
      )
      .all(id);
  }
  summaryHistory(id, pointId) {
    return this.db
      .prepare(
        "SELECT revision,payload_json,created_at FROM summary_events WHERE dataset_id=? AND point_id=? ORDER BY revision DESC",
      )
      .all(id, pointId)
      .map((row) => ({
        revision: row.revision,
        ...JSON.parse(row.payload_json),
        saved_at: row.created_at,
      }));
  }
  saveSummary(id, input) {
    const allowed = [
      "point_id",
      "status",
      "text",
      "note",
      "expected_revision",
      "expected_evidence_digest",
      "expected_summary_fingerprint",
    ];
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some((key) => !allowed.includes(key)) ||
      typeof input.point_id !== "string" ||
      !/^[a-f0-9]{64}$/.test(input.point_id) ||
      !["pending", "confirmed", "uncertain", "excluded"].includes(input.status) ||
      typeof input.text !== "string" ||
      input.text.length > 2000 ||
      (["confirmed", "uncertain"].includes(input.status) && !input.text.trim()) ||
      typeof input.note !== "string" ||
      input.note.length > 2000 ||
      !Number.isSafeInteger(input.expected_revision) ||
      input.expected_revision < 0 ||
      typeof input.expected_evidence_digest !== "string" ||
      !/^[a-f0-9]{64}$/.test(input.expected_evidence_digest) ||
      typeof input.expected_summary_fingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(input.expected_summary_fingerprint)
    )
      throw new ReviewError(400, "請檢查摘要文字、狀態、備註及版本；確認或未確定時摘要不可留空。");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const before = buildSummary(this._export(id));
      if (before.summary_fingerprint !== input.expected_summary_fingerprint)
        throw new ReviewError(409, "留言、主題或摘要已更新，請重新載入後再保存。");
      const point = before.points.find((row) => row.id === input.point_id);
      if (!point || point.evidence_digest !== input.expected_evidence_digest)
        throw new ReviewError(409, "摘要依據已改變或不再可用，請重新載入後覆核。");
      const current = this.db
        .prepare("SELECT revision FROM summary_decisions WHERE dataset_id=? AND point_id=?")
        .get(id, input.point_id);
      if ((current?.revision ?? 0) !== input.expected_revision)
        throw new ReviewError(409, "這個摘要重點已更新，請重新載入。");
      const revision = (current?.revision ?? 0) + 1,
        at = new Date().toISOString();
      const payload = {
        evidence_digest: point.evidence_digest,
        status: input.status,
        text: input.status === "pending" ? "" : input.text.trim(),
        note: input.note.trim(),
        rule_version: SUMMARY_RULE_VERSION,
        basis: {
          race_key: point.race_key,
          race_name: point.race_name,
          event_year: point.event_year,
          topic: point.topic,
          topic_status: point.topic_status,
          automatic: point.automatic,
          evidence: point.evidence,
        },
      };
      this.db
        .prepare(
          `INSERT INTO summary_decisions VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(dataset_id,point_id) DO UPDATE SET
        evidence_digest=excluded.evidence_digest,status=excluded.status,text=excluded.text,note=excluded.note,revision=excluded.revision,rule_version=excluded.rule_version,updated_at=excluded.updated_at`,
        )
        .run(
          id,
          input.point_id,
          payload.evidence_digest,
          payload.status,
          payload.text,
          payload.note,
          revision,
          payload.rule_version,
          at,
        );
      this.db
        .prepare(
          "INSERT INTO summary_events(dataset_id,point_id,revision,payload_json,created_at) VALUES (?,?,?,?,?)",
        )
        .run(id, input.point_id, revision, JSON.stringify(payload), at);
      const after = buildSummary(this._export(id));
      this.db.exec("COMMIT");
      return {
        point: after.points.find((row) => row.id === input.point_id),
        counts: after.counts,
        summary_fingerprint: after.summary_fingerprint,
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  topicDecisions(id) {
    return this.db
      .prepare(
        "SELECT item_id,evidence_digest,status,labels_json,note,revision,rule_version,updated_at FROM topic_decisions WHERE dataset_id=? ORDER BY item_id",
      )
      .all(id)
      .map(({ labels_json, ...row }) => ({ ...row, labels: JSON.parse(labels_json) }));
  }
  topicHistory(id, itemId) {
    return this.db
      .prepare(
        "SELECT revision,payload_json,created_at FROM topic_events WHERE dataset_id=? AND item_id=? ORDER BY revision DESC",
      )
      .all(id, itemId)
      .map((row) => ({
        revision: row.revision,
        ...JSON.parse(row.payload_json),
        saved_at: row.created_at,
      }));
  }
  saveTopics(id, input) {
    const keys = [
      "item_id",
      "status",
      "labels",
      "note",
      "expected_revision",
      "expected_evidence_digest",
      "expected_review_fingerprint",
    ];
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some((key) => !keys.includes(key)) ||
      typeof input.item_id !== "string" ||
      !/^[a-f0-9]{64}$/.test(input.item_id) ||
      !["pending", "confirmed", "uncertain"].includes(input.status) ||
      !Array.isArray(input.labels) ||
      input.labels.length > TOPIC_KEYS.length ||
      new Set(input.labels).size !== input.labels.length ||
      input.labels.some((key) => typeof key !== "string" || !Object.hasOwn(TOPICS, key)) ||
      typeof input.note !== "string" ||
      input.note.length > 2000 ||
      !Number.isSafeInteger(input.expected_revision) ||
      input.expected_revision < 0 ||
      !/^[a-f0-9]{64}$/.test(input.expected_evidence_digest ?? "") ||
      !/^[a-f0-9]{64}$/.test(input.expected_review_fingerprint ?? "")
    )
      throw new ReviewError(400, "請檢查主題、覆核狀態、版本及備註。");
    if (input.status === "confirmed" && !input.labels.length)
      throw new ReviewError(400, "確認時請至少選一個主題；不屬於五類可選「其他」。");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const before = buildConfirmed(this._export(id));
      if (before.review_fingerprint !== input.expected_review_fingerprint)
        throw new ReviewError(409, "其他視窗已更改覆核或主題，請重新載入後再保存。");
      const item = before.records.find((row) => row.id === input.item_id);
      if (!item)
        throw new ReviewError(409, "這項目目前不在可用人工保留資料中，請先完成或修正原有覆核。");
      if (item.topics.evidence_digest !== input.expected_evidence_digest)
        throw new ReviewError(409, "原文版本已改變，請重新載入後確認主題。");
      const current = this.db
        .prepare("SELECT revision FROM topic_decisions WHERE dataset_id=? AND item_id=?")
        .get(id, input.item_id);
      if ((current?.revision ?? 0) !== input.expected_revision)
        throw new ReviewError(409, "這條主題修正已更新，請重新載入。");
      const revision = (current?.revision ?? 0) + 1,
        at = new Date().toISOString(),
        payload = {
          evidence_digest: item.topics.evidence_digest,
          status: input.status,
          labels:
            input.status === "pending"
              ? []
              : TOPIC_KEYS.filter((key) => input.labels.includes(key)),
          note: input.note.trim(),
          rule_version: TOPIC_RULE_VERSION,
        };
      this.db
        .prepare(
          `INSERT INTO topic_decisions VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(dataset_id,item_id) DO UPDATE SET
        evidence_digest=excluded.evidence_digest,status=excluded.status,labels_json=excluded.labels_json,note=excluded.note,
        revision=excluded.revision,rule_version=excluded.rule_version,updated_at=excluded.updated_at`,
        )
        .run(
          id,
          input.item_id,
          payload.evidence_digest,
          payload.status,
          JSON.stringify(payload.labels),
          payload.note,
          revision,
          payload.rule_version,
          at,
        );
      this.db
        .prepare(
          "INSERT INTO topic_events(dataset_id,item_id,revision,payload_json,created_at) VALUES (?,?,?,?,?)",
        )
        .run(id, input.item_id, revision, JSON.stringify(payload), at);
      const after = buildConfirmed(this._export(id)),
        saved = after.records.find((row) => row.id === input.item_id);
      this.db.exec("COMMIT");
      return {
        item_id: saved.id,
        topics: saved.topics,
        topic_summary: after.topic_summary,
        review_fingerprint: after.review_fingerprint,
      };
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
