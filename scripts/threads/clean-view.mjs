import { createHash } from "node:crypto";
import { sourceLink } from "./report.mjs";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export const REASONS = {
  target_race_named: "原文提及目標賽事",
  target_race_in_parent_chain: "由可追溯父回覆取得賽事語境",
  other_race_without_target: "只識別到其他已知賽事",
  insufficient_race_evidence: "未有足夠賽事依據",
  mixed_race_context: "混合多場賽事語境",
  incomplete_parent_chain: "父子鏈不完整",
  parent_missing_or_cycle: "父節點缺漏或循環",
  missing_text: "缺少文字",
  emoji_or_symbol_only: "只有 emoji／符號",
  short_generic_reply: "短句不足以獨立判斷",
  edition_year_needs_review: "原文年份與目標屆次不同",
  parent_edition_year_needs_review: "父回覆年份與目標屆次不同",
  promotion_or_spam_suspected: "疑似推廣／垃圾訊息，待人工確認",
  comparison_or_negation: "比較或否定賽事名稱",
  same_platform_id: "同一平台 ID 的重複觀測",
  same_manual_source_identity: "同一手動來源的重複觀測（不是已驗證平台 ID）",
  platform_id_content_changed: "同一 ID 的文字版本不同",
  same_author_same_text_same_conversation: "同作者、同討論、長文字完全相同",
  same_author_text_in_other_conversation: "同作者在其他討論出現相同長文字",
  same_text_different_or_unknown_author: "不同或未知作者出現相同長文字",
};
const displayId = (value) =>
  /^manual-[a-f0-9]{64}$/.test(String(value))
    ? `本地 ${String(value).slice(7, 15)}`
    : String(value ?? "未知");
