import { shell } from "./views.mjs";
import { Workflow, TOPICS, COVERAGE, newWorkflowId } from "./workflow.mjs";
import { SOURCES } from "../research/sources.mjs";
import { workspacePanel, websiteChanges } from "./workspace-view.mjs";
import { titleWarning } from "./handoff.mjs";
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const baseScript = `const token=document.querySelector('meta[name=import-token]').content,status=document.querySelector('#workflow-status');
const editor=document.querySelector('#race-form,#website-form');let dirty=false;if(editor){editor.addEventListener('input',()=>{dirty=true;for(const b of document.querySelectorAll('#confirm-form button,#export-confirmed,#export-handoff'))b.disabled=true;status.textContent='有未保存修改，先保存新版本再確認或匯出。';});window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});}
async function post(path,input){const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Import-Token':token},body:JSON.stringify(input)});const b=await r.json();if(!r.ok)throw Error(b.error||'操作失敗');return b;}
async function submit(button,task){button.disabled=true;try{await task();}catch(e){status.textContent=e.message;button.disabled=false;}}
function data(form){return Object.fromEntries(new FormData(form));}
`;
const confirmScript = `const confirm=document.querySelector('#confirm-form');if(confirm)confirm.addEventListener('submit',e=>{e.preventDefault();submit(confirm.querySelector('button'),async()=>{const f=data(confirm);await post('/api/content/workflow/confirm',{id:f.id,expected_revision:Number(f.revision),content_hash:f.hash,acknowledge:f.acknowledge==='on',allow_incomplete:f.allow_incomplete==='on',note:f.note});location.reload();});});
const exportButton=document.querySelector('#export-confirmed');if(exportButton)exportButton.addEventListener('click',()=>submit(exportButton,async()=>{const b=await post('/api/content/workflow/export',{id:exportButton.dataset.id,expected_revision:Number(exportButton.dataset.revision)});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(b,null,2)],{type:'application/json'}));a.download='confirmed-'+b.id+'-v'+b.revision+'.json';a.click();URL.revokeObjectURL(a.href);status.textContent='已匯出指定版本；尚未批准發布，未部署。';exportButton.disabled=false;}));`;
const hidden = (r) =>
  `<input type="hidden" name="id" value="${e(r.id)}"><input type="hidden" name="revision" value="${r.revision}">`;
