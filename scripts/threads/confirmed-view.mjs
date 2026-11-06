import { metadataText } from "../research/sources.mjs";
import { createHash } from "node:crypto";
import { TOPICS, TOPIC_KEYS } from "./topics.mjs";
import { renderTopicPanel, renderTopicSummary, TOPIC_STYLES, TOPIC_SCRIPT } from "./topic-ui.mjs";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const REASONS = {
  missing_confirmed_race: "尚未確認賽事名稱",
  missing_confirmed_year: "尚未確認年份",
  missing_original_text: "沒有可用原文",
  same_identity_assignment_conflict: "同一來源的賽事／年份覆核不一致",
  same_identity_text_conflict: "同一來源存在不同原文版本",
  custom_race_region_unverified: "自訂賽事名稱，地區未確認",
  other_kept_duplicate_candidate: "另一個人工保留項目被自動標記為可能重複",
  author_name_variants: "同一來源有不同作者名稱觀測",
  manual_source_unverified: "手動來源未經 API 驗證",
  root_link_only: "只有主帖來源，沒有留言獨立連結",
};
const SCRIPT =
  `const q=document.querySelector('#q'),year=document.querySelector('#year'),topic=document.querySelector('#topic');function update(){let n=0;for(const group of document.querySelectorAll('.group')){
let visible=0;for(const card of group.querySelectorAll('.item')){const labels=card.dataset.topicLabels.split(' ').filter(Boolean);const matchTopic=topic.value==='all'||(topic.value==='__none'&&!labels.length)||(topic.value==='__needs_review'&&card.dataset.topicReview==='yes')||(topic.value==='__human_confirmed'&&card.dataset.topicStatus==='confirmed')||labels.includes(topic.value);
card.hidden=!(group.querySelector('h2').textContent+' '+card.dataset.search).toLowerCase().includes(q.value.trim().toLowerCase())||!matchTopic;if(!card.hidden)visible++;}
group.hidden=!visible||(year.value!=='all'&&group.dataset.year!==year.value);if(!group.hidden)n+=visible;}
document.querySelector('#count').textContent=n+' 個可用項目符合條件';}q.addEventListener('input',update);year.addEventListener('change',update);topic.addEventListener('change',update);update();` +
  TOPIC_SCRIPT;