const SCRIPT = `const q=document.querySelector('#q'),f=document.querySelector('#filter');
function update(){let n=0;for(const card of document.querySelectorAll('.record')){
card.hidden=!(card.textContent.toLowerCase().includes(q.value.trim().toLowerCase())&&(f.value==='all'||card.dataset.disposition===f.value));if(!card.hidden)n++;}
document.querySelector('#count').textContent=n+' 項符合條件';}
q.addEventListener('input',update);f.addEventListener('change',update);update();`;
export function renderCleanReport(result, { reviewUrl = null } = {}) {
  const labels = { keep: "保留", review: "待覆核", exclude: "排除" };
  const cards = result.records
    .map((record) => {
      const link = sourceLink(record.permalink ?? record.raw.source_post_url);
      return `<article class="record" data-disposition="${e(record.disposition)}"><header><strong>${record.kind === "post" ? "POST" : "留言"} ${e(displayId(record.id))} · @${e(record.username ?? "作者未知")}</strong><span class="badge ${e(record.disposition)}">${labels[record.disposition]}</span></header>
      <p class="text">${e(record.clean_text || "（沒有文字）")}</p><p class="meta">討論 ${e(record.root_post_id)} · 回覆對象 ${e(record.parent_id ?? (record.kind === "post" && record.id === record.root_post_id ? "主帖" : "未知"))} · 原文年份 ${e(record.mentioned_years.join("、") || "未提及")}</p>
      <ul>${record.reasons.map((reason) => `<li>${e(REASONS[reason] ?? reason)}</li>`).join("")}</ul>
      ${record.duplicate_of ? `<p class="meta">重複觀測對應：${e(record.duplicate_of)}</p>` : ""}${record.possible_duplicate_of ? `<p class="meta">可能重複，待確認：${e(record.possible_duplicate_of)}</p>` : ""}
      ${link ? `<a href="${e(link)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${record.raw.link_scope === "root" ? "查看來源主帖（沒有留言獨立連結）" : "查看 Threads 原文"} ↗</a>` : '<p class="meta">未有可用原文連結</p>'}
      <details><summary>查看原始欄位與規則依據</summary><pre>${e(JSON.stringify({ raw: record.raw, matched_aliases: record.matched_aliases, other_races: record.other_races, relevance: record.relevance, relevance_basis: record.relevance_basis, collected_at: record.collected_at, text_fingerprint: record.text_fingerprint }, null, 2))}</pre></details></article>`;
    })
    .join("");
  const hash = createHash("sha256").update(SCRIPT).digest("base64");
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline';script-src 'sha256-${hash}';base-uri 'none';form-action 'none'"><title>私人清理結果 · ${e(result.target.name)}</title>
  <style>*{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:#172f2b;font:15px/1.65 system-ui,'Microsoft JhengHei',sans-serif}.top{background:#172f2b;color:white;padding:14px 5vw;font-weight:600}.shell{max-width:1100px;padding:28px 22px 60px;margin:auto}.banner{padding:16px;background:#fff1cf;border:1px solid #e6c576;border-radius:10px}h1{font-size:clamp(25px,5vw,36px);line-height:1.3}p{margin:10px 0}.meta{font-size:12px;color:#5a6e64;overflow-wrap:anywhere}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0}.stat{background:white;border:1px solid #d9e2db;border-radius:10px;padding:18px}.stat strong{display:block;font-size:30px}.toolbar{display:grid;grid-template-columns:1fr 180px;gap:15px;padding:18px;background:#e9eee6;border-radius:10px}input,select{width:100%;display:block;padding:10px;margin-top:6px;border:1px solid #afc1b4;border-radius:6px;font:inherit;background:white}label{font-size:13px}.record{background:white;border:1px solid #d9e2db;border-radius:12px;padding:22px;margin:15px 0}header{display:flex;justify-content:space-between;gap:12px}.badge{padding:3px 12px;border-radius:16px;font-size:12px;white-space:nowrap}.keep{background:#e5f3e9;color:#1b633f}.review{background:#fff1cf;color:#684506}.exclude{background:#eee;color:#5a5a5a}.text{white-space:pre-wrap;overflow-wrap:anywhere}ul{padding-left:20px;font-size:13px}details{font-size:12px;margin-top:12px}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f7f3;padding:12px}a{color:#166746}[hidden]{display:none!important}footer{font-size:12px;color:#5a6e64;overflow-wrap:anywhere;margin-top:30px}@media(max-width:600px){.stats{grid-template-columns:repeat(2,1fr)}.toolbar{grid-template-columns:1fr}.record{padding:16px}header{flex-wrap:wrap}}</style></head><body><div class="top">NXTGO / 私人留言清理</div><main class="shell">
  ${result.mode === "demo" ? '<div class="banner"><strong>全部是虛構示範資料</strong> · 沒有抓取 Threads，不能用作任何賽事評價。</div>' : ""}
  ${result.mode === "manual" ? '<div class="banner"><strong>手動貼上資料</strong> · 來源及作者未經 API 驗證；只反映你提供的內容。</div>' : ""}
  ${reviewUrl ? `<p><a href="/">返回手動匯入</a> · <a href="${e(reviewUrl)}">進入逐條人工覆核 →</a></p>` : ""}
  <h1>${e(result.target.name)} · 清理與相關性</h1><p>先整理證據，暫時沒有評分。</p><p class="meta">目標屆次 ${e(result.run.target_year)} · ${e(result.rule_version)} · 所有判斷由可重跑的文字規則產生，並非人工核實。</p>
  <p class="meta">原始資料全部保留。「排除」只影響本次清理結果；跨年、混合賽事、疑似推廣與可能重複需人工覆核。搜尋關鍵字本身不會當作相關性依據。</p>
  <div class="stats">${[
    [result.summary.total, "輸入觀測"],
    [result.summary.keep, "保留"],
    [result.summary.review, "待覆核"],
    [result.summary.exclude, "排除"],
  ]
    .map(([n, label]) => `<div class="stat"><strong>${n}</strong>${label}</div>`)
    .join("")}</div>
  <div class="toolbar"><label>搜尋原文、作者或判斷原因<input id="q" type="search" autocomplete="off" placeholder="例如：寄存、跨年、post ID"></label><label>處理結果<select id="filter"><option value="all">全部項目</option><option value="keep">保留</option><option value="review">待覆核</option><option value="exclude">排除</option></select></label></div><p id="count" class="meta" aria-live="polite"></p>${cards}
  <footer>來源 run ${e(result.run.id)}<br>來源摘要 ${e(result.source_digest)}<br>報告產生 ${e(result.generated_at)} · 原文及排除項目均保留在本私人報告。</footer></main><script>${SCRIPT}</script></body></html>`;
}