function history(w, r) {
  return r.revision
    ? `<details class="panel"><summary>版本及操作紀錄</summary>${w
        .history(r.id)
        .map(
          (v) =>
            `<details><summary>第 ${v.revision} 版 · ${e(v.updated_at)}</summary><pre>${e(JSON.stringify(v.data, null, 2))}</pre></details>`,
        )
        .join(
          "",
        )}<details><summary>確認／匯出紀錄</summary><pre>${e(JSON.stringify(w.events(r.id), null, 2))}</pre></details></details>`
    : "";
}
function confirmation(w, r) {
  if (!r.revision) return "";
  if (r.kind === "website" && titleWarning(r.data.title))
    return `<section class="panel"><h2>公開標題檢查</h2><p class="banner">${e(titleWarning(r.data.title))}</p><p>既有版本與確認紀錄保留；新版本需重新確認，唔會自動套用舊批准。</p></section>`;
  return `<section class="panel"><h2>完整版本確認及匯出</h2><p>第 ${r.revision} 版 · ${r.status === "confirmed" ? "文字已確認" : "待人工確認"}。修改後須重新確認。確認文字不等於批准發布。</p>${r.status === "confirmed" ? `<button id="export-confirmed" data-id="${e(r.id)}" data-revision="${r.revision}">匯出已確認版本</button>${r.kind === "website" ? `<p><a href="/handoff-preview?id=${e(r.id)}&revision=${r.revision}" target="_blank" rel="noopener noreferrer">預覽已確認交接版本 ↗</a></p><button id="export-handoff" data-id="${e(r.id)}" data-revision="${r.revision}">下載網站交接包（正文＋來源＋版本清單）</button>` : ""}` : `<form id="confirm-form">${hidden(r)}<input type="hidden" name="hash" value="${w.hash(r)}"><label><input type="checkbox" name="acknowledge" required>我已閱讀本頁完整第 ${r.revision} 版，確認此版本文字及來源；公開文字已按去名要求覆核</label>${r.kind === "website" ? '<label><input type="checkbox" name="allow_incomplete">如有來源未完成，我明確知悉並保留全部未知及限制；不宣稱已查齊</label>' : ""}<label>確認備註<textarea name="note" maxlength="2000" required></textarea></label><button>確認指定版本文字</button></form>`}<p class="meta">匯出係私人待發布交接檔，唔會修改網站目錄、評分或觸發部署。發布仍須另行批准。</p></section>`;
}
export function renderRaceEditor(content, token, id) {
  const w = new Workflow(content),
    r = id
      ? w.get(id)
      : {
          id: newWorkflowId("race"),
          kind: "race",
          revision: 0,
          status: "draft",
          data: {
            name: "",
            year: new Date().getFullYear(),
            date: "",
            groups: "",
            official_url: "",
            notes: "",
          },
        };
  if (r.kind !== "race") throw Error("不是賽事草稿");
  const d = r.data;
  return shell(
    "races",
    content.mode,
    token,
    `<h1>${r.revision ? "編輯私人賽事" : "新增賽事"}</h1><p>先保存私人賽事即可研究，未核實日期留空，不會自動公開。</p><form id="race-form" class="panel">${hidden(r)}<label>賽事名稱<input name="name" required maxlength="160" value="${e(d.name)}"></label><div class="grid"><label>賽事年份<input name="year" type="number" min="1900" max="2200" required value="${d.year}"></label><label>比賽日期（未知留空）<input name="date" type="date" value="${e(d.date)}"></label></div><label>距離／組別（每行一組；未知留空）<textarea name="groups" maxlength="500">${e(d.groups)}</textarea></label><label>官方資料連結（未知留空）<input name="official_url" type="url" value="${e(d.official_url)}"></label><label>已知資料、來源及未知事項<textarea name="notes" maxlength="2000">${e(d.notes)}</textarea></label><button>保存私人賽事</button></form>${r.revision ? `<div class="actions"><a href="/research-progress?race=${e(r.id)}&year=${d.year}">開始逐來源研究 →</a><a href="/materials?race=${e(r.id)}">研究材料</a><a href="/website-copy?race=${e(r.id)}&year=${d.year}">建立網站稿</a></div>` : ""}${confirmation(w, r)}<p id="workflow-status" role="status"></p>${history(w, r)}`,
    baseScript +
      `const form=document.querySelector('#race-form');form.addEventListener('submit',e=>{e.preventDefault();submit(form.querySelector('button'),async()=>{const f=data(form);const r=await post('/api/content/workflow/save',{id:f.id,expected_revision:Number(f.revision),kind:'race',data:{name:f.name,year:Number(f.year),date:f.date,groups:f.groups,official_url:f.official_url,notes:f.notes}});dirty=false;location.href='/race-editor?id='+encodeURIComponent(r.id);});});` +
      confirmScript,
  );
}
function searchUrl(platform, query) {
  const q =
    platform === "youtube"
      ? query + " 賽後 Vlog"
      : (SOURCES[platform].domains[0] ? "site:" + SOURCES[platform].domains[0] + " " : "") +
        query +
        " 賽後 心得";
  return (
    (platform === "youtube"
      ? "https://www.youtube.com/results?search_query="
      : "https://www.google.com/search?q=") + encodeURIComponent(q)
  );
}
export function renderProgress(content, token, raceId, year) {
  const w = new Workflow(content),
    race = w.race(raceId),
    rows = w.coverage(raceId, year);
  const complete = rows.filter((r) => ["reviewed", "no_results"].includes(r.data.state)).length;
  return shell(
    "research",
    content.mode,
    token,
    `<h1>逐來源研究進度</h1><p>${e(race.name)} · ${year} 年</p><p class="banner">已完成 ${complete} / ${rows.length} 類。${complete === rows.length ? "搜尋覆蓋已記錄；不代表材料已核實。" : "尚有未完成來源，不可聲稱已查齊。"}</p><p>搜尋摘要只作線索。需要登入請通知營運者在原站完成登入，唔索取密碼、Cookie 或 token；等待時可查其他來源。</p><nav class="panel" aria-label="七類來源狀態"><ul>${rows.map((row) => `<li><a href="#source-${row.data.platform}">${e(SOURCES[row.data.platform].label)}</a>：${e(COVERAGE[row.data.state])}</li>`).join("")}</ul></nav><div class="actions"><a href="/materials?race=${e(raceId)}">保存研究材料 →</a><a href="/website-copy?race=${e(raceId)}&year=${year}">網站稿及預覽 →</a></div>${rows
      .map((r) => {
        const d = r.data,
          query = d.query || `${race.name} ${year}`;
        const homepage = SOURCES[d.platform].domains[0];
        return `<section class="panel" id="source-${d.platform}"><h2>${e(SOURCES[d.platform].label)} <span class="status">${e(COVERAGE[d.state])}</span></h2><div class="actions"><a href="${e(searchUrl(d.platform, query))}" target="_blank" rel="noopener noreferrer">開來源搜尋 ↗</a>${homepage ? `<a href="https://${e(homepage)}/" target="_blank" rel="noopener noreferrer">開來源網站／登入 ↗</a>` : ""}</div>${d.state === "awaiting_login" ? '<p class="banner">需要你協助登入。請在原站完成登入後，按「我已登入，繼續查此來源」；呢個按鈕只改為搜尋中，唔代表已讀原文。</p>' : ""}<form class="coverage-form">${hidden(r)}<input type="hidden" name="platform" value="${d.platform}"><label>實際搜尋字詞<input name="query" maxlength="500" value="${e(query)}" required><span class="meta">修改字詞後先保存，再開上方搜尋連結。</span></label><label>進度<select name="state">${Object.entries(
          COVERAGE,
        )
          .map(([k, v]) => `<option value="${k}"${d.state === k ? " selected" : ""}>${v}</option>`)
          .join(
            "",
          )}</select></label><label>實際檢查時間（含時區，未知留空）<input name="checked_at" placeholder="例如：2026-11-12T14:30:00+08:00" value="${e(d.checked_at)}"></label><label>已讀原文連結（每行一條）<textarea name="links" rows="3">${e(d.links.join("\n"))}</textarea></label><label>結果／存取限制／登入需要<textarea name="notes" maxlength="4000" rows="3">${e(d.notes)}</textarea></label><div class="actions"><button>保存來源進度</button><button type="button" data-login="awaiting_login">請協助登入</button>${d.state === "awaiting_login" ? '<button type="button" data-login="searching">我已登入，繼續查此來源</button>' : ""}</div></form>${r.revision ? `<details><summary>此來源過往紀錄</summary><pre>${e(JSON.stringify(w.history(r.id), null, 2))}</pre></details>` : ""}</section>`;
      })
      .join("")}<p id="workflow-status" role="status"></p>`,
    baseScript +
      `const raceId=${JSON.stringify(raceId).replaceAll("<", "\\u003c")},year=${year};async function saveCoverage(form,state){const f=data(form);await post('/api/content/workflow/save',{id:f.id,expected_revision:Number(f.revision),kind:'coverage',data:{race_id:raceId,year,platform:f.platform,state:state||f.state,query:f.query,checked_at:f.checked_at,links:f.links.split(/\\n/).map(v=>v.trim()).filter(Boolean),notes:f.notes}});location.reload();}for(const form of document.querySelectorAll('.coverage-form')){form.addEventListener('submit',e=>{e.preventDefault();submit(form.querySelector('button'),()=>saveCoverage(form));});for(const b of form.querySelectorAll('[data-login]'))b.addEventListener('click',()=>{if(b.dataset.login==='awaiting_login'&&!form.elements.notes.value.trim())form.elements.notes.value='需要營運者協助登入來源網站，登入後續查。';submit(b,()=>saveCoverage(form,b.dataset.login));});}`,
  );
}
function neutralPreview(d) {
  const urls = [...new Set(d.sections.flatMap((s) => s.urls))];
  return `<article class="panel"><h2>${e(d.title)}</h2><p class="meta">跑手分享 · 無評分。個人自述不代表所有參賽者，未經逐項獨立核實。</p>${d.sections.map((s) => `<section><h3>${e(s.topic)}</h3><p style="white-space:pre-wrap">${e(s.body)}</p><p style="white-space:pre-wrap"><strong>觀察限制：</strong>${e(s.limitations)}</p><p>${s.urls.map((u) => `<a href="${e(u)}" target="_blank" rel="noopener noreferrer">來源${urls.indexOf(u) + 1} ↗</a>`).join(" · ") || "來源：未知／未有足夠材料"}</p></section>`).join("")}</article>`;
}
export function renderWebsite(content, token, { id, raceId, year, draftId, workspace = false }) {
  const w = new Workflow(content);
  let r;
  if (id) {
    r = w.get(id);
    if (r.kind !== "website") throw Error("不是網站稿");
  } else {
    const race = w.race(raceId);
    r = {
      id: newWorkflowId("website"),
      kind: "website",
      revision: 0,
      status: "draft",
      data: {
        race_id: raceId,
        year,
        title: `${race.name}｜跑手分享五項重點`,
        draft_id: draftId || null,
        sections: TOPICS.map((topic) => ({
          topic,
          body: "未知。現有材料不足。",
          limitations: "未有足夠親身資料，不能評價整體表現。",
          urls: [],
        })),
      },
    };
  }
  const d = r.data;
  const draft = d.draft_id ? content.get(d.draft_id) : null;
  const coverage = w.coverage(d.race_id, d.year);
  let basisMessage = "";
  if (r.revision) {
    try {
      w.assertBasis(r);
    } catch (error) {
      basisMessage = `<p class="banner">${e(error.message)}</p>`;
    }
  }
  const panel = workspace ? workspacePanel(content, d.race_id, d.year) : { body: "", script: "" };
  return shell(
    "website",
    content.mode,
    token,
    `${panel.body}${basisMessage}<h${workspace ? "2" : "1"}>網站稿版本及預覽</h${workspace ? "2" : "1"}><p>工作狀態：${r.status === "confirmed" ? "文字已確認" : "草稿／待覆核"}；公開標題請勿填入工作狀態。</p><p>五個主題固定保留。正文請用中性稱呼，不顯示人名、帳號名及機構／傳媒名；來源自動用編號顯示，原連結仍可識別作者。呢個介面唔會自動匿名化你輸入嘅正文。</p><p>${e(w.race(d.race_id).name)} · ${d.year} 年 · ${r.revision ? `第 ${r.revision} 版` : "未保存"}</p><p class="banner">研究覆蓋：${coverage.filter((c) => ["reviewed", "no_results"].includes(c.data.state)).length}/7 類完成。<a href="/research-progress?race=${e(d.race_id)}&year=${d.year}">查看未完成來源／登入需要</a></p>${draft ? `<details class="panel"><summary>參考草稿：${e(draft.title)} · 第 ${draft.revision} 版</summary><pre>${e(draft.body)}</pre><p>${e(draft.sources)}</p><p>${e(draft.scope)}</p></details>` : ""}${websiteChanges(w, r)}<div id="website-saved-preview">${neutralPreview(d)}</div><form id="website-form" class="panel">${hidden(r)}<label>公開標題（不填候選／待覆核等內部狀態）<input name="title" maxlength="160" required value="${e(d.title)}"></label>${d.sections.map((s, i) => `<fieldset><legend>${e(s.topic)}</legend><label>正文（不足請標明未知）<textarea name="body${i}" maxlength="4000" rows="4" required>${e(s.body)}</textarea></label><label>觀察限制<textarea name="limitations${i}" maxlength="2000" rows="2" required>${e(s.limitations)}</textarea></label><label>原文來源連結（每行一條）<textarea name="urls${i}" rows="2">${e(s.urls.join("\n"))}</textarea></label></fieldset>`).join("")}<button>保存新版本並預覽</button><p class="meta">下方確認及匯出針對已保存版本。有未保存修改時會鎖定確認及匯出。</p></form>${confirmation(w, r)}<p id="workflow-status" role="status"></p>${history(w, r)}`,
    baseScript +
      `const form=document.querySelector('#website-form');const basis=${JSON.stringify({ race_id: d.race_id, year: d.year, draft_id: d.draft_id }).replaceAll("<", "\\u003c")},topics=${JSON.stringify(TOPICS)};form.addEventListener('submit',e=>{e.preventDefault();submit(form.querySelector('button'),async()=>{const f=data(form);const r=await post('/api/content/workflow/save',{id:f.id,expected_revision:Number(f.revision),kind:'website',data:{...basis,title:f.title,sections:topics.map((topic,i)=>({topic,body:f['body'+i],limitations:f['limitations'+i],urls:f['urls'+i].split(/\\n/).map(v=>v.trim()).filter(Boolean)}))}});dirty=false;location.href='/website-copy?id='+encodeURIComponent(r.id);});});` +
      confirmScript +
      panel.script +
      handoffScript,
  ).replace("form-action 'none'", "form-action 'self'");
}
export function renderWebsiteIndex(content, token) {
  const w = new Workflow(content);
  return shell(
    "website",
    content.mode,
    token,
    `<h1>網站稿</h1><p>完整版本確認、預覽及匯出。無評分，發布須另行批准。</p><p><a href="/races">選擇賽事建立網站稿 →</a></p>${
      w
        .list("website")
        .map(
          (r) =>
            `<article class="panel"><h2><a href="/website-copy?id=${e(r.id)}">${e(r.data.title)}</a></h2><p>第 ${r.revision} 版 · ${r.status === "confirmed" ? "文字已確認，尚未發布" : "待人工確認"} · ${e(r.updated_at)}</p></article>`,
        )
        .join("") || "<p>尚未有網站稿。</p>"
    }`,
  );
}

const handoffScript = `const handoff=document.querySelector('#export-handoff');if(handoff)handoff.addEventListener('click',()=>submit(handoff,async()=>{const b=await post('/api/content/workflow/handoff',{id:handoff.dataset.id,expected_revision:Number(handoff.dataset.revision)});const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(b,null,2)],{type:'application/json'}));a.download='website-handoff-'+b.manifest.source_website_id+'-v'+b.manifest.source_revision+'.json';a.click();URL.revokeObjectURL(a.href);status.textContent='已下載網站交接包，未寫入網站、未批准發布或部署。';handoff.disabled=false;}));`;
