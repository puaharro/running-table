import { metadataText } from "../research/sources.mjs";
import { createHash } from "node:crypto";
import { TOPICS, TOPIC_KEYS } from "./topics.mjs";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const statuses = {
  draft: "自動摘錄，未覆核",
  confirmed: "人工已確認摘要",
  uncertain: "人工未確定",
  excluded: "已排除摘要重點",
  stale: "依據已變，需重新覆核",
};
const topicStates = {
  confirmed: "人工已確認主題",
  uncertain: "主題未確定",
  suggested: "自動建議主題",
  unclassified: "未分類",
  stale: "主題需重新覆核",
};
const SCRIPT = `const names=${JSON.stringify(statuses)};const controls=['race','year','topic','state','q'];
function update(){let count=0;for(const group of document.querySelectorAll('.summary-group')){let visible=0;for(const card of group.querySelectorAll('.point')){const filter=document.querySelector('#state').value;
card.hidden=!((filter==='all'&&card.dataset.excluded!=='yes')||filter===card.dataset.status||filter==='with_excluded')||!(card.dataset.search+' '+card.querySelector('.point-text').textContent).toLowerCase().includes(document.querySelector('#q').value.trim().toLowerCase());if(!card.hidden)visible++;}
group.hidden=!visible||controls.slice(0,3).some(key=>document.querySelector('#'+key).value!=='all'&&group.dataset[key]!==document.querySelector('#'+key).value);if(!group.hidden)count+=visible;}
document.querySelector('#visible').textContent=count+' 個重點符合條件';}
for(const key of controls)document.querySelector('#'+key).addEventListener(key==='q'?'input':'change',update);update();
for(const form of document.querySelectorAll('.summary-form')){const message=form.querySelector('[role=status]');for(const event of ['input','change'])form.addEventListener(event,()=>{form.dataset.dirty='true';message.textContent='尚未儲存摘要修改';});
form.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(form);const input={point_id:form.dataset.id,status:data.get('status'),text:data.get('text'),note:data.get('note'),expected_revision:Number(data.get('expected_revision')),expected_evidence_digest:data.get('expected_evidence_digest'),expected_summary_fingerprint:data.get('expected_summary_fingerprint')};for(const el of form.elements)el.disabled=true;message.textContent='儲存中…';
try{const response=await fetch(document.querySelector('meta[name=summary-api]').content+'/summary-review',{method:'POST',headers:{'Content-Type':'application/json','X-Review-Token':document.querySelector('meta[name=summary-token]').content},body:JSON.stringify(input)});const result=await response.json();if(!response.ok)throw new Error(result.error||'儲存失敗');const point=result.point;
for(const other of document.querySelectorAll('.summary-form'))other.elements.expected_summary_fingerprint.value=result.summary_fingerprint;
for(const link of document.querySelectorAll('[data-summary-export]')){const url=new URL(link.href);url.searchParams.set('summary',result.summary_fingerprint);link.href=url.href;}
document.querySelector('#fingerprint').textContent=result.summary_fingerprint;
form.elements.expected_revision.value=point.manual.revision;form.elements.expected_evidence_digest.value=point.evidence_digest;form.elements.status.value=point.status==='draft'?'pending':point.status;form.elements.text.value=point.text;form.elements.note.value=point.manual.note;
const card=form.closest('.point');card.dataset.status=point.status;card.dataset.excluded=point.excluded?'yes':'no';card.querySelector('.point-text').textContent=point.text;card.querySelector('.point-status').textContent=names[point.status];card.querySelector('.history').textContent=JSON.stringify(point.manual.history,null,2);
for(const [key,value]of Object.entries(result.counts)){const el=document.querySelector('[data-count='+key+']');if(el)el.textContent=value;}
form.dataset.dirty='false';message.textContent='已儲存摘要第 '+point.manual.revision+' 版 · '+point.manual.updated_at;update();
}catch(error){form.dataset.dirty='true';message.textContent=error.message;}finally{for(const el of form.elements)el.disabled=false;}});}
window.addEventListener('beforeunload',event=>{if(document.querySelector('.summary-form[data-dirty=true]')){event.preventDefault();event.returnValue='';}});`;

