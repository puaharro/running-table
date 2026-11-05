import { createHash } from "node:crypto";
import { PRESETS } from "./clean.mjs";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const SCRIPT = `const form=document.querySelector('#import-form'),status=document.querySelector('#import-status');
function fields(){const comment=form.elements.kind.value==='comment';
for(const field of form.querySelectorAll('[data-comment] input,[data-comment] select'))field.disabled=!comment;
form.elements.parent_url.disabled=!comment||form.elements.parent_relation.value!=='comment';
for(const panel of form.querySelectorAll('[data-comment]'))panel.hidden=!comment;}
form.elements.kind.addEventListener('change',fields);form.elements.parent_relation.addEventListener('change',fields);fields();
const token=document.querySelector('meta[name=import-token]').content;
async function post(path,input){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json','X-Import-Token':token},body:JSON.stringify(input)});const result=await response.json();if(!response.ok)throw new Error(result.error||'操作失敗');return result;}
function link(label,path){const a=document.createElement('a');a.textContent=label;a.href=path;return a;}
async function batches(){const response=await fetch('/api/batches');const data=await response.json();const box=document.querySelector('#batches');box.replaceChildren();
for(const batch of data.batches){const card=document.createElement('section');card.className='batch';const title=document.createElement('h3');title.textContent=batch.name+' · '+batch.target_year;card.append(title);
const meta=document.createElement('p');meta.className='meta';meta.textContent=batch.items+' 項來源 · '+batch.versions+' 份保存版本';card.append(meta);
for(const item of batch.previews){const p=document.createElement('p');p.className='sample';p.textContent=(item.kind==='post'?'POST：':'留言：')+item.text;card.append(p);}
const button=document.createElement('button');button.type='button';button.dataset.batch=batch.id;button.textContent='清理、去重並準備人工覆核';card.append(button);
const output=document.createElement('p');output.className='batch-status';output.setAttribute('role','status');card.append(output);
card.append(link('匯出全部原文版本','/api/raw-export/'+batch.id));
if(batch.dataset_id){output.append(link('上次清理結果','/clean/'+batch.dataset_id),' · ',link('上次人工覆核','/review/'+batch.dataset_id),' · ',link('已確認資料集','/api/reviews/'+batch.dataset_id+'/confirmed'),' · ',link('留言摘要','/api/reviews/'+batch.dataset_id+'/summary'));}
if(batch.snapshots.length){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='過往清理及覆核快照（'+batch.snapshots.length+'）';details.append(summary);for(const saved of batch.snapshots){const p=document.createElement('p');p.className='meta';p.append(saved.prepared_at+' · ',link('清理結果','/clean/'+saved.dataset_id),' · ',link('人工覆核','/review/'+saved.dataset_id),' · ',link('已確認資料集','/api/reviews/'+saved.dataset_id+'/confirmed'),' · ',link('留言摘要','/api/reviews/'+saved.dataset_id+'/summary'));details.append(p);}card.append(details);}
box.append(card);}if(!data.batches.length)box.textContent='尚未匯入資料。';}
document.querySelector('#batches').addEventListener('click',async event=>{const button=event.target.closest('button[data-batch]');if(!button)return;button.disabled=true;const output=button.parentElement.querySelector('.batch-status');output.textContent='準備中…';
try{const result=await post('/api/prepare',{batch_id:button.dataset.batch});output.replaceChildren(link('查看清理結果',result.clean_url),' · ',link('開始逐條人工覆核',result.review_url),' · ',link('已確認資料集',result.confirmed_url),' · ',link('留言摘要',result.confirmed_url.replace(/confirmed$/,'summary')),' · ',link('匯出清理 JSON',result.export_url));}catch(error){output.textContent=error.message;}finally{button.disabled=false;}});
form.addEventListener('input',()=>{form.dataset.dirty='true';status.textContent='尚未匯入';});form.addEventListener('change',()=>{form.dataset.dirty='true';status.textContent='尚未匯入';});
form.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(form);const comment=data.get('kind')==='comment';
const input={preset:data.get('preset'),target_year:Number(data.get('target_year')),kind:data.get('kind'),text:data.get('text'),source_url:data.get('source_url'),username:data.get('username'),note:data.get('note'),
link_scope:comment?data.get('link_scope'):'item',root_url:comment?data.get('root_url'):'',parent_relation:comment?data.get('parent_relation'):'unknown',parent_url:comment?(data.get('parent_url')??''):''};
for(const field of form.elements)field.disabled=true;status.textContent='保存中…';
try{const result=await post('/api/import',input);form.dataset.dirty='false';status.textContent=result.status==='already_imported'?'相同內容已保存，沒有重複新增。':result.status==='new_version'?'同一來源的新版本已保存，舊版本仍然保留。':'已保存手動原文及來源。';form.elements.text.value='';form.elements.source_url.value='';form.elements.username.value='';form.elements.note.value='';await batches().catch(()=>{status.textContent+='（批次清單更新失敗，請重新載入。）';});}
catch(error){status.textContent=error.message;}finally{for(const field of form.elements)field.disabled=false;fields();}});
window.addEventListener('beforeunload',event=>{if(form.dataset.dirty==='true'){event.preventDefault();event.returnValue='';}});
batches().catch(()=>{document.querySelector('#batches').textContent='未能讀取已保存批次，請重新載入。';});`;

