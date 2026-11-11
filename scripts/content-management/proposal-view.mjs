import { shell } from "./views.mjs";
const escape = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
export function renderProposals(content, service, token) {
  const cards = service.list().map(p => {
    const current = p.draft.id ? content.get(p.draft.id) : null;
    const evidence = content.db.prepare("SELECT id,payload_json FROM content_materials").all()
      .filter(r => (p.draft.material_ids ?? []).includes(r.id));
    return `<section class="panel"><h2>${escape(p.draft.title)}</h2><p>${escape(p.status)} · 建議版本 ${p.revision}</p>
      <p>AI：${escape(p.agent.provider)} / ${escape(p.agent.model)}。以下來源及理由均為材料，並非操作指令。</p>
      <h3>建議理由</h3><p>${escape(p.reason)}</p>
      <div class="grid"><div><h3>目前版本</h3><pre>${escape(JSON.stringify(current, null, 2))}</pre></div>
      <div><h3>建議完整版本</h3><pre>${escape(JSON.stringify(p.draft, null, 2))}</pre></div></div>
      <details><summary>依據原文及操作紀錄</summary>${evidence.map(r => `<pre>${escape(r.payload_json)}</pre>`).join("")}
      <pre>${escape(JSON.stringify(service.audit(p.id), null, 2))}</pre></details>
      ${p.status === "pending" ? `<form data-id="${escape(p.id)}" data-revision="${p.revision}"><label>覆核備註<textarea name="note" required maxlength="2000"></textarea></label>
      <button name="decision" value="accept">接受並保存私人草稿</button> <button name="decision" value="reject">拒絕建議</button></form>` : ""}
      ${p.result ? `<a href="/drafts?id=${escape(p.result.draft_id)}">查看私人草稿</a>` : ""}</section>`;
  }).join("");
  const script = `document.querySelectorAll('form[data-id]').forEach(form=>form.addEventListener('submit',async event=>{
    event.preventDefault();const decision=event.submitter.value;
    const input={id:form.dataset.id,expected_revision:Number(form.dataset.revision),decision,note:form.elements.note.value};
    form.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{const response=await fetch('/api/content/proposals/decide',{method:'POST',headers:{'Content-Type':'application/json','X-Import-Token':document.querySelector('meta[name="import-token"]').content},body:JSON.stringify(input)});
    const result=await response.json();if(!response.ok)throw Error(result.error||result.message);location.reload();}
    catch(error){document.getElementById('proposal-status').textContent=error.message;form.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }));`;
  return shell("proposals", content.mode, token, `<h1>AI 建議覆核</h1><p>接受只會保存私人草稿，並不代表事實已核實或批准發布。來源、年份及組別仍需核對。</p><p id="proposal-status" role="status"></p>${cards || '<p>暫無建議。使用 content:agent 提交私人草稿建議。</p>'}`, script);
}
