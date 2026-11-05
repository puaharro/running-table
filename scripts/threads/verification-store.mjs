import { ReviewError } from "./review-store.mjs";
export const VERIFICATION_STATUSES = ["pending", "in_progress", "verified", "unable"];
export function installVerification(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS verification_tasks (
    id TEXT PRIMARY KEY,note_id TEXT NOT NULL REFERENCES comparison_notes(id),payload_json TEXT NOT NULL,revision INTEGER NOT NULL,updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS verification_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,task_id TEXT NOT NULL REFERENCES verification_tasks(id),revision INTEGER NOT NULL,payload_json TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(task_id,revision));`);
}
export function noteBasis(store, noteId, allowed) {
  const raw = store.db
    .prepare(
      "SELECT left_dataset,right_dataset,payload_json,revision FROM comparison_notes WHERE id=?",
    )
    .get(noteId);
  if (!raw || !allowed.includes(raw.left_dataset) || !allowed.includes(raw.right_dataset))
    throw new ReviewError(404, "找不到這份工作區的比較備註。");
  const note = JSON.parse(raw.payload_json),
    c = note.context;
  const comparison = store._comparison(c.left, c.right, {
    race: c.race,
    year_a: c.year_a,
    year_b: c.year_b,
    topic: c.topic,
    confirmed: c.confirmed,
  });
  const row = comparison.rows[0];
  if (!row) throw new ReviewError(409, "請先重新核對比較備註。");
  return {
    note_id: noteId,
    note_revision: raw.revision,
    context: c,
    race_name: comparison.race_name,
    topic_label: row.label,
    differences: note.differences,
    verification: note.verification,
    evidence_digest: row.evidence_digest,
    note_status: row.note_status,
    row,
  };
}
function history(store, id) {
  return store.db
    .prepare(
      "SELECT revision,payload_json,created_at FROM verification_events WHERE task_id=? ORDER BY revision DESC",
    )
    .all(id)
    .map((row) => ({
      revision: row.revision,
      ...JSON.parse(row.payload_json),
      saved_at: row.created_at,
    }));
}
export function verificationState(store, allowed, noteId = null) {
  store.db.exec("BEGIN");
  try {
    const basis = noteId ? noteBasis(store, noteId, allowed) : null,
      cache = new Map();
    if (basis) cache.set(noteId, basis);
    const tasks = store.db
      .prepare(
        "SELECT t.id,t.note_id,t.payload_json,t.revision,t.updated_at,n.left_dataset,n.right_dataset FROM verification_tasks t JOIN comparison_notes n ON n.id=t.note_id ORDER BY t.updated_at DESC,t.id",
      )
      .all()
      .filter(
        (row) =>
          allowed.includes(row.left_dataset) &&
          allowed.includes(row.right_dataset) &&
          (!noteId || row.note_id === noteId),
      )
      .map(({ payload_json, left_dataset, right_dataset, ...row }) => {
        if (!cache.has(row.note_id)) cache.set(row.note_id, noteBasis(store, row.note_id, allowed));
        const current = cache.get(row.note_id),
          payload = JSON.parse(payload_json);
        return {
          ...row,
          ...payload,
          current,
          needs_recheck:
            payload.basis_note_revision !== current.note_revision ||
            payload.basis_evidence_digest !== current.evidence_digest ||
            current.note_status !== "current",
          history: history(store, row.id),
        };
      });
    return {
      schema_version: 1,
      kind: "private_verification_tracker",
      generated_at: new Date().toISOString(),
      basis,
      tasks,
      counts: {
        total: tasks.length,
        needs_recheck: tasks.filter((t) => t.needs_recheck).length,
        ...Object.fromEntries(
          VERIFICATION_STATUSES.map((s) => [
            s,
            tasks.filter((t) => t.status === s && !t.needs_recheck).length,
          ]),
        ),
      },
    };
  } finally {
    store.db.exec("ROLLBACK");
  }
}
export function saveVerification(store, input, allowed) {
  const keys = [
    "id",
    "note_id",
    "title",
    "status",
    "result",
    "sources",
    "checked_on",
    "expected_revision",
    "expected_note_revision",
    "expected_evidence_digest",
  ];
  if (
    !input ||
    typeof input !== "object" ||
    Array.isArray(input) ||
    Object.keys(input).some((k) => !keys.includes(k)) ||
    ![input.id, input.note_id, input.expected_evidence_digest].every(
      (v) => typeof v === "string" && /^[a-f0-9]{64}$/.test(v),
    ) ||
    typeof input.title !== "string" ||
    !input.title.trim() ||
    input.title.length > 2000 ||
    typeof input.result !== "string" ||
    input.result.length > 4000 ||
    !VERIFICATION_STATUSES.includes(input.status) ||
    !Array.isArray(input.sources) ||
    input.sources.length > 5 ||
    input.sources.some((url) => typeof url !== "string" || url.length > 2000) ||
    typeof input.checked_on !== "string" ||
    ![input.expected_revision, input.expected_note_revision].every(
      (v) => Number.isSafeInteger(v) && v >= 0,
    )
  )
    throw new ReviewError(400, "請檢查事項、狀態、核實結果、來源及版本。");
  const sources = [
    ...new Set(
      input.sources.map((value) => {
        let url;
        try {
          url = new URL(value);
        } catch {
          throw new ReviewError(400, "補充來源需要完整 HTTPS 連結。");
        }
        if (url.protocol !== "https:" || url.username || url.password)
          throw new ReviewError(400, "補充來源只接受不含帳密的 HTTPS 連結。");
        return url.href;
      }),
    ),
  ];
  if (
    input.checked_on &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(input.checked_on) ||
      !Number.isFinite(Date.parse(input.checked_on)) ||
      new Date(input.checked_on).toISOString().slice(0, 10) !== input.checked_on)
  )
    throw new ReviewError(400, "請填有效核實日期。");
  if (["verified", "unable"].includes(input.status) && (!input.result.trim() || !input.checked_on))
    throw new ReviewError(400, "完成或無法確認時，請記錄結果及日期。");
  if (input.status === "verified" && !sources.length)
    throw new ReviewError(400, "標記已核實時，請至少附一個補充來源連結。");
  store.db.exec("BEGIN IMMEDIATE");
  try {
    const basis = noteBasis(store, input.note_id, allowed);
    if (
      basis.note_revision !== input.expected_note_revision ||
      basis.evidence_digest !== input.expected_evidence_digest
    )
      throw new ReviewError(409, "比較備註或原文依據已更新，請重新載入後核對。");
    if (input.status === "verified" && basis.note_status !== "current")
      throw new ReviewError(
        409,
        "比較備註依據已變，請先返回比較重新核對並儲存備註，再記錄已核實。",
      );
    const old = store.db
      .prepare("SELECT note_id,revision FROM verification_tasks WHERE id=?")
      .get(input.id);
    if ((old?.revision ?? 0) !== input.expected_revision || (old && old.note_id !== input.note_id))
      throw new ReviewError(409, "這項追蹤記錄已更新或屬於另一主題，請重新載入。");
    const revision = (old?.revision ?? 0) + 1,
      at = new Date().toISOString();
    const payload = {
      title: input.title.trim(),
      status: input.status,
      result: input.result.trim(),
      sources,
      checked_on: input.checked_on,
      basis_note_revision: basis.note_revision,
      basis_evidence_digest: basis.evidence_digest,
    };
    store.db
      .prepare(
        "INSERT INTO verification_tasks VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload_json=excluded.payload_json,revision=excluded.revision,updated_at=excluded.updated_at",
      )
      .run(input.id, input.note_id, JSON.stringify(payload), revision, at);
    store.db
      .prepare(
        "INSERT INTO verification_events(task_id,revision,payload_json,created_at) VALUES (?,?,?,?)",
      )
      .run(input.id, revision, JSON.stringify({ ...payload, basis }), at);
    store.db.exec("COMMIT");
    return { id: input.id, revision, updated_at: at };
  } catch (error) {
    store.db.exec("ROLLBACK");
    throw error;
  }
}
export function verificationCsv(data) {
  const cell = (v) => {
    let s = String(v ?? "");
    if (/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/u.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      [
        "task_id",
        "note_id",
        "race_name",
        "year_a",
        "year_b",
        "topic",
        "title",
        "status",
        "needs_recheck",
        "result",
        "sources",
        "checked_on",
        "revision",
        "updated_at",
        "comparison_original_evidence",
      ],
      ...data.tasks.map((t) => [
        t.id,
        t.note_id,
        t.current.race_name,
        t.current.context.year_a,
        t.current.context.year_b,
        t.current.topic_label,
        t.title,
        t.status,
        t.needs_recheck,
        t.result,
        t.sources.join("\n"),
        t.checked_on,
        t.revision,
        t.updated_at,
        JSON.stringify({ left: t.current.row.left, right: t.current.row.right }),
      ]),
    ]
      .map((r) => r.map(cell).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
