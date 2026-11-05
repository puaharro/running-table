import { TOPICS, TOPIC_KEYS } from "./topics.mjs";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const STATUS = {
  confirmed: "人工已確認",
  uncertain: "人工未確定",
  suggested: "自動建議，未經主題覆核",
  unclassified: "未有自動分類",
  stale: "原文已變，主題需重新確認",
};
export function renderTopicPanel(record, result, token) {
  const topics = record.topics,
    manual = topics.manual,
    status = ["confirmed", "uncertain"].includes(topics.status) ? topics.status : "pending";
  return `<section class="topic-panel"><h3>主題分類</h3><p class="topic-status">${e(STATUS[topics.status])}</p>
  <div class="topic-badges">${topics.effective_labels.map((key) => `<span class="topic-badge">${e(TOPICS[key].label)}</span>`).join("") || "<span>未確定主題</span>"}</div>
  <details><summary>自動分類依據（只按這條原文）</summary>${topics.automatic.evidence.length ? `<ul>${topics.automatic.evidence.map((hit) => `<li>${e(TOPICS[hit.topic].label)}：「${e(hit.matched_text)}」 · 原文片段「${e(hit.excerpt)}」</li>`).join("")}</ul>` : "<p>沒有命中目前的主題詞句，請人工選擇或標記未確定。</p>"}<p class="meta">${e(topics.rule_version)} · ${topics.automatic.evidence_truncated ? "依據只顯示部分命中。" : ""}不由父帖、來源連結或好壞用詞推斷，沒有評分。</p></details>
  <form class="topic-form" data-item="${record.id}" data-dirty="false"><input type="hidden" name="expected_revision" value="${manual?.revision ?? 0}"><input type="hidden" name="expected_evidence_digest" value="${topics.evidence_digest}"><input type="hidden" name="expected_review_fingerprint" value="${result.review_fingerprint}">
  <fieldset><legend>修正主題（可多選）</legend><div class="topic-options">${TOPIC_KEYS.map((key) => `<label><input type="checkbox" name="labels" value="${key}"${topics.effective_labels.includes(key) ? " checked" : ""}>${e(TOPICS[key].label)}</label>`).join("")}</div></fieldset>
  <label>主題覆核狀態<select name="status"><option value="pending"${status === "pending" ? " selected" : ""}>未覆核／還原自動建議</option><option value="confirmed"${status === "confirmed" ? " selected" : ""}>已人工確認所選主題</option><option value="uncertain"${status === "uncertain" ? " selected" : ""}>未確定，保留待判斷</option></select></label>
  <label>主題覆核備註<textarea name="note" rows="2" maxlength="2000" placeholder="例如：只係提及水站位置，主題應屬賽道而非補給。">${e(manual?.note ?? "")}</textarea></label>
  <p class="meta">選「未覆核」會還原自動建議，舊修正留在歷史；不會改動原文、賽事、年份或保留／排除決定。</p>
  <button type="submit"${token ? "" : " disabled"}>儲存主題修正</button><span class="topic-save-status" role="status">${manual ? `已保存主題第 ${manual.revision} 版 · ${e(manual.updated_at)}` : token ? "尚未儲存主題修正。" : "請由本機覆核工具開啟以儲存。"}</span></form>
  <details><summary>主題修改歷史</summary><pre class="topic-history">${e(JSON.stringify(manual?.history ?? [], null, 2))}</pre></details></section>`;
}
export function renderTopicSummary(summary) {
  return `<section class="topic-summary"><p>主題狀態：人工確認 <span data-topic-count="confirmed">${summary.confirmed}</span> · 未確定 <span data-topic-count="uncertain">${summary.uncertain}</span> · 待主題覆核 <span data-topic-count="needs_review">${summary.needs_review}</span> · 未分類 <span data-topic-count="unclassified">${summary.unclassified}</span></p>
  <p class="meta">目前有效標籤包含自動建議及人工未確定標記，人工確認數另列；每條可有多個主題，計數會重疊。</p>
  <div class="topic-counts">${summary.counts.map((row) => `<span>${e(row.label)} <b data-topic-total="${row.key}">${row.count}</b>（人工確認 <b data-topic-confirmed="${row.key}">${row.human_confirmed}</b>）</span>`).join("")}</div></section>`;
}
export const TOPIC_STYLES = `.topic-panel{border-top:1px solid #d9e2db;margin-top:18px;padding-top:14px}.topic-panel h3{font-size:16px;margin:0 0 8px}.topic-status{font-size:13px;color:#5a6e64}.topic-badges,.topic-counts{display:flex;flex-wrap:wrap;gap:7px}.topic-badge,.topic-counts>span{background:#e9eee6;border-radius:7px;padding:4px 9px;font-size:12px}.topic-panel fieldset{border:1px solid #d9e2db;border-radius:8px;margin:14px 0;padding:10px 14px}.topic-options{display:flex;flex-wrap:wrap;gap:9px 18px}.topic-options label{display:flex;align-items:center;gap:6px}.topic-options input{display:inline-block;width:auto;margin:0}.topic-form select,.topic-form textarea{display:block;width:100%;padding:10px;margin:6px 0 12px;border:1px solid #afc1b4;border-radius:6px;background:white;font:inherit}.topic-form button{border:0;border-radius:7px;background:#166746;color:white;padding:10px 16px;font:inherit;cursor:pointer}.topic-form button:disabled{opacity:.6}.topic-save-status{display:block;font-size:12px;color:#5a6e64;margin:8px 0;overflow-wrap:anywhere}.topic-summary{margin:18px 0}.topic-history{max-height:320px;overflow:auto}`;
export const TOPIC_SCRIPT = `const topicNames=${JSON.stringify(Object.fromEntries(TOPIC_KEYS.map((key) => [key, TOPICS[key].label])))};
const topicStatusNames=${JSON.stringify(STATUS)};
for(const form of document.querySelectorAll('.topic-form')){
const status=form.querySelector('.topic-save-status');
form.addEventListener('input',()=>{form.dataset.dirty='true';status.textContent='尚未儲存主題修改';});form.addEventListener('change',()=>{form.dataset.dirty='true';status.textContent='尚未儲存主題修改';});
form.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(form),selected=data.get('status');
const input={item_id:form.dataset.item,status:selected,labels:selected==='pending'?[]:data.getAll('labels'),note:data.get('note'),expected_revision:Number(data.get('expected_revision')),expected_evidence_digest:data.get('expected_evidence_digest'),expected_review_fingerprint:data.get('expected_review_fingerprint')};
for(const field of form.elements)field.disabled=true;status.textContent='儲存中…';
try{const response=await fetch(document.querySelector('meta[name=topic-api]').content+'/topics',{method:'POST',headers:{'Content-Type':'application/json','X-Review-Token':document.querySelector('meta[name=topic-token]').content},body:JSON.stringify(input)});
const result=await response.json();if(!response.ok)throw new Error(result.error||'未能保存主題');const saved=result.topics.manual;
form.elements.expected_revision.value=saved.revision;form.elements.expected_evidence_digest.value=result.topics.evidence_digest;form.elements.note.value=saved.note;
form.elements.status.value=['confirmed','uncertain'].includes(result.topics.status)?result.topics.status:'pending';
for(const checkbox of form.querySelectorAll('[name=labels]'))checkbox.checked=result.topics.effective_labels.includes(checkbox.value);
for(const other of document.querySelectorAll('.topic-form'))other.elements.expected_review_fingerprint.value=result.review_fingerprint;
for(const link of document.querySelectorAll('[data-confirmed-export]')){const path=new URL(link.href);path.searchParams.set('review',result.review_fingerprint);link.href=path.href;}
document.querySelector('#review-fingerprint').textContent=result.review_fingerprint;
const card=form.closest('.item');card.dataset.topicLabels=result.topics.effective_labels.join(' ');card.dataset.topicStatus=result.topics.status;card.dataset.topicReview=result.topics.needs_review?'yes':'no';
card.querySelector('.topic-status').textContent=topicStatusNames[result.topics.status];const badges=card.querySelector('.topic-badges');badges.replaceChildren();
for(const key of result.topics.effective_labels){const badge=document.createElement('span');badge.className='topic-badge';badge.textContent=topicNames[key];badges.append(badge);}if(!result.topics.effective_labels.length)badges.textContent='未確定主題';
card.querySelector('.topic-history').textContent=JSON.stringify(saved.history,null,2);
for(const key of ['confirmed','uncertain','needs_review','unclassified'])document.querySelector('[data-topic-count='+key+']').textContent=result.topic_summary[key];
for(const count of result.topic_summary.counts){document.querySelector('[data-topic-total='+count.key+']').textContent=count.count;document.querySelector('[data-topic-confirmed='+count.key+']').textContent=count.human_confirmed;}
form.dataset.dirty='false';status.textContent='已儲存主題第 '+saved.revision+' 版 · '+saved.updated_at;update();
}catch(error){form.dataset.dirty='true';status.textContent=error.message;}finally{for(const field of form.elements)field.disabled=false;}});}
window.addEventListener('beforeunload',event=>{if(document.querySelector('.topic-form[data-dirty=true]')){event.preventDefault();event.returnValue='';}});`;
