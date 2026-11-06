import { createHash } from "node:crypto";
import { PRESETS } from "./clean.mjs";
import { REASONS } from "./clean-view.mjs";
import { evidenceLink, metadataText } from "../research/sources.mjs";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const LABELS = { pending: "未覆核", keep: "保留", exclude: "排除", review: "待覆核" };
const displayId = (value) =>
  /^manual-[a-f0-9]{64}$/.test(String(value))
    ? `本地 ${String(value).slice(7, 15)}`
    : String(value ?? "未知");
const SCRIPT = `const q=document.querySelector('#search'),filter=document.querySelector('#filter');
function update(){let n=0;for(const card of document.querySelectorAll('.record')){
card.hidden=!(card.textContent.toLowerCase().includes(q.value.trim().toLowerCase())&&(filter.value==='all'||card.dataset.manual===filter.value));if(!card.hidden)n++;}
document.querySelector('#results').textContent=n+' 項符合條件';}
q.addEventListener('input',update);filter.addEventListener('change',update);update();
for(const form of document.querySelectorAll('.review-form')){
const status=form.querySelector('.save-status');
form.addEventListener('input',()=>{form.dataset.dirty='true';status.textContent='尚未儲存';});
form.addEventListener('change',()=>{form.dataset.dirty='true';status.textContent='尚未儲存';});
form.addEventListener('submit',async event=>{event.preventDefault();const button=form.querySelector('button[type=submit]');button.disabled=true;status.textContent='儲存中…';
const data=new FormData(form);const input={record_key:form.dataset.key,decision:data.get('decision'),race_name:data.get('race_name'),event_year:data.get('event_year')===''?null:Number(data.get('event_year')),note:data.get('note'),expected_revision:Number(data.get('revision'))};
for(const field of form.elements)field.disabled=true;
try{const response=await fetch(document.querySelector('meta[name=review-api]').content+'/review',{method:'POST',headers:{'Content-Type':'application/json','X-Review-Token':document.querySelector('meta[name=review-token]').content},body:JSON.stringify(input)});
const result=await response.json();if(!response.ok)throw new Error(result.error||'儲存失敗');
form.elements.revision.value=result.decision.revision;form.elements.race_name.value=result.decision.race_name??'';form.elements.event_year.value=result.decision.event_year??'';form.elements.note.value=result.decision.note;form.dataset.dirty='false';status.textContent='已儲存 · 第 '+result.decision.revision+' 版 · '+result.decision.updated_at;
const card=form.closest('.record');card.dataset.manual=result.decision.decision;
card.querySelector('.manual-badge').textContent='人工：'+({pending:'未覆核',keep:'保留',exclude:'排除'}[result.decision.decision]);
card.querySelector('.history').textContent=JSON.stringify(result.history,null,2);
for(const key of ['total','pending','keep','exclude'])document.querySelector('[data-count='+key+']').textContent=result.summary[key];update();
}catch(error){status.textContent=error.message;form.dataset.dirty='true';}finally{for(const field of form.elements)field.disabled=false;}});}
window.addEventListener('beforeunload',event=>{if(document.querySelector('[data-dirty=true]')){event.preventDefault();event.returnValue='';}});`;

