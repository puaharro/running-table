import { createHash } from "node:crypto";

const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const names = { review: "評論草稿", "race-data": "賽事資料更新" };
const sharedStyles = `.content-manager-nav{background:#172f2b;color:white;padding:14px max(20px,5vw);display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}.content-manager-nav strong{font-size:16px}.content-manager-nav nav{display:flex;gap:8px;flex-wrap:wrap}.content-manager-nav a{color:#fff;text-decoration:none;padding:10px 14px;min-height:44px;border-radius:6px;display:inline-flex;align-items:center}.content-manager-nav a[aria-current=page]{background:#e9eee6;color:#172f2b;font-weight:700}.content-manager-nav a:focus-visible{outline:2px solid #f8c66d;outline-offset:2px}`;
function nav(active) {
  return `<header class="content-manager-nav"><strong>NXTGO / 內容管理</strong><nav aria-label="內容管理">${[
    ["races", "賽事資料"],
    ["research", "賽事研究"],
    ["drafts", "評論草稿"],
  ]
    .map(
      ([key, label]) =>
        `<a href="/${key}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`,
    )
    .join("")}</nav></header>`;
}
export function decorateResearch(html) {
  return html
    .replaceAll('href="/"', 'href="/research"')
    .replaceAll("返回手動匯入", "返回賽事研究")
    .replace("每場比賽，用同一套流程研究。", "賽事研究")
    .replace(/<div class="top">[^<]*<\/div>/, nav("research"))
    .replace("</style>", `${sharedStyles}</style>`)
    .replace(/<title>[^<]*<\/title>/, "<title>內容管理 · 賽事研究</title>");
}
function shell(active, mode, token, body, script = "") {
  const hash = createHash("sha256").update(script).digest("base64");
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="import-token" content="${e(token)}"><meta http-equiv="Content-Security-Policy" content="default-src 'none';connect-src 'self';style-src 'unsafe-inline';script-src 'sha256-${hash}';base-uri 'none';form-action 'none'"><title>內容管理 · ${active === "races" ? "賽事資料" : "評論草稿"}</title><style>${sharedStyles}*{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:#172f2b;font:16px/1.7 system-ui,sans-serif}.shell{max-width:1100px;margin:auto;padding:28px 22px 60px}h1{font-size:30px;margin:0 0 8px}h2{font-size:21px}h3{font-size:18px;margin-top:0}.meta{font-size:14px;color:#53655c}.panel,.race{background:#fff;border:1px solid #d9e2db;border-radius:10px;padding:22px;margin:18px 0}.banner{background:#fff1cf;padding:14px;border-radius:8px}.grid,.races{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.race{margin:0}.wide{grid-column:1/-1}label{display:block;font-size:14px}input,select,textarea{display:block;width:100%;font:inherit;padding:10px;margin:5px 0 14px;border:1px solid #afc1b4;border-radius:6px;min-width:0;color:inherit;background:#fff}button,.button{display:inline-block;background:#166746;color:#fff;border:0;border-radius:6px;padding:10px 16px;font:inherit;text-decoration:none;cursor:pointer;min-height:44px}button:disabled{opacity:.55;cursor:default}a{color:#166746}a,pre,p{overflow-wrap:anywhere}a:focus-visible,input:focus,textarea:focus,select:focus,button:focus-visible,summary:focus-visible{outline:2px solid #166746;outline-offset:3px}summary{cursor:pointer;padding-block:8px;min-height:44px}pre{white-space:pre-wrap;font-size:13px}.actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.draft-list{padding-left:20px}.draft-list li{margin-block:12px}.status{display:inline-block;background:#e9eee6;padding:2px 10px;border-radius:12px;font-size:13px}.status.pending{background:#fff1cf}footer{margin-top:24px;font-size:14px;color:#53655c}@media(max-width:650px){.grid,.races{grid-template-columns:1fr}.panel,.race{padding:16px}.shell{padding:22px 16px}.content-manager-nav{gap:4px;padding:12px 16px}.content-manager-nav nav{gap:0}.content-manager-nav a{padding:10px 12px}}</style></head><body>${nav(active)}<main class="shell">${mode === "demo" ? '<p class="banner">虛構資料測試工作區 · 不代表真實稿件或發布確認。</p>' : ""}${body}<footer>私人內容管理 · 草稿 → 待確認 → 確認後另行發布。此後台不會直接發布或修改網站。</footer></main>${script ? `<script>${script}</script>` : ""}</body></html>`;
}
const safeLink = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === "https:" && !u.username && !u.password ? u.href : null;
  } catch {
    return null;
  }
};

