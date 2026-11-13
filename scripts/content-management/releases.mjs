import { assertConfirmedExperience } from "../../src/lib/confirmed-race-experience-schema.mjs";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Workflow } from "./workflow.mjs";
import { confirmedHandoff, handoffHtml, contentHash, escapeHtml as e } from "./handoff.mjs";
import { shell } from "./views.mjs";
import { ReviewError } from "../threads/review-store.mjs";

export class Releases {
  constructor(content) {
    this.content = content;
    this.w = new Workflow(content);
    this.db = content.db;
    this.db
      .exec(`CREATE TABLE IF NOT EXISTS site_releases(id TEXT PRIMARY KEY, website_id TEXT NOT NULL REFERENCES workflow_docs(id), revision INTEGER NOT NULL, hash TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(website_id,revision,hash));
    CREATE TABLE IF NOT EXISTS site_release_checks(id TEXT PRIMARY KEY, release_id TEXT NOT NULL REFERENCES site_releases(id), payload TEXT NOT NULL, created_at TEXT NOT NULL);`);
  }
  list(websiteId) {
    return this.db
      .prepare("SELECT * FROM site_releases WHERE website_id=? ORDER BY created_at DESC,rowid DESC")
      .all(websiteId)
      .map((r) => this.decode(r));
  }
  decode(r) {
    return {
      ...r,
      payload: JSON.parse(r.payload),
      checks: this.db
        .prepare(
          "SELECT payload,created_at FROM site_release_checks WHERE release_id=? ORDER BY rowid DESC",
        )
        .all(r.id)
        .map((c) => ({ ...JSON.parse(c.payload), recorded_at: c.created_at })),
    };
  }
  get(id) {
    const r = this.db.prepare("SELECT * FROM site_releases WHERE id=?").get(id);
    if (!r) throw new ReviewError(404, "找不到接入版本。");
    return this.decode(r);
  }
  current(r) {
    try {
      const b = confirmedHandoff(this.content, r.website_id, r.revision);
      return (
        r.payload.schema_version === 2 &&
        contentHash(b.public_copy) === r.payload.manifest.public_content_hash &&
        contentHash({
          public_copy: b.public_copy,
          adapter: 2,
          ratings: r.payload.existing_confirmed_display?.assessments ?? null,
        }) === r.hash
      );
    } catch {
      return false;
    }
  }
  prepare(input) {
    if (
      Object.keys(input).sort().join() !== "expected_revision,id" ||
      !Number.isInteger(input.expected_revision)
    )
      throw new ReviewError(400, "請指定已確認版本。");
    const bundle = confirmedHandoff(this.content, input.id, input.expected_revision);
    // Reuse ratings only when the exact existing public text belongs to this CMS version.
    let existing = null;
    for (const file of ["hzmb-half-2025.json", "hk-marathon-2025.json"]) {
      const p = JSON.parse(
        readFileSync(new URL("../../content/race-experiences/" + file, import.meta.url), "utf8"),
      );
      if (
        p.sourceWebsiteId === input.id &&
        p.copyRevision === input.expected_revision &&
        p.raceId === bundle.public_copy.race_id &&
        p.year === bundle.public_copy.year &&
        p.title === bundle.public_copy.title &&
        JSON.stringify(p.sections) === JSON.stringify(bundle.public_copy.sections)
      ) {
        assertConfirmedExperience(p, p.raceId);
        existing = p;
      }
    }
    const hash = contentHash({
      public_copy: bundle.public_copy,
      adapter: 2,
      ratings: existing?.assessments ?? null,
    });
    const prior = this.list(input.id).find(
      (r) => r.revision === input.expected_revision && r.hash === hash,
    );
    if (prior) return prior;
    const payload = {
      schema_version: 2,
      integration: {
        format: "nxtgo-five-topic-copy-v1",
        target: "reviewable-public-copy",
        automatic_public_write: false,
      },
      manifest: {
        ...bundle.manifest,
        scores: existing
          ? Object.fromEntries(Object.entries(existing.assessments).map(([k, a]) => [k, a.score]))
          : bundle.manifest.scores,
        rating_revision: existing?.ratingRevision ?? null,
        rating_content_hash: existing ? contentHash(existing.assessments) : null,
      },
      public_copy: bundle.public_copy,
      existing_confirmed_display: existing,
      publication_approved: false,
      published: false,
      requires_publication_approval: true,
    };
    const id = randomUUID(),
      at = new Date().toISOString();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("INSERT INTO site_releases VALUES(?,?,?,?,?,?)")
        .run(id, input.id, input.expected_revision, hash, JSON.stringify(payload), at);
      this.w.event(input.id, {
        action: "site_release_prepared",
        release_id: id,
        revision: input.expected_revision,
        public_content_hash: hash,
        publication_approved: false,
      });
      this.db.exec("COMMIT");
      return this.get(id);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  record(input) {
    const keys = [
      "release_id",
      "expected_revision",
      "kind",
      "status",
      "checked_at",
      "notes",
      "reference",
    ];
    if (
      !input ||
      Object.keys(input).sort().join() !== keys.sort().join() ||
      !["browser", "content", "build", "deployment_observation"].includes(input.kind) ||
      !["pass", "fail", "limited", "not_tested"].includes(input.status) ||
      !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(input.checked_at) ||
      !Number.isFinite(Date.parse(input.checked_at)) ||
      Date.parse(input.checked_at) > Date.now() + 60000 ||
      ![input.notes, input.reference].every((v) => typeof v === "string" && v.length <= 4000) ||
      !input.notes.trim() ||
      /[\r\n]/.test(input.reference) ||
      /token=|password=|cookie=|Bearer /i.test(input.reference)
    )
      throw new ReviewError(400, "請填有效驗收類型、時間、結果及限制；不要輸入憑證。");
    const r = this.get(input.release_id);
    if (r.revision !== input.expected_revision || !this.current(r))
      throw new ReviewError(409, "接入版本已過期，請重新確認及準備。");
    const result = {
      ...input,
      content_hash: r.hash,
      actor: "local_operator",
      provenance: "operator_recorded",
      publication_approved: false,
    };
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db
        .prepare("INSERT INTO site_release_checks VALUES(?,?,?,?)")
        .run(randomUUID(), r.id, JSON.stringify(result), new Date().toISOString());
      this.w.event(r.website_id, {
        action: "site_qa_recorded",
        release_id: r.id,
        revision: r.revision,
        kind: input.kind,
        status: input.status,
        publication_approved: false,
      });
      this.db.exec("COMMIT");
      return this.get(r.id);
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  preview(id) {
    const r = this.get(id);
    if (!this.current(r)) throw new ReviewError(409, "接入版本已過期。");
    const p = r.payload.existing_confirmed_display;
    return handoffHtml({ manifest: r.payload.manifest, public_copy: r.payload.public_copy })
      .replace(
        "</html>",
        (p
          ? "<section><h2>沿用已確認評分</h2>" +
            Object.entries(p.assessments)
              .map(
                ([key, a]) =>
                  `<h3>${e({ course: "賽道體驗", organization: "大會執行", aid: "補給體驗" }[key] || key)}：${a.score === null ? "未評" : a.score + " / 5"}</h3><p>${e(a.comment)}</p><p>依據：${e(a.basis)}</p><p>適用：${e(a.suitedFor)}</p><p>${e(a.positives.join("；"))}</p><p>${e(a.concerns.join("；"))}</p>`,
              )
              .join("") +
            "</section>"
          : "") + "</html>",
      )
      .replace(
        "<p>無評分。",
        "<p>" + (p ? "評分只沿用相同已確認版本。" : "本次沒有新增或批准評分。"),
      );
  }
}

export function releasePage(content, token, id) {
  const service = new Releases(content),
    w = new Workflow(content),
    r = w.get(id),
    releases = service.list(id);
  if (r.kind !== "website") throw new ReviewError(400, "請選網站稿。");
  const body = `<h1>版本、網站接入及驗收</h1><p><a href="/race-workspace?race=${e(r.data.race_id)}&year=${r.data.year}&website=${e(id)}">返回賽事工作頁</a></p><p>${e(r.data.title)} · CMS 第 ${r.revision} 版 · ${r.status === "confirmed" ? "文字已確認" : "待確認"}</p><p class="banner">文字確認、驗收、發布批准及實際部署分開。此頁不修改公開資料、不提交 Git、不部署。GitHub／正式版本只記錄已核對的參考，沒有紀錄表示未知。</p><button id="prepare" ${r.status !== "confirmed" ? "disabled" : ""}>準備指定已確認版本接入包</button><p id="status" role="status"></p>${releases.map((x) => `<section class="panel"><h2>網站接入稿 · 第 ${x.revision} 版</h2><p>CMS 第 ${x.revision} 版 · ${service.current(x) ? "目前依據一致" : "已過期：正文或依據改變，舊驗收不可沿用"}</p><details><summary>版本識別資料</summary><p>接入 ID：${e(x.id)}</p><p>公開內容 hash：${e(x.hash)}</p></details><p>評分：${x.payload.existing_confirmed_display ? "沿用相同已確認公開版本" : "沒有新增評分；接入前須另行覆核"}</p><p>本次接入未授予新發布批准 · 部署：本工具未執行</p><a href="/release-preview?id=${e(x.id)}" target="_blank" rel="noopener">預覽接入內容</a> · <a href="/api/content/releases/package?id=${e(x.id)}">下載接入包</a><h3>驗收／上線觀察紀錄</h3><p>以下為操作者記錄，不是自動 CI 證明或發布批准；每筆綁定版本及 hash。</p>${x.checks.map((c) => `<p>${e({ browser: "手機驗收", content: "內容核對", build: "建置檢查", deployment_observation: "正式版本觀察" }[c.kind])} · ${e({ pass: "通過", fail: "失敗", limited: "受限", not_tested: "未測" }[c.status])} · 查閱 ${e(c.checked_at)} · 保存 ${e(c.recorded_at)}</p><p>${e(c.notes)}</p><pre>${e(c.reference)}</pre>`).join("") || "<p>尚未記錄，驗收及正式版本未知。</p>"}<form data-release="${e(x.id)}" data-revision="${x.revision}"><label>類型<select name="kind"><option value="browser">手機／瀏覽器驗收</option><option value="content">內容核對</option><option value="build">建置／GitHub 檢查</option><option value="deployment_observation">正式版本觀察（不是執行部署）</option></select></label><label>結果<select name="status"><option value="not_tested">未測</option><option value="pass">通過</option><option value="fail">失敗</option><option value="limited">受限</option></select></label><label>實際查閱時間（含時區）<input name="checked_at" placeholder="2026-11-13T21:00:00+08:00" required></label><label>結果及限制<textarea name="notes" required maxlength="4000"></textarea></label><label>對應 commit／CI／部署版本／私人報告參考（不填憑證）<input name="reference" maxlength="4000"></label><button ${!service.current(x) ? "disabled" : ""}>保存版本驗收紀錄</button></form></section>`).join("")}`;
  const script = `const post=async(path,body)=>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Import-Token':document.querySelector('meta[name="import-token"]').content},body:JSON.stringify(body)});const b=await r.json();if(!r.ok)throw Error(b.error||'保存失敗');location.reload();};document.querySelector('#prepare').onclick=async()=>{try{await post('/api/content/releases/prepare',${JSON.stringify({ id, expected_revision: r.revision })});}catch(e){document.querySelector('#status').textContent=e.message;}};document.querySelectorAll('form[data-release]').forEach(f=>f.onsubmit=async(ev)=>{ev.preventDefault();try{await post('/api/content/releases/qa',{...Object.fromEntries(new FormData(f)),release_id:f.dataset.release,expected_revision:Number(f.dataset.revision)});}catch(e){document.querySelector('#status').textContent=e.message;}});`;
  return shell("website", content.mode, token, body, script);
}