export function renderConfirmed(
  result,
  { apiBase = "/api", reviewUrl = "/", importNavigation = false, topicToken = "" } = {},
) {
  const byId = new Map(result.records.map((record) => [record.id, record]));
  const groups = result.groups
    .map(
      (
        group,
      ) => `<section class="group" data-year="${group.event_year}"><h2>${e(group.race_name)} · ${group.event_year}</h2><p class="meta">${group.record_ids.length} 個整理後項目${group.known_hk_preset ? "" : " · 自訂名稱，地區未確認"}</p>
    ${group.record_ids
      .map((id) => {
        const record = byId.get(id);
        return `<article class="item" data-topic-labels="${e(record.topics.effective_labels.join(" "))}" data-topic-status="${e(record.topics.status)}" data-topic-review="${record.topics.needs_review ? "yes" : "no"}" data-search="${e([record.original_text, record.username, record.race_name, record.group_label, record.source_metadata?.group, record.source_metadata?.label, record.source_metadata?.posted_date].join(" "))}"><strong>${record.kind === "comment" ? "留言" : "POST"} · @${e(record.username ?? "作者未知")}</strong><p class="text">${e(record.original_text)}</p><p class="meta">覆核名稱 ${e(record.race_name)} · 年份 ${record.event_year} · ${record.observations.length} 份保留觀測</p>
    ${record.source_metadata ? `<p class="meta">${e(metadataText(record.source_metadata))}</p>` : ""}
    ${record.source_url ? `<a href="${e(record.source_url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${record.source_scope === "root" ? "查看來源主帖" : "查看來源"} ↗</a>` : ""}
    ${record.warnings.length ? `<ul>${record.warnings.map((reason) => `<li>${e(REASONS[reason] ?? reason)}</li>`).join("")}</ul>` : ""}
    <details><summary>覆核及原文追溯</summary><pre>${e(JSON.stringify({ identity: record.identity, identity_basis: record.identity_basis, observations: record.observations }, null, 2))}</pre></details>${renderTopicPanel(record, result, topicToken)}<p><a href="${e(reviewUrl)}">修改保留／排除、賽事或年份 →</a></p></article>`;
      })
      .join("")}</section>`,
    )
    .join("");
  const attention = result.needs_attention
    .map(
      (
        group,
      ) => `<article class="item"><strong>需要再處理 · ${group.observations.length} 份人工保留觀測</strong><ul>${group.reasons.map((reason) => `<li>${e(REASONS[reason] ?? reason)}</li>`).join("")}</ul>
    <p class="text">${e(group.observations[0].automatic.raw.text ?? "（沒有原文）")}</p><details><summary>查看衝突與原始覆核</summary><pre>${e(JSON.stringify(group.observations, null, 2))}</pre></details><a href="${e(reviewUrl)}">返回覆核修正 →</a></article>`,
    )
    .join("");
  const hash = createHash("sha256").update(SCRIPT).digest("base64");
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="topic-token" content="${e(topicToken)}"><meta name="topic-api" content="${e(apiBase)}"><meta http-equiv="Content-Security-Policy" content="default-src 'none';connect-src 'self';style-src 'unsafe-inline';script-src 'sha256-${hash}';base-uri 'none';form-action 'none'"><title>NXTGO · 已確認留言資料集</title>
  <style>${TOPIC_STYLES}.shell .toolbar{grid-template-columns:1fr 160px 210px}@media(max-width:650px){.shell .toolbar{grid-template-columns:1fr}}</style>
  <style>*{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:#172f2b;font:15px/1.65 system-ui,'Microsoft JhengHei',sans-serif}.top{background:#172f2b;color:white;padding:14px 5vw;font-weight:600}.shell{max-width:1100px;margin:auto;padding:28px 22px 60px}.banner{padding:16px;background:#fff1cf;border:1px solid #e6c576;border-radius:10px}h1{font-size:clamp(26px,5vw,38px);line-height:1.3}.meta{font-size:13px;color:#5a6e64;overflow-wrap:anywhere}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.stat,.item{background:white;border:1px solid #d9e2db;border-radius:10px;padding:20px}.stat strong{display:block;font-size:30px}.item{margin:14px 0}.text,pre{white-space:pre-wrap;overflow-wrap:anywhere}.toolbar{display:grid;grid-template-columns:1fr 160px;gap:15px;padding:18px;background:#e9eee6;border-radius:10px}label,details,li{font-size:13px}input,select{display:block;width:100%;padding:10px;margin-top:6px;border:1px solid #afc1b4;border-radius:6px;background:white;font:inherit}a{color:#166746}.exports{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}.button{background:#166746;color:white;border-radius:7px;padding:10px 16px;text-decoration:none}.group{margin-top:30px}pre{background:#f5f7f3;padding:12px}summary{cursor:pointer}footer{margin-top:32px;overflow-wrap:anywhere}[hidden]{display:none!important}@media(max-width:650px){.stats{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr}.shell{padding:20px 14px}.item{padding:16px}}</style></head><body><div class="top">NXTGO / 私人已確認資料集</div><main class="shell">
  ${result.mode === "demo" ? '<div class="banner"><strong>全部是虛構測試資料</strong> · 這些決定不是使用者對真實賽事的覆核。</div>' : result.mode === "manual" ? '<div class="banner"><strong>手動貼上來源</strong> · 人工保留不代表來源或參賽經驗已驗證。</div>' : ""}
  <p>${importNavigation ? '<a href="/">返回手動匯入</a> · ' : ""}<a href="${e(reviewUrl)}">返回逐條覆核</a></p><h1>按已確認賽事與年份整理。</h1><p>只用你已儲存的人工保留決定；沒有評分，亦不公開發布。</p><p class="meta">未覆核、自動保留及人工排除不會進入可用資料。缺漏賽事／年份或同一來源有衝突，會列入待處理，不代填批次的目標年份。此頁只處理目前快照，不跨歷史快照合併。</p>
  <div class="stats">${[
    [result.summary.confirmed_keep, "人工保留觀測"],
    [result.summary.ready_items, "整理後可用項目"],
    [result.summary.needs_attention, "資料待處理"],
    [result.summary.merged_observations, "同身份合併觀測"],
  ]
    .map(([n, label]) => `<div class="stat"><strong>${n}</strong>${label}</div>`)
    .join("")}</div>
  <p class="meta">尚未覆核 ${result.summary.pending} · 人工排除 ${result.summary.confirmed_exclude}。本地身份與留言數不等於獨立跑手或完整平台覆蓋。不同身份的疑似重複只提示，不會替你刪掉保留決定。</p>
  ${renderTopicSummary(result.topic_summary)}
  <div class="exports"><a class="button" href="${e(apiBase)}/summary">查看賽事／年份／主題摘要</a><a class="button" data-confirmed-export href="${e(apiBase)}/confirmed.json?review=${result.review_fingerprint}" download>下載已確認 JSON</a><a class="button" data-confirmed-export href="${e(apiBase)}/confirmed.csv?review=${result.review_fingerprint}" download>下載可用項目 CSV</a></div><p class="meta">主題自動建議不是人工確認；JSON 保留命中依據、主題修正與歷史，CSV 有主題狀態欄位。下載包含整份快照，不受下方搜尋、年份或主題篩選影響。內置賽事別名只用作分組。</p>
  <div class="toolbar"><label>搜尋已確認原文、作者或賽事<input id="q" type="search" autocomplete="off"></label><label>年份<select id="year"><option value="all">全部年份</option>${[
    ...new Set(result.records.map((row) => row.event_year)),
  ]
    .sort((a, b) => a - b)
    .map((year) => `<option value="${year}">${year}</option>`)
    .join(
      "",
    )}</select></label><label>主題<select id="topic"><option value="all">全部主題</option>${TOPIC_KEYS.map((key) => `<option value="${key}">${e(TOPICS[key].label)}</option>`).join("")}<option value="__none">沒有有效標籤</option><option value="__needs_review">待主題覆核</option><option value="__human_confirmed">只看人工已確認主題</option></select></label></div><p id="count" class="meta" aria-live="polite"></p>
  ${groups || '<p class="banner">目前未有可用項目。請先完成逐條覆核，或處理下方缺漏與衝突。</p>'}
  <h2>已保留但需要再處理 · ${result.needs_attention.length}</h2>${attention || '<p class="meta">目前沒有缺漏或衝突組。</p>'}
  <footer class="meta">快照 ${e(result.dataset_id)}<br>覆核版本摘要 <span id="review-fingerprint">${e(result.review_fingerprint)}</span><br>產生時間 ${e(result.generated_at)} · 覆核後重新載入此頁即可取得最新結果；既有下載檔案不會自動變更。</footer></main><script>${SCRIPT}</script></body></html>`;
}