export function renderRaces(content, token) {
  return shell(
    "races",
    content.mode,
    token,
    `<h1>賽事資料</h1><p class="meta">查看網站現有資料。要更新先建立建議稿，確認後再按發布流程處理；此頁沒有重新核對官方資料。</p><div class="races">${content.catalog.map((r) => `<article class="race"><h2>${e(r.name)}</h2><p>${e(r.date)} · ${e(r.groups.map((g) => g.name).join("／"))}</p><p class="meta">資料核對：${e(r.verifiedAt ?? "未記錄")}</p><details><summary>查看目前資料及來源</summary><p>${e(r.summary)}</p><p>起點：${e(r.venue)}</p><ul>${r.groups.map((g) => `<li>${e(g.name)} · ${e(g.distanceKm)} 公里 · ${g.channels?.length ?? 0} 個報名渠道</li>`).join("")}</ul>${safeLink(r.sourceUrl) ? `<a href="${e(safeLink(r.sourceUrl))}" target="_blank" rel="noopener noreferrer">官方賽事資料 ↗</a>` : ""}</details><p><a class="button" href="/drafts?kind=race-data&amp;race=${encodeURIComponent(r.id)}">建立更新建議稿</a></p></article>`).join("")}</div>`,
  );
}

const draftScript = `const form=document.querySelector('#draft-form'),status=document.querySelector('#draft-status'),pending=document.querySelector('#mark-pending');
const token=document.querySelector('meta[name=import-token]').content;
async function post(path,input){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Import-Token':token},body:JSON.stringify(input)});const body=await r.json();if(!r.ok)throw Error(body.error||'儲存失敗');return body;}
function dirty(){form.dataset.dirty='true';pending.disabled=true;status.textContent='有未儲存修改；先儲存，再標記待確認。';}form.addEventListener('input',dirty);form.addEventListener('change',dirty);
form.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(form);const input={id:data.get('id')||null,expected_revision:Number(data.get('revision')),kind:data.get('kind'),race_id:data.get('race_id'),year:Number(data.get('year')),group:data.get('group'),title:data.get('title'),body:data.get('body'),sources:data.get('sources'),scope:data.get('scope')};for(const field of form.elements)field.disabled=true;pending.disabled=true;status.textContent='儲存中…';try{const result=await post('/api/content/drafts/save',input);form.dataset.dirty='false';location.href='/drafts?id='+encodeURIComponent(result.id);}catch(error){status.textContent=error.message;for(const field of form.elements)field.disabled=false;}});
pending.addEventListener('click',async()=>{if(form.dataset.dirty==='true')return;pending.disabled=true;status.textContent='更新狀態中…';try{await post('/api/content/drafts/pending',{id:form.elements.id.value,expected_revision:Number(form.elements.revision.value)});location.reload();}catch(error){status.textContent=error.message;pending.disabled=false;}});
window.addEventListener('beforeunload',event=>{if(form.dataset.dirty==='true'){event.preventDefault();event.returnValue='';}});`;