export function renderSummary(
  result,
  {
    apiBase = "/api",
    reviewUrl = "/",
    token = "",
    comparisonUrl = `/api/compare?left=${result.dataset_id}`,
  } = {},
) {
  const byId = new Map(result.points.map((p) => [p.id, p]));
  const groups = result.groups
    .map(
      (group) =>
        `<section class="summary-group" data-race="${e(group.race_key)}" data-year="${group.event_year}" data-topic="${e(group.topic)}"><h2>${e(group.race_name)} · ${group.event_year} · ${e(group.topic_label)}</h2>${group.point_ids
          .map((id) => {
            const p = byId.get(id),
              manual = p.manual,
              ev = p.evidence;
            return `<article class="point" id="point-${p.id}" data-status="${e(p.status)}" data-excluded="${p.excluded ? "yes" : "no"}" data-search="${e([ev.original_text, ev.username, p.race_name, p.topic_label, ev.source_metadata?.group, ev.source_metadata?.label].join(" "))}"><p class="meta"><span class="point-status">${e(statuses[p.status])}</span> · ${e(topicStates[p.topic_status])}</p><p class="point-text">${e(p.text)}</p>
    <p class="meta">${ev.kind === "comment" ? "留言" : "主帖"} · @${e(ev.username ?? "作者未知")} · 1 個來源身份${p.known_hk_preset ? "" : " · 自訂賽事，地區未確認"}</p>
    ${ev.source_metadata ? `<p class="meta">${e(metadataText(ev.source_metadata))}</p>` : ""}<details open><summary>原文及來源</summary><blockquote>${e(ev.original_text)}</blockquote>${ev.source_url ? `<a href="${e(ev.source_url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${ev.source_scope === "root" ? "查看來源主帖（沒有留言獨立連結）" : "查看來源"} ↗</a>` : "<p>未有可用來源連結；未補造連結。</p>"}${ev.warnings.length ? `<p class="meta">${ev.warnings.includes("manual_source_unverified") ? "手動貼上來源，未經 API 驗證。 " : ""}${ev.warnings.includes("other_kept_duplicate_candidate") ? "另一來源可能重複，未自動刪除。 " : ""}身份與完整覆核記錄見下方追溯。</p>` : ""}<details><summary>原始觀測及覆核追溯</summary><pre>${e(JSON.stringify(ev, null, 2))}</pre></details></details>
    <details><summary>自動摘錄依據</summary><blockquote>${e(p.automatic.text)}</blockquote><p class="meta">${p.automatic.truncated ? "原文節錄，完整原文見上方。" : "完整原文。"}不合併他人意見、不判斷好壞；人工摘要修正不會改寫此摘錄。</p></details>
    <form class="summary-form" data-id="${p.id}" data-dirty="false"><input type="hidden" name="expected_revision" value="${manual?.revision ?? 0}"><input type="hidden" name="expected_evidence_digest" value="${p.evidence_digest}"><input type="hidden" name="expected_summary_fingerprint" value="${result.summary_fingerprint}">
    <label>修正摘要重點<textarea name="text" maxlength="2000" rows="3">${e(p.text)}</textarea></label><label>摘要覆核狀態<select name="status">${[
      ["pending", "未覆核／還原自動摘錄"],
      ["confirmed", "已人工確認摘要"],
      ["uncertain", "未確定，留待判斷"],
      ["excluded", "排除此摘要重點"],
    ]
      .map(
        ([key, label]) =>
          `<option value="${key}"${(p.status === "draft" || p.status === "stale" ? "pending" : p.status) === key ? " selected" : ""}>${label}</option>`,
      )
      .join("")}</select></label>
    <label>摘要修正備註<textarea name="note" maxlength="2000" rows="2">${e(manual?.note ?? "")}</textarea></label><p class="meta">改文字後請選「已人工確認摘要」或「未確定」再儲存。「未覆核」會還原摘錄；排除只隱藏此重點，不改留言保留決定。人工修正文句仍需你核對是否忠於原文。</p><button${token ? "" : " disabled"}>儲存摘要修正</button><span role="status">${manual ? `已保存摘要第 ${manual.revision} 版 · ${e(manual.updated_at)}` : "尚未儲存摘要修正。"}</span></form><details><summary>摘要修改歷史</summary><pre class="history">${e(JSON.stringify(manual?.history ?? [], null, 2))}</pre></details>
    <p><a href="${e(apiBase)}/confirmed">修改主題分類 →</a> · <a href="${e(reviewUrl)}">修改保留／排除、賽事或年份 →</a></p></article>`;
          })
          .join("")}</section>`,
    )
    .join("");
  const races = [...new Map(result.groups.map((g) => [g.race_key, g.race_name]))];
  const hash = createHash("sha256").update(SCRIPT).digest("base64");
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="summary-token" content="${e(token)}"><meta name="summary-api" content="${e(apiBase)}"><meta http-equiv="Content-Security-Policy" content="default-src 'none';connect-src 'self';style-src 'unsafe-inline';script-src 'sha256-${hash}';base-uri 'none';form-action 'none'"><title>NXTGO · 留言主題摘要</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:#172f2b;font:15px/1.65 system-ui,'Microsoft JhengHei',sans-serif}.top{background:#172f2b;color:white;padding:14px 5vw}.shell{max-width:1100px;margin:auto;padding:28px 22px 60px}h1{font-size:34px}h2{font-size:22px;margin-top:32px}.banner{padding:16px;background:#fff1cf;border:1px solid #e6c576;border-radius:10px}.meta,[role=status]{font-size:13px;color:#5a6e64;overflow-wrap:anywhere}.point{padding:22px;margin:15px 0;background:white;border:1px solid #d9e2db;border-radius:10px}.point-text{font-size:19px;font-weight:600;white-space:pre-wrap;overflow-wrap:anywhere}blockquote{margin:12px 0;padding:14px 18px;background:#f5f7f3;border-left:3px solid #afc1b4;white-space:pre-wrap;overflow-wrap:anywhere}a{color:#166746}.toolbar{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;background:#e9eee6;padding:18px;border-radius:10px}.search{grid-column:1/-1}label{font-size:13px}input,textarea,select{display:block;width:100%;padding:10px;margin:6px 0 12px;border:1px solid #afc1b4;border-radius:6px;background:white;font:inherit}button,.button{display:inline-block;background:#166746;color:white;border:0;border-radius:7px;padding:10px 16px;text-decoration:none;font:inherit;cursor:pointer}button:disabled{opacity:.6}[role=status]{display:block;margin:8px 0}.summary-form{border-top:1px solid #d9e2db;padding-top:16px;margin-top:18px}details{font-size:13px;margin:12px 0}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f7f3;padding:12px;max-height:350px;overflow:auto}.exports{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}footer{margin-top:30px;overflow-wrap:anywhere}[hidden]{display:none!important}@media(max-width:650px){.toolbar{grid-template-columns:1fr 1fr}.shell{padding:18px 14px}.point{padding:16px}h1{font-size:28px}}</style></head><body><div class="top">NXTGO / 私人留言主題摘要</div><main class="shell">
  ${result.mode === "demo" ? '<p class="banner"><strong>全部是虛構測試資料</strong> · 不是使用者對真實賽事的覆核。</p>' : result.mode === "manual" ? '<p class="banner">手動貼上來源；內容及參賽經驗未經 API 驗證。</p>' : ""}<a href="${e(apiBase)}/confirmed">返回已確認留言及主題分類</a><h1>按賽事、年份與主題整理重點。</h1><p>每個重點附原文及來源，可逐項修正。自動摘錄尚未經摘要覆核，沒有評分或情緒分析。</p><p class="meta">只用資料齊全、沒有身份衝突的研究保留項目（可能包含AI研究決定，並非人手稿件確認）；主題仍可能是自動建議或未確定。一條留言可出現在多個主題；主帖清楚另標，不當作留言或獨立跑手。不同意見各自保留，不推算共識、比例或賽事品質。</p>
  <p>來源項目 <b data-count="items">${result.counts.items}</b> · 顯示重點 <b data-count="points">${result.counts.points}</b> · 人工確認摘要 <b data-count="confirmed">${result.counts.confirmed}</b> · 待摘要覆核 <b data-count="needs_review">${result.counts.needs_review}</b> · 已排除重點 <b data-count="excluded">${result.counts.excluded}</b></p>
  <div class="exports"><a class="button" href="${e(comparisonUrl)}">比較同一賽事唔同年份</a><a class="button" data-summary-export href="${e(apiBase)}/summary.json?summary=${result.summary_fingerprint}" download>下載摘要 JSON</a><a class="button" data-summary-export href="${e(apiBase)}/summary.csv?summary=${result.summary_fingerprint}" download>下載摘要 CSV</a></div><p class="meta">下載包含整份快照、全部狀態及已排除重點，不受下方篩選影響。JSON 另保留完整證據、歷史與已移出目前分組的修正。</p>
  <div class="toolbar"><label>賽事<select id="race"><option value="all">全部賽事</option>${races.map(([key, label]) => `<option value="${e(key)}">${e(label)}</option>`).join("")}</select></label><label>年份<select id="year"><option value="all">全部年份</option>${[
    ...new Set(result.groups.map((g) => g.event_year)),
  ]
    .sort()
    .map((y) => `<option>${y}</option>`)
    .join(
      "",
    )}</select></label><label>主題<select id="topic"><option value="all">全部主題</option>${[...TOPIC_KEYS, "unclassified"].map((key) => `<option value="${key}">${e(TOPICS[key]?.label ?? "未分類")}</option>`).join("")}</select></label><label>摘要狀態<select id="state"><option value="all">有效重點（含未覆核）</option><option value="confirmed">只看人工確認摘要</option><option value="draft">自動摘錄，未覆核</option><option value="uncertain">人工未確定</option><option value="stale">依據已變</option><option value="excluded">已排除重點</option><option value="with_excluded">全部（包括已排除）</option></select></label><label class="search">搜尋摘要及原文<input id="q" type="search" autocomplete="off"></label></div><p id="visible" class="meta" aria-live="polite"></p>
  ${groups || '<p class="banner">目前沒有可用摘要。請先完成逐條研究保留，並確認賽事與年份。</p>'}
  <p class="meta">${result.counts.needs_attention} 組研究保留證據需處理缺漏或衝突，未納入摘要。<a href="${e(apiBase)}/confirmed">返回資料集處理</a></p>${result.archived_reviews.length ? `<details><summary>已移出目前分組的摘要修正 · ${result.archived_reviews.length}</summary><p>賽事／年份、主題或保留決定變更後，舊重點不會留在目前摘要；修正與歷史仍可追溯。</p><pre>${e(JSON.stringify(result.archived_reviews, null, 2))}</pre></details>` : ""}
  <footer class="meta">快照 ${e(result.dataset_id)}<br>摘要版本 <span id="fingerprint">${e(result.summary_fingerprint)}</span><br>${e(result.rule_version)} · ${e(result.generated_at)} · 只存本機私人資料庫，不公開發布。</footer></main><script>${SCRIPT}</script></body></html>`;
}