export function renderReview(
  source,
  state,
  histories,
  token,
  { apiBase = "/api", importNavigation = false } = {},
) {
  const byKey = new Map(state.decisions.map((row) => [row.record_key, row]));
  const cards = source.records
    .map((record) => {
      const saved = byKey.get(record.key),
        decision = saved?.decision ?? "pending";
      const race = saved ? (saved.race_name ?? "") : source.target.name;
      const year = saved ? (saved.event_year ?? "") : source.run.target_year;
      const link = evidenceLink(record);
      return `<article class="record" data-manual="${decision}"><header><strong>${record.kind === "comment" ? "留言" : "POST"} ${e(displayId(record.id))} · @${e(record.username ?? "作者未知")}</strong><span class="manual-badge">人工：${LABELS[decision]}</span></header>
    <p class="text">${e(record.clean_text || "（沒有文字）")}</p>${record.raw.source_platform ? `<p class="meta">${e(metadataText(record.raw))}</p>` : ""}<p class="meta">原始討論 ${e(displayId(record.root_post_id))} · 自動判斷：${e(LABELS[record.disposition])}${record.duplicate_of ? ` · 重複指向 ${e(record.duplicate_of)}` : ""}</p>
    <details><summary>查看原文、自動判斷及上下文依據</summary><ul>${record.reasons.map((reason) => `<li>${e(REASONS[reason] ?? reason)}</li>`).join("")}</ul><pre>${e(JSON.stringify({ raw: record.raw, parent_id: record.parent_id, matched_aliases: record.matched_aliases, other_races: record.other_races, mentioned_years: record.mentioned_years }, null, 2))}</pre>${link ? `<a href="${e(link)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${record.raw.link_scope === "root" ? "查看來源主帖（沒有留言獨立連結）" : "查看來源原文"} ↗</a>` : ""}</details>
    <form class="review-form" data-key="${e(record.key)}" data-dirty="false"><input type="hidden" name="revision" value="${saved?.revision ?? 0}">
    <div class="fields"><label>覆核結果<select name="decision" aria-label="${e(record.key)} 覆核結果">${["pending", "keep", "exclude"].map((value) => `<option value="${value}"${decision === value ? " selected" : ""}>${LABELS[value]}</option>`).join("")}</select></label>
    <label>賽事名稱<input name="race_name" maxlength="200" list="races" value="${e(race)}" aria-label="${e(record.key)} 賽事名稱" placeholder="留空代表未確定"></label>
    <label>賽事屆次／年份<input name="event_year" type="number" min="1900" max="2200" step="1" value="${e(year)}" aria-label="${e(record.key)} 年份" placeholder="未確定可留空"></label></div>
    <label>覆核備註<textarea name="note" maxlength="2000" rows="2" aria-label="${e(record.key)} 備註" placeholder="例如：原文講緊 2026 年半馬，並非今屆。">${e(saved?.note ?? "")}</textarea></label>
    <div class="save-row"><button type="submit">儲存這條覆核</button><span class="save-status" role="status">${saved ? `已儲存 · 第 ${saved.revision} 版 · ${e(saved.updated_at)}` : "未儲存；賽事及年份是建議值，請確認。"}</span></div></form>
    <details><summary>覆核修改歷史</summary><pre class="history">${e(JSON.stringify(histories[record.key] ?? [], null, 2))}</pre></details></article>`;
    })
    .join("");
  const hash = createHash("sha256").update(SCRIPT).digest("base64");
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="review-token" content="${e(token)}"><meta name="review-api" content="${e(apiBase)}"><meta http-equiv="Content-Security-Policy" content="default-src 'none';connect-src 'self';style-src 'unsafe-inline';script-src 'sha256-${hash}';base-uri 'none';form-action 'none'"><title>私人人工覆核 · ${e(source.target.name)}</title>
  <style>*{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:#172f2b;font:15px/1.65 system-ui,'Microsoft JhengHei',sans-serif}.top{background:#172f2b;color:white;padding:14px 5vw;font-weight:600}.shell{max-width:1150px;padding:28px 22px 60px;margin:auto}.banner{padding:16px;background:#fff1cf;border:1px solid #e6c576;border-radius:10px}h1{font-size:clamp(25px,5vw,36px);line-height:1.3}.meta,.save-status{font-size:12px;color:#5a6e64;overflow-wrap:anywhere}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.stat{background:white;border:1px solid #d9e2db;border-radius:10px;padding:18px}.stat strong{display:block;font-size:30px}.toolbar{display:grid;grid-template-columns:1fr 180px;gap:15px;padding:18px;background:#e9eee6;border-radius:10px}input,select,textarea{width:100%;display:block;padding:10px;margin-top:6px;border:1px solid #afc1b4;border-radius:6px;font:inherit;background:white;color:#172f2b;min-width:0}input:focus,select:focus,textarea:focus{outline:2px solid #166746;outline-offset:2px}label{font-size:13px}.record{background:white;border:1px solid #d9e2db;border-radius:12px;padding:22px;margin:18px 0}header{display:flex;justify-content:space-between;gap:12px}.manual-badge{background:#e9eee6;padding:3px 12px;border-radius:16px;font-size:12px;white-space:nowrap}.text{white-space:pre-wrap;overflow-wrap:anywhere}details{font-size:12px;margin:12px 0}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f7f3;padding:12px}.fields{display:grid;grid-template-columns:160px 1fr 180px;gap:14px;margin:18px 0 12px}.save-row{display:flex;align-items:center;gap:15px;margin-top:14px}button,.export{border:0;border-radius:7px;background:#166746;color:white;padding:10px 16px;font:inherit;cursor:pointer;text-decoration:none}button:disabled{opacity:.6}.export{display:inline-block;font-size:13px;margin:12px 0}a{color:#166746}.export{color:white}[hidden]{display:none!important}footer{font-size:12px;color:#5a6e64;overflow-wrap:anywhere;margin-top:30px}@media(max-width:650px){.stats{grid-template-columns:repeat(2,1fr)}.toolbar,.fields{grid-template-columns:1fr}.record{padding:16px}header,.save-row{flex-wrap:wrap}}</style></head><body><div class="top">NXTGO / 私人人工覆核</div><main class="shell">
  ${source.mode === "demo" ? '<div class="banner"><strong>全部是虛構示範資料</strong> · 覆核只儲存於示範資料庫，不代表對任何真實賽事的審核。</div>' : ""}
  ${source.mode === "manual" ? '<div class="banner"><strong>手動貼上資料</strong> · 來源及作者未經 API 驗證，請按原始來源逐條確認。</div>' : ""}
  ${importNavigation ? '<p><a href="/">← 返回手動匯入</a></p>' : ""}
  <h1>${e(source.target.name)} · 逐條人工覆核</h1><p>確認保留／排除，修正賽事及年份，保存每次決定。</p><p class="meta">原文與自動判斷保持獨立。賽事／年份留空代表未確定；每條修改只作用於該項，不會自動套用其他留言。沒有評分或公開發佈。</p>
  <div class="stats">${[
    ["total", "全部項目"],
    ["pending", "未覆核"],
    ["keep", "人工保留"],
    ["exclude", "人工排除"],
  ]
    .map(
      ([key, label]) =>
        `<div class="stat"><strong data-count="${key}">${state.summary[key]}</strong>${label}</div>`,
    )
    .join("")}</div>
  <div class="toolbar"><label>搜尋原文、作者、備註或 ID<input id="search" type="search" autocomplete="off" placeholder="例如：寄存、2026、留言 ID"></label><label>人工覆核進度<select id="filter"><option value="all">全部項目</option><option value="pending">未覆核</option><option value="keep">人工保留</option><option value="exclude">人工排除</option></select></label></div>
  <a class="export" href="${e(apiBase)}/export" download="threads-manual-review.json">匯出覆核結果 JSON</a><p id="results" class="meta" aria-live="polite"></p>
  <p><a href="${e(apiBase)}/confirmed">查看已確認留言資料集 →</a></p>
  <datalist id="races">${Object.values(PRESETS)
    .map((preset) => `<option value="${e(preset.name)}"></option>`)
    .join("")}</datalist>${cards}
  <footer>來源 run ${e(source.run.id)}<br>資料批次 ${e(state.dataset_id)}<br>只有按「儲存這條覆核」才會寫入本機。覆核紀錄不是賽事評分、公開發布批准或身分認證。</footer></main><script>${SCRIPT}</script></body></html>`;
}