export function renderDrafts(content, token, selected = null, initial = {}) {
  const row = selected ?? {
    id: null,
    revision: 0,
    status: "draft",
    kind: initial.kind ?? "review",
    race_id: initial.race_id ?? content.catalog[0]?.id,
    year:
      initial.year ??
      Number(
        content.catalog.find((r) => r.id === initial.race_id)?.date.slice(0, 4) ??
          new Date().getUTCFullYear(),
      ),
    group: "",
    title: "",
    body: "",
    sources: "",
    scope: "",
  };
  const list = content.list();
  const history = selected ? content.history(selected.id) : [];
  return shell(
    "drafts",
    content.mode,
    token,
    `<h1>評論草稿</h1><p class="meta">評論及賽事更新建議集中放喺呢度。標記「待確認」只整理工作進度，不代表營運者已批准發布。</p>
  <section class="panel"><h2>已保存草稿</h2>${list.length ? `<ul class="draft-list">${list.map((d) => `<li><a href="/drafts?id=${encodeURIComponent(d.id)}">${e(d.title)}</a> <span class="status ${d.status}">${d.status === "pending" ? "待確認" : "草稿"}</span><br><small>${names[d.kind]} · ${d.year} 年 · ${e(d.group || "範圍未填")} · 第 ${d.revision} 版</small></li>`).join("")}</ul>` : '<p class="meta">暫時未有草稿。</p>'}<a href="/drafts">新增草稿 →</a></section>
  <section class="panel"><h2>${selected ? "編輯草稿" : "新增草稿"}</h2>${selected ? `<p><span class="status ${row.status}">${row.status === "pending" ? "待確認" : "草稿"}</span> · 第 ${row.revision} 版</p>` : ""}
  <form id="draft-form" data-dirty="false"><input type="hidden" name="id" value="${e(row.id ?? "")}"><input type="hidden" name="revision" value="${row.revision}"><div class="grid">
  <label>稿件類型<select name="kind">${Object.entries(names)
    .map(
      ([key, label]) =>
        `<option value="${key}"${row.kind === key ? " selected" : ""}>${label}</option>`,
    )
    .join("")}</select></label>
  <label>對應賽事<select name="race_id">${content.catalog.map((r) => `<option value="${e(r.id)}"${row.race_id === r.id ? " selected" : ""}>${e(r.name)}</option>`).join("")}</select></label>
  <label>稿件年份<input name="year" type="number" min="1900" max="2200" value="${row.year}" required><span class="meta">往屆評論請填實際評論年份。</span></label>
  <label>組別／範圍<input name="group" maxlength="120" value="${e(row.group)}" placeholder="例如：2025 半馬、全賽事報名資料"></label>
  <label class="wide">標題<input name="title" maxlength="160" value="${e(row.title)}" required></label>
  <label class="wide">正文／更新建議<textarea name="body" maxlength="20000" rows="8">${e(row.body)}</textarea></label></div>
  <details${row.sources || row.scope ? " open" : ""}><summary>材料、來源及觀察範圍</summary><label>材料／來源<textarea name="sources" maxlength="4000" rows="3" placeholder="原帖連結、訪談材料或官方依據；不會自動開啟。">${e(row.sources)}</textarea></label><label>觀察範圍及限制<textarea name="scope" maxlength="2000" rows="3" placeholder="例如：2025 半馬，一位前段跑手；未觀察後段補給。">${e(row.scope)}</textarea></label></details>
  <button type="submit">儲存草稿</button></form><div class="actions"><button id="mark-pending" type="button"${!selected || row.status === "pending" ? " disabled" : ""}>標記待確認</button>${selected ? `<a href="/api/content/drafts/${encodeURIComponent(row.id)}/export" download>下載完整稿及版本紀錄</a>` : ""}</div><p id="draft-status" role="status" class="meta">${row.status === "pending" ? "此版本待確認。修改後會返回草稿，需要重新確認。" : "先儲存正文、材料及觀察範圍，再標記待確認。"}</p>
  ${history.length ? `<details><summary>版本紀錄 · ${history.length} 版</summary>${history.map((v) => `<details><summary>第 ${v.revision} 版 · ${v.status === "pending" ? "待確認" : "草稿"} · ${e(v.created_at)}</summary><pre>${e(JSON.stringify(v.content, null, 2))}</pre></details>`).join("")}</details>` : ""}</section>`,
    draftScript,
  );
}