export function renderManualImport(mode, token) {
  const hash = createHash("sha256").update(SCRIPT).digest("base64");
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="import-token" content="${e(token)}"><meta http-equiv="Content-Security-Policy" content="default-src 'none';connect-src 'self';style-src 'unsafe-inline';script-src 'sha256-${hash}';base-uri 'none';form-action 'none'"><title>NXTGO · 手動匯入 Threads</title>
  <style>*{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:#172f2b;font:15px/1.65 system-ui,'Microsoft JhengHei',sans-serif}.top{background:#172f2b;color:white;padding:14px 5vw;font-weight:600}.shell{max-width:1100px;padding:28px 22px 60px;margin:auto}h1{font-size:clamp(26px,5vw,38px);line-height:1.3}.banner{background:#fff1cf;border:1px solid #e6c576;padding:16px;border-radius:10px}.meta{font-size:13px;color:#5a6e64}.panel,.batch{background:white;border:1px solid #d9e2db;border-radius:12px;padding:24px;margin:20px 0}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.wide{grid-column:1/-1}label{display:block;font-size:13px}input,select,textarea{display:block;width:100%;font:inherit;color:#172f2b;background:white;border:1px solid #afc1b4;border-radius:6px;padding:11px;margin:6px 0 12px;min-width:0}input:focus,select:focus,textarea:focus{outline:2px solid #166746;outline-offset:2px}button{border:0;border-radius:7px;background:#166746;color:white;padding:11px 17px;font:inherit;cursor:pointer}button:disabled{opacity:.6}a{color:#166746}.sample{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px;border-left:2px solid #d9e2db;padding-left:10px}.batch-status,#import-status{font-size:13px;overflow-wrap:anywhere}[hidden]{display:none!important}h2{margin-top:30px}footer{font-size:12px;color:#5a6e64;margin-top:30px}@media(max-width:650px){.grid{grid-template-columns:1fr}.panel,.batch{padding:17px}}</style></head><body><div class="top">NXTGO / 私人手動匯入</div><main class="shell">
  <div class="banner">${mode === "demo" ? "<strong>虛構資料測試工作區</strong> · 只供介面測試，請勿把結果當成真實賽事證據。" : "<strong>手動貼上來源，毋須 Threads token</strong> · 系統不會開啟或抓取連結；原文、作者及來源未經 API 驗證。"}</div>
  <h1>先貼原文，之後整理及覆核。</h1><p>保存香港賽事 Threads 貼文／留言，再接清理、去重同逐條人工覆核。暫時沒有評分。</p>
  <form id="import-form" class="panel" data-dirty="false"><div class="grid">
  <label>目標香港賽事<select name="preset">${Object.entries(PRESETS)
    .map(([key, preset]) => `<option value="${key}">${e(preset.name)}</option>`)
    .join("")}</select></label>
  <label>收集目標屆次／年份<input name="target_year" type="number" min="1900" max="2200" step="1" value="2027" required><span class="meta">是整理批次標籤，唔代表原文已確認係呢一年。</span></label>
  <label>內容類型<select name="kind"><option value="post">主帖</option><option value="comment">留言／回覆</option></select></label>
  <label>作者名稱（如知道）<input name="username" maxlength="100" autocomplete="off" placeholder="未知可留空"></label>
  <label class="wide">Threads 來源連結<input name="source_url" type="url" maxlength="2000" required placeholder="https://www.threads.com/@名稱/post/代碼"></label>
  <label class="wide">原文<textarea name="text" maxlength="20000" rows="6" required placeholder="直接貼上原文；空白與換行會原樣保存。"></textarea></label>
  <div class="wide grid" data-comment hidden><label>來源連結係<select name="link_scope"><option value="item">這條留言的獨立連結</option><option value="root">只有主帖連結</option></select></label>
  <label>主帖連結<input name="root_url" type="url" maxlength="2000" placeholder="有留言獨立連結時必填"></label>
  <label>呢條留言回覆邊個？<select name="parent_relation"><option value="unknown">未確定</option><option value="root">直接回覆主帖</option><option value="comment">回覆另一條留言</option></select></label>
  <label>父留言連結<input name="parent_url" type="url" maxlength="2000" placeholder="回覆另一留言時必填"></label>
  <p class="meta wide">只有主帖來源時，會保存為本地文字觀測，唔會虛構留言平台 ID。父回覆未確定就保持未知；相同原文／作者／主帖的重貼可能只計一份本地觀測。</p></div>
  <label class="wide">來源備註（可選）<textarea name="note" rows="2" maxlength="2000" placeholder="例如：只取得主帖連結、留言可能涉及過往屆次。"></textarea></label></div>
  <button type="submit">保存原文及來源</button><p id="import-status" role="status">未有未儲存修改。</p></form>
  <p><a href="/verification">待核實事項追蹤 →</a> · <a href="/compare">比較同一賽事唔同年份 →</a></p><h2>已保存批次</h2><p class="meta">每次準備都建立可追溯快照。新匯入或新版本不會覆蓋舊快照及舊覆核；新快照需要重新確認。</p><div id="batches" aria-live="polite">讀取中…</div>
  <footer>所有內容只存於本機私人資料庫。沒有 API 抓取、情緒分析、評分或公開發佈。</footer></main><script>${SCRIPT}</script></body></html>`;
}
