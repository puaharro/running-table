import { createHash, randomBytes } from "node:crypto";
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export const TASK_STATUS = {
  pending: "待處理",
  in_progress: "核實中",
  verified: "人工記錄：已核實",
  unable: "無法確認",
};
const SCRIPT = `const form=document.querySelector('#task-form');if(form){const status=form.querySelector('[role=status]');form.addEventListener('input',()=>{form.dataset.dirty='true';status.textContent='尚未儲存修改';});form.addEventListener('change',()=>{form.dataset.dirty='true';status.textContent='尚未儲存修改';});form.addEventListener('submit',async event=>{event.preventDefault();const data=new FormData(form),input=Object.fromEntries(data);input.expected_revision=Number(input.expected_revision);input.expected_note_revision=Number(input.expected_note_revision);input.sources=input.sources.split(/\\r?\\n/).map(s=>s.trim()).filter(Boolean);for(const el of form.elements)el.disabled=true;status.textContent='儲存中…';try{const response=await fetch(document.querySelector('meta[name=task-api]').content,{method:'POST',headers:{'Content-Type':'application/json','X-Review-Token':document.querySelector('meta[name=task-token]').content},body:JSON.stringify(input)});const result=await response.json();if(!response.ok)throw new Error(result.error||'儲存失敗');form.dataset.dirty='false';const url=new URL(document.querySelector('meta[name=task-base]').content,location.href);url.searchParams.set('note',input.note_id);url.searchParams.set('task',result.id);url.hash='editor';if(url.href===location.href)location.reload();else location.assign(url.href);}catch(error){status.textContent=error.message;for(const el of form.elements)el.disabled=false;}});window.addEventListener('beforeunload',event=>{if(form.dataset.dirty==='true'){event.preventDefault();event.returnValue='';}});}`;
export function renderVerification(
  data,
  {
    base = "/verification",
    api = base + "-save",
    compare = "/compare",
    token = "",
    taskId = null,
  } = {},
) {
  const task = taskId ? data.tasks.find((t) => t.id === taskId) : null,
    basis = data.basis;
  const comparisonUrl = (b) =>
    `${compare}?${new URLSearchParams({ left: b.context.left, right: b.context.right, race: b.context.race, year_a: b.context.year_a, year_b: b.context.year_b, topic: b.context.topic, confirmed: b.context.confirmed ? "1" : "0" })}`;
  const editor = basis
    ? `<section id="editor" class="card"><h2>${task ? "修改追蹤事項" : "新增一項待核實事項"}</h2><p>${e(basis.race_name)} · ${basis.context.year_a}／${basis.context.year_b} · ${e(basis.topic_label)}</p><p class="meta">原備註待核實事項：${e(basis.verification || "（未填）")}</p><p><a href="${e(comparisonUrl(basis))}">返回比較備註及原文 →</a></p>${basis.note_status !== "current" || task?.needs_recheck ? '<p class="banner">比較備註或依據已變，需重新核對。若備註本身已過期，請先返回比較重新核對並儲存，才可記錄「已核實」。舊結果仍保留在歷史。</p>' : ""}
  <form id="task-form" data-dirty="false"><input type="hidden" name="id" value="${task?.id ?? randomBytes(32).toString("hex")}"><input type="hidden" name="note_id" value="${basis.note_id}"><input type="hidden" name="expected_revision" value="${task?.revision ?? 0}"><input type="hidden" name="expected_note_revision" value="${basis.note_revision}"><input type="hidden" name="expected_evidence_digest" value="${basis.evidence_digest}"><label>要核實嘅事項<textarea name="title" maxlength="2000" rows="3" required>${e(task?.title ?? basis.verification)}</textarea></label><label>處理狀態<select name="status">${Object.entries(
    TASK_STATUS,
  )
    .map(
      ([k, v]) =>
        `<option value="${k}"${(task?.status ?? "pending") === k ? " selected" : ""}>${e(v)}</option>`,
    )
    .join(
      "",
    )}</select></label><label>核實結果／處理紀錄<textarea name="result" maxlength="4000" rows="4">${e(task?.result ?? "")}</textarea></label><label>補充來源連結（每行一個，最多 5 個 HTTPS 連結）<textarea name="sources" rows="3">${e(task?.sources.join("\n") ?? "")}</textarea></label><label>核實／處理日期<input type="date" name="checked_on" value="${e(task?.checked_on ?? "")}"></label><p class="meta">「已核實」須有結果、日期及至少一個補充來源；「無法確認」須有原因及日期。來源由你填寫，系統不會抓取或驗證內容；不代表原留言、整場賽事或公開內容已獲批准。</p><button${token ? "" : " disabled"}>儲存追蹤事項</button><p role="status">${task ? `已保存第 ${task.revision} 版 · ${e(task.updated_at)}` : "尚未建立；按儲存才會新增。"}</p></form>
  <details><summary>相關原文及來源</summary>${["left", "right"].map((side) => `<h3>${basis.row[side].year} 年</h3>${basis.row[side].points.map((p) => `<blockquote>${e(p.evidence.original_text)}</blockquote><p class="meta">${p.evidence.kind === "comment" ? "留言" : "主帖"} · @${e(p.evidence.username ?? "作者未知")}${p.evidence.warnings.includes("manual_source_unverified") ? " · 手動來源未經 API 驗證" : ""}</p>${p.evidence.source_url ? `<a href="${e(p.evidence.source_url)}" target="_blank" rel="noopener noreferrer">${p.evidence.source_scope === "root" ? "查看來源主帖（沒有留言獨立連結）" : "查看來源"} ↗</a>` : "<p>未有可用來源連結。</p>"}`).join("") || "<p>目前沒有符合條件的原文；舊依據見修改歷史。</p>"}`).join("")}</details>${task ? `<details><summary>追蹤修改歷史及當時依據</summary><pre>${e(JSON.stringify(task.history, null, 2))}</pre></details>` : ""}</section>`
    : "";
  const hash = createHash("sha256").update(SCRIPT).digest("base64"),
    query = new URLSearchParams({
      ...(basis ? { note: basis.note_id } : {}),
      status: data.filter_status ?? "all",
    }).toString();
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="task-token" content="${e(token)}"><meta name="task-api" content="${e(api)}"><meta name="task-base" content="${e(base)}"><meta http-equiv="Content-Security-Policy" content="default-src 'none';connect-src 'self';style-src 'unsafe-inline';script-src 'sha256-${hash}';base-uri 'none';form-action 'self'"><title>NXTGO · 待核實事項追蹤</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:#172f2b;font:15px/1.65 system-ui,'Microsoft JhengHei',sans-serif}.top{background:#172f2b;color:white;padding:14px 5vw}.shell{max-width:1080px;margin:auto;padding:24px 22px 60px}.card{background:white;border:1px solid #d9e2db;border-radius:10px;padding:20px;margin:18px 0}h1{font-size:32px}h2{font-size:23px}label,.meta,summary{font-size:13px}.meta{color:#5a6e64;overflow-wrap:anywhere}input,textarea,select{display:block;width:100%;padding:10px;margin:6px 0 16px;border:1px solid #afc1b4;border-radius:6px;background:white;font:inherit}textarea{white-space:pre-wrap}a{color:#166746}button,.button{display:inline-block;background:#166746;color:white;border:0;border-radius:7px;padding:10px 16px;text-decoration:none;font:inherit;cursor:pointer}.banner{background:#fff1cf;border:1px solid #e6c576;padding:14px;border-radius:9px}pre,blockquote{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f7f3;padding:14px}pre{max-height:360px;overflow:auto}details{margin:15px 0}summary{cursor:pointer}.links{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.task-title{white-space:pre-wrap;overflow-wrap:anywhere}button:disabled{opacity:.6}@media(max-width:650px){.shell{padding:18px 14px}.card{padding:16px}}</style></head><body><div class="top">NXTGO / 私人待核實事項追蹤</div><main class="shell"><a href="/">返回工作區</a> · <a href="${e(base)}">查看工作區全部追蹤事項</a><h1>將待核實事項逐項跟進。</h1>${data.is_demo ? '<p class="banner"><strong>全部是虛構測試資料</strong> · 非使用者對真實賽事的核實或批准。</p>' : ""}<p>記錄處理狀態、核實結果、補充來源同日期。人工記錄不會自動變成賽事結論，沒有評分。</p><p class="meta">目前範圍：${basis ? "這份比較備註" : "本工作區"} · 總事項 ${data.counts.total} · 待處理 ${data.counts.pending} · 核實中 ${data.counts.in_progress} · 人工記錄已核實 ${data.counts.verified} · 無法確認 ${data.counts.unable} · 依據已變需重查 ${data.counts.needs_recheck}。狀態數不包括需重查項目。</p><div class="links">${basis ? `<a class="button" href="${e(base)}?note=${basis.note_id}#editor">新增另一項</a>` : '<a href="' + e(compare) + '">由比較主題的已保存備註建立追蹤 →</a>'}<a class="button" href="${e(base)}.json?${e(query)}" download>下載追蹤 JSON</a><a class="button" href="${e(base)}.csv?${e(query)}" download>下載追蹤 CSV</a></div><form method="get" action="${e(base)}">${basis ? `<input type="hidden" name="note" value="${basis.note_id}">` : ""}<label>篩選事項<select name="status">${[["all", "全部"], ...Object.entries(TASK_STATUS), ["needs_recheck", "依據已變，需重新核對"]].map(([k, v]) => `<option value="${k}"${k === (data.filter_status ?? "all") ? " selected" : ""}>${e(v)}</option>`).join("")}</select></label><button>套用篩選</button></form><p class="meta">下載包含目前備註範圍及狀態篩選；JSON 包括修改歷史與當時原文依據。補充連結不會自動抓取。</p>
  ${editor}${data.tasks.map((t) => `<article class="card"><h2 class="task-title">${e(t.title)}</h2><p>${e(TASK_STATUS[t.status])}${t.needs_recheck ? " · ⚠ 依據已變，需重新核對" : ""}</p><p class="meta">${e(t.current.race_name)} · ${t.current.context.year_a}／${t.current.context.year_b} · ${e(t.current.topic_label)} · 第 ${t.revision} 版</p><p class="task-title">${e(t.result || "尚未記錄結果。")}</p><p class="meta">處理日期 ${e(t.checked_on || "未填")}；補充來源 ${t.sources.length} 個。</p>${t.sources.map((url) => `<p><a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(url)}</a></p>`).join("")}<a href="${e(base)}?note=${t.note_id}&amp;task=${t.id}#editor">更新事項／查看歷史及原文 →</a></article>`).join("") || "<p>目前沒有符合條件的追蹤事項。</p>"}</main><script>${SCRIPT}</script></body></html>`;
}
