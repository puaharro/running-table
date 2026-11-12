import { isIP } from "node:net";
import { createHash, randomUUID } from "node:crypto";
import { SOURCES, publicReference } from "../research/sources.mjs";
import { ReviewError } from "../threads/review-store.mjs";

export const TOPICS = ["賽道", "補給", "寄存", "交通", "大會安排"];
export const COVERAGE = {
  not_started: "未搜尋",
  searching: "搜尋中",
  awaiting_login: "等待你登入",
  reviewed: "已讀原文",
  no_results: "已搜尋但無相關結果",
  inaccessible: "嘗試後仍無法存取",
};
const digest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function fail(message, status = 400) {
  throw new ReviewError(status, message);
}
function exact(value, keys) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join() !== keys.sort().join()
  )
    fail("操作欄位不正確。");
}
function text(value, max = 20000) {
  return typeof value === "string" && value.length <= max;
}
function url(value) {
  try {
    return publicReference("blog", value).url;
  } catch {
    // Known platforms use their own validation.
    for (const platform of Object.keys(SOURCES))
      try {
        return publicReference(platform, value).url;
      } catch {}
    fail("請填不含登入資料的公開 HTTPS 原文連結。");
  }
}
function officialUrl(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    fail("官方連結無效。");
  }
  const host = u.hostname.toLowerCase();
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    isIP(host.replace(/^\[|\]$/g, "")) ||
    !host.includes(".") ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)
  )
    fail("官方連結須為不含登入資料的公開 HTTPS 網址。");
  return u.href;
}
export function initWorkflow(content) {
  content.db
    .exec(`CREATE TABLE IF NOT EXISTS workflow_docs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,revision INTEGER NOT NULL,status TEXT NOT NULL,data_json TEXT NOT NULL,basis_json TEXT NOT NULL,updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS workflow_versions(id TEXT NOT NULL,revision INTEGER NOT NULL,record_json TEXT NOT NULL,PRIMARY KEY(id,revision));
  CREATE TABLE IF NOT EXISTS workflow_events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL,event_json TEXT NOT NULL,created_at TEXT NOT NULL);`);
}
export class Workflow {
  constructor(content) {
    this.content = content;
    this.db = content.db;
  }
  list(kind) {
    return this.db
      .prepare("SELECT * FROM workflow_docs ORDER BY updated_at DESC,id")
      .all()
      .filter((r) => !kind || r.kind === kind)
      .map((r) => this.decode(r));
  }
  decode(r) {
    return {
      id: r.id,
      kind: r.kind,
      revision: r.revision,
      status: r.status,
      data: JSON.parse(r.data_json),
      basis: JSON.parse(r.basis_json),
      updated_at: r.updated_at,
    };
  }
  get(id) {
    if (typeof id !== "string" || id.length > 240) fail("版本識別無效。");
    const r = this.db.prepare("SELECT * FROM workflow_docs WHERE id=?").get(id);
    if (!r) fail("找不到版本。", 404);
    return this.decode(r);
  }
  history(id) {
    this.get(id);
    return this.db
      .prepare("SELECT record_json FROM workflow_versions WHERE id=? ORDER BY revision DESC")
      .all(id)
      .map((r) => JSON.parse(r.record_json));
  }
  events(id) {
    this.get(id);
    return this.db
      .prepare(
        "SELECT sequence,event_json,created_at FROM workflow_events WHERE id=? ORDER BY sequence",
      )
      .all(id)
      .map((r) => ({
        sequence: r.sequence,
        ...JSON.parse(r.event_json),
        created_at: r.created_at,
      }));
  }
  event(id, data) {
    this.db
      .prepare("INSERT INTO workflow_events(id,event_json,created_at) VALUES(?,?,?)")
      .run(id, JSON.stringify(data), new Date().toISOString());
  }
  race(id) {
    const r = this.content.catalog.find((r) => r.id === id);
    if (!r) fail("請選擇現有或私人新增賽事。");
    return r;
  }
  coverage(raceId, year) {
    this.race(raceId);
    return Object.keys(SOURCES).map(
      (platform) =>
        this.list("coverage").find(
          (r) => r.data.race_id === raceId && r.data.year === year && r.data.platform === platform,
        ) ?? {
          id: `coverage:${raceId}:${year}:${platform}`,
          revision: 0,
          status: "draft",
          data: {
            race_id: raceId,
            year,
            platform,
            state: "not_started",
            query: "",
            checked_at: "",
            links: [],
            notes: "",
          },
        },
    );
  }
  basis(data) {
    const race = this.race(data.race_id);
    const draft = data.draft_id ? this.content.get(data.draft_id) : null;
    if (draft && (draft.race_id !== data.race_id || draft.year !== data.year))
      fail("草稿與網站稿賽事／年份不符。");
    return {
      race_digest: digest(race),
      draft_id: draft?.id ?? null,
      draft_revision: draft?.revision ?? null,
      coverage: this.coverage(data.race_id, data.year).map((r) => ({
        id: r.id,
        revision: r.revision,
      })),
    };
  }
  save(input) {
    exact(input, ["id", "expected_revision", "kind", "data"]);
    if (
      !["race", "coverage", "website"].includes(input.kind) ||
      !Number.isSafeInteger(input.expected_revision) ||
      input.expected_revision < 0 ||
      typeof input.id !== "string"
    )
      fail("版本或類型無效。");
    const d = structuredClone(input.data);
    let basis = {};
    if (input.kind === "race") {
      exact(d, ["name", "year", "date", "groups", "official_url", "notes"]);
      if (
        !/^private-[a-f0-9-]{36}$/.test(input.id) ||
        !text(d.name, 160) ||
        !d.name.trim() ||
        !text(d.groups, 500) ||
        !text(d.notes, 2000) ||
        !text(d.date, 10) ||
        !text(d.official_url, 2000)
      )
        fail("請檢查賽事名稱、組別及資料長度。");
      if (
        d.date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
          !Number.isFinite(Date.parse(d.date)) ||
          new Date(d.date).toISOString().slice(0, 10) !== d.date ||
          Number(d.date.slice(0, 4)) !== d.year)
      )
        fail("賽事日期與年份不符；未知請留空。");
      if (d.official_url) d.official_url = officialUrl(d.official_url);
    } else if (input.kind === "coverage") {
      exact(d, ["race_id", "year", "platform", "state", "query", "checked_at", "links", "notes"]);
      this.race(d.race_id);
      if (
        !Object.hasOwn(SOURCES, d.platform) ||
        input.id !== `coverage:${d.race_id}:${d.year}:${d.platform}` ||
        !Object.hasOwn(COVERAGE, d.state) ||
        !text(d.query, 500) ||
        !text(d.notes, 4000) ||
        !text(d.checked_at, 40) ||
        !Array.isArray(d.links) ||
        d.links.length > 50
      )
        fail("來源進度欄位無效。");
      d.links = [...new Set(d.links.map((link) => publicReference(d.platform, link).url))];
      if (d.state !== "not_started" && !d.query.trim()) fail("請記錄實際搜尋字詞。");
      if (
        ["reviewed", "no_results", "inaccessible"].includes(d.state) &&
        (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(
          d.checked_at,
        ) ||
          !Number.isFinite(Date.parse(d.checked_at)) ||
          Date.parse(d.checked_at) > Date.now() + 60000)
      )
        fail("請填實際檢查時間，不可填未來時間。");
      if (d.state === "reviewed" && !d.links.length) fail("已讀原文需要至少一個原文連結。");
      if (["no_results", "inaccessible", "awaiting_login"].includes(d.state) && !d.notes.trim())
        fail("請說明搜尋結果、登入需要或存取限制。");
    } else {
      exact(d, ["race_id", "year", "title", "draft_id", "sections"]);
      this.race(d.race_id);
      if (
        !/^website-[a-f0-9-]{36}$/.test(input.id) ||
        !text(d.title, 160) ||
        !d.title.trim() ||
        !(d.draft_id === null || typeof d.draft_id === "string") ||
        !Array.isArray(d.sections) ||
        d.sections.length !== 5
      )
        fail("請填網站稿標題及五個主題。");
      d.sections.forEach((s, i) => {
        exact(s, ["topic", "body", "limitations", "urls"]);
        if (
          s.topic !== TOPICS[i] ||
          !text(s.body, 4000) ||
          !s.body.trim() ||
          !text(s.limitations, 2000) ||
          !s.limitations.trim() ||
          !Array.isArray(s.urls) ||
          s.urls.length > 30
        )
          fail("五個主題均須有正文及觀察限制，資料不足請標明未知。");
        s.urls = [...new Set(s.urls.map(url))];
      });
      basis = this.basis(d);
    }
    if (!Number.isInteger(d.year) || d.year < 1900 || d.year > 2200) fail("年份無效。");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const raw = this.db.prepare("SELECT * FROM workflow_docs WHERE id=?").get(input.id);
      if ((raw?.revision ?? 0) !== input.expected_revision || (raw && raw.kind !== input.kind))
        fail("已有新版本，請重新載入。", 409);
      const revision = input.expected_revision + 1,
        at = new Date().toISOString();
      this.db
        .prepare(
          "INSERT INTO workflow_docs VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,status=excluded.status,data_json=excluded.data_json,basis_json=excluded.basis_json,updated_at=excluded.updated_at",
        )
        .run(input.id, input.kind, revision, "draft", JSON.stringify(d), JSON.stringify(basis), at);
      const record = this.get(input.id);
      this.db
        .prepare("INSERT INTO workflow_versions VALUES(?,?,?)")
        .run(input.id, revision, JSON.stringify(record));
      this.event(input.id, {
        action: "saved",
        actor_type: "local_operator",
        before_revision: input.expected_revision,
        after_revision: revision,
        content_hash: digest(d),
      });
      this.db.exec("COMMIT");
      return record;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  confirm(input) {
    exact(input, [
      "id",
      "expected_revision",
      "content_hash",
      "acknowledge",
      "allow_incomplete",
      "note",
    ]);
    if (
      input.acknowledge !== true ||
      typeof input.allow_incomplete !== "boolean" ||
      !text(input.note, 2000) ||
      !input.note.trim()
    )
      fail("請閱讀完整指定版本、勾選確認及填寫備註。");
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const r = this.get(input.id);
      if (
        r.kind === "coverage" ||
        r.revision !== input.expected_revision ||
        r.status !== "draft" ||
        digest(r.data) !== input.content_hash
      )
        fail("指定版本已改或不能確認，請重新載入。", 409);
      this.assertBasis(r);
      if (r.kind === "website") {
        if (/候選|待覆核|待確認|未部署/.test(r.data.title))
          fail("公開標題含內部工作狀態，請另存新版本移除後再確認。");
        const pending = this.coverage(r.data.race_id, r.data.year).filter(
          (r) => !["reviewed", "no_results"].includes(r.data.state),
        );
        if (pending.length && !input.allow_incomplete)
          fail("來源尚未完成；先續查，或明確確認保留全部未完成來源及限制。");
      }
      this.db.prepare("UPDATE workflow_docs SET status='confirmed' WHERE id=?").run(r.id);
      this.event(r.id, {
        action: "content_confirmed",
        actor_type: "local_operator",
        revision: r.revision,
        content_hash: input.content_hash,
        note: input.note,
        acknowledged_incomplete: input.allow_incomplete,
        publication_approved: false,
      });
      this.db.exec("COMMIT");
      return this.get(r.id);
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  assertBasis(r) {
    if (r.kind === "website" && digest(this.basis(r.data)) !== digest(r.basis))
      fail("依據版本已改，請另存網站稿新版本再覆核。", 409);
  }
  hash(r) {
    return digest(r.data);
  }
  export(id, revision) {
    const r = this.get(id);
    if (r.status !== "confirmed" || r.revision !== revision)
      fail("只能匯出已人工確認的指定版本。", 409);
    this.assertBasis(r);
    const coverage = r.kind === "website" ? this.coverage(r.data.race_id, r.data.year) : [];
    // This bundle is private staging material, never an automatic publish command.
    const bundle = {
      schema_version: 1,
      kind: r.kind,
      id: r.id,
      revision: r.revision,
      content_hash: digest(r.data),
      content: r.data,
      basis: r.basis,
      coverage: coverage.map((c) => ({
        platform: c.data.platform,
        state: c.data.state,
        revision: c.revision,
      })),
      research_complete: coverage.length
        ? coverage.every((c) => ["reviewed", "no_results"].includes(c.data.state))
        : null,
      publication_approved: false,
      deployment_required_approval: true,
      published: false,
      demo: this.content.mode === "demo",
    };
    this.event(r.id, {
      action: "exported",
      actor_type: "local_operator",
      revision: r.revision,
      content_hash: bundle.content_hash,
      publication_approved: false,
    });
    return bundle;
  }
}
export function privateRaces(content) {
  return new Workflow(content).list("race").map((r) => ({
    id: r.id,
    name: r.data.name,
    date: r.data.date,
    year: r.data.year,
    dateUnknown: !r.data.date,
    groups: r.data.groups
      .split(/\n/)
      .filter(Boolean)
      .map((name, i) => ({ id: `${r.id}-${i}`, name, channels: [] })),
    venue: "未知",
    summary: r.data.notes,
    sourceUrl: r.data.official_url,
    private: true,
    revision: r.revision,
    content_status: r.status,
  }));
}
export const newWorkflowId = (kind) => `${kind === "race" ? "private" : "website"}-${randomUUID()}`;
