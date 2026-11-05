import { createHash } from "node:crypto";
import {
  renderComparisonNote,
  COMPARISON_NOTE_STYLES,
  COMPARISON_NOTE_SCRIPT,
} from "./comparison-note-ui.mjs";
import { TOPICS, TOPIC_KEYS } from "./topics.mjs";
const e = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const statuses = {
  draft: "自動摘錄，未覆核",
  confirmed: "人工已確認摘要",
  uncertain: "摘要未確定",
  stale: "依據已變，摘要需重新覆核",
};
const topics = {
  confirmed: "人工已確認主題",
  uncertain: "主題未確定",
  suggested: "自動建議主題",
  unclassified: "未分類",
  stale: "主題需重新覆核",
};
const empty = {
  no_records: "這份快照未有此賽事／年份／主題的可用保留資料。",
  only_excluded: "這邊的摘要重點已全部人工排除。",
  no_confirmed_summary: "這邊有重點，但未有符合「人工確認摘要」篩選的內容。",
};
export function renderComparison(
  result,
  {
    catalog = [],
    left,
    right,
    comparisonPath = "/api/compare",
    summaryBase = () => "/api",
    token = "",
    notePath = "/api/compare-note",
    verificationPath = "/api/verification",
  } = {},
) {
  const scriptHash = createHash("sha256").update(COMPARISON_NOTE_SCRIPT).digest("base64");
  const s = result?.selection ?? {},
    state = result?.sources;
  const selector = (name, id) =>
    `<select name="${name}">${catalog.map((c) => `<option value="${c.id}"${c.id === id ? " selected" : ""}>收集目標 ${c.target_year} · ${e(c.created_at)} · ${c.id.slice(0, 10)}${c.mode === "demo" ? " · 虛構示範" : ""}</option>`).join("")}</select>`;
  const yearSelect = (name, chosen) =>
    `<select name="${name}"><option value="">請選年份</option>${[
      ...new Set([...(result?.years ?? []), chosen].filter((y) => y !== null && y !== undefined)),
    ]
      .sort((a, b) => a - b)
      .map(
        (y) =>
          `<option value="${y}"${y === chosen ? " selected" : ""}>${y}${result.years.includes(y) ? "" : "（未有此年資料）"}</option>`,
      )
      .join("")}</select>`;
  const lane = (data, row) =>
    `<div class="lane"><h3>${data.year} 年</h3><p class="meta">符合條件 ${data.counts.visible} 個重點：留言 ${data.counts.comments} · 主帖 ${data.counts.posts}。已排除 ${data.counts.excluded} 個。</p>${data.points.length ? data.points.map((p) => `<article class="point"><p class="badge">${e(statuses[p.status] ?? p.status)} · ${e(topics[p.topic_status] ?? p.topic_status)}</p><p class="point-text">${e(p.text)}</p><p class="meta">${p.evidence.kind === "comment" ? "留言" : "主帖"} · @${e(p.evidence.username ?? "作者未知")}${row.shared_identity_ids.includes(p.evidence.identity) ? " · ⚠ 同一來源身份出現在左右兩年，請核對屆次。" : ""}</p><details open><summary>原文及來源</summary><blockquote>${e(p.evidence.original_text)}</blockquote>${p.evidence.source_url ? `<a href="${e(p.evidence.source_url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${p.evidence.source_scope === "root" ? "查看來源主帖（沒有留言獨立連結）" : "查看來源"} ↗</a>` : '<p class="meta">未有可用來源連結，不補造連結。</p>'}<p class="meta">${p.evidence.warnings.includes("manual_source_unverified") ? "手動來源未經 API 驗證。 " : ""}${p.evidence.warnings.includes("other_kept_duplicate_candidate") ? "另有可能重複來源，未自動刪除。 " : ""}</p></details><p><a href="${e(summaryBase(data.dataset_id))}/summary#point-${p.id}">人工修正此重點／查看歷史 →</a></p><details><summary>摘要修正及完整原文追溯</summary><pre>${e(JSON.stringify({ manual: p.manual, evidence: p.evidence }, null, 2))}</pre></details></article>`).join("") : `<p class="empty">${e(empty[data.status])}沒有資料不代表沒有問題。</p>`}<p class="meta"><a href="${e(summaryBase(data.dataset_id))}/summary">開啟這份快照的完整摘要及排除重點 →</a></p></div>`;
  const params = new URLSearchParams({
    left: left ?? "",
    right: right ?? "",
    race: s.race ?? "",
    year_a: s.year_a ?? "",
    year_b: s.year_b ?? "",
    topic: s.topic ?? "all",
    confirmed: s.confirmed ? "1" : "0",
    version: result?.comparison_fingerprint ?? "",
  }).toString();
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer"><meta name="comparison-token" content="${e(token)}"><meta name="comparison-note-api" content="${e(notePath)}"><meta name="comparison-context" content="${e(JSON.stringify({ left, right, selection: result?.selection }))}"><meta http-equiv="Content-Security-Policy" content="default-src 'none';connect-src 'self';script-src 'sha256-${scriptHash}';style-src 'unsafe-inline';base-uri 'none';form-action 'self'"><title>NXTGO · 跨年份主題比較</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:#172f2b;font:15px/1.65 system-ui,'Microsoft JhengHei',sans-serif}.top{background:#172f2b;color:white;padding:14px 5vw}.shell{max-width:1240px;margin:auto;padding:26px 22px 60px}h1{font-size:34px}h2{margin:28px 0 12px;font-size:23px}h3{margin:0;font-size:23px}form{background:#e9eee6;padding:18px;border-radius:10px;margin:14px 0}.selectors,.columns{display:grid;grid-template-columns:1fr 1fr;gap:18px}.options{display:grid;grid-template-columns:2fr 1fr 1fr 1.5fr 1.5fr;gap:12px}label{font-size:13px}select{display:block;width:100%;padding:10px;margin:6px 0 12px;border:1px solid #afc1b4;border-radius:6px;background:white;font:inherit}.lane{min-width:0;background:white;border:1px solid #d9e2db;border-radius:10px;padding:18px}.point{border-top:1px solid #d9e2db;padding:14px 0}.point-text{font-weight:600;font-size:18px;white-space:pre-wrap;overflow-wrap:anywhere}.badge,.meta{font-size:12px;color:#5a6e64;overflow-wrap:anywhere}blockquote{margin:12px 0;padding:12px;background:#f5f7f3;border-left:3px solid #afc1b4;white-space:pre-wrap;overflow-wrap:anywhere}a{color:#166746}button,.button{display:inline-block;border:0;background:#166746;color:white;border-radius:7px;padding:10px 16px;text-decoration:none;font:inherit;cursor:pointer}.banner,.empty{background:#fff1cf;padding:15px;border:1px solid #e6c576;border-radius:9px}.exports{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}details{font-size:13px;margin:10px 0}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f7f3;padding:12px;max-height:320px;overflow:auto}footer{margin-top:30px}@media(max-width:850px){.options{grid-template-columns:1fr 1fr}.columns,.selectors{grid-template-columns:1fr}.shell{padding:18px 14px}h1{font-size:28px}}${COMPARISON_NOTE_STYLES}</style></head><body><div class="top">NXTGO / 私人跨年份主題比較</div><main class="shell"><a href="/">返回工作區</a> · <a href="${e(verificationPath)}">待核實事項追蹤</a><h1>同一賽事，並排睇唔同年份嘅留言。</h1>
  ${state && (state.left.mode === "demo" || state.right.mode === "demo") ? '<p class="banner"><strong>全部是虛構測試資料</strong> · 不是使用者對真實賽事的覆核。</p>' : ""}<p>每個重點保留原文、來源同人工修正。沒有評分，亦不自動判斷改善、退步或整體趨勢。</p><p class="meta">左右各選一份明確快照；收集目標年份不等於人工確認年份。只比較所選賽事的人工保留可用資料，未覆核／排除留言及身份衝突不會代為確認。不同收集量、來源、主帖與留言比例或分類覆核進度，都可能造成差異；重點數不是獨立跑手數或平台全量。</p>
  ${catalog.length ? `<form method="get" action="${e(comparisonPath)}"><div class="selectors"><label>左邊資料快照${selector("left", left)}</label><label>右邊資料快照${selector("right", right)}</label></div><button>載入所選快照</button></form>` : '<p class="banner">尚未有保存的覆核快照。請先匯入、清理及人工保留留言。</p>'}
  ${
    result
      ? `<form method="get" action="${e(comparisonPath)}"><input type="hidden" name="left" value="${left}"><input type="hidden" name="right" value="${right}"><div class="options"><label>同一賽事<select name="race">${result.races.map((r) => `<option value="${e(r.key)}"${r.key === s.race ? " selected" : ""}>${e(r.name)}</option>`).join("")}</select></label><label>左邊年份${yearSelect("year_a", s.year_a)}</label><label>右邊年份${yearSelect("year_b", s.year_b)}</label><label>主題<select name="topic">${[["all", "全部主題"], ...TOPIC_KEYS.map((k) => [k, TOPICS[k].label]), ["unclassified", "未分類"]].map(([key, label]) => `<option value="${key}"${key === s.topic ? " selected" : ""}>${e(label)}</option>`).join("")}</select></label><label>摘要狀態<select name="confirmed"><option value="0"${!s.confirmed ? " selected" : ""}>有效摘要（含未覆核）</option><option value="1"${s.confirmed ? " selected" : ""}>只看人工確認摘要</option></select></label></div><button>比較所選年份</button></form>
  <p class="meta">左邊快照 ${e(left)} · 需再處理 ${state.left.needs_attention} 組；右邊快照 ${e(right)} · 需再處理 ${state.right.needs_attention} 組。此數為整份快照的缺漏／衝突組，不限所選賽事。</p>
  ${result.selection_complete ? `<h2>${e(result.race_name)} · ${s.year_a} 對 ${s.year_b}</h2><div class="exports"><a class="button" data-comparison-export href="${e(comparisonPath)}.json?${e(params)}" download>下載本次比較 JSON</a><a class="button" data-comparison-export href="${e(comparisonPath)}.csv?${e(params)}" download>下載本次比較 CSV</a></div><p class="meta">匯出只包含本次賽事、年份、主題及摘要狀態選擇。空白欄位保留缺資料原因；完整歷史及排除項目可回各自摘要查看。主題狀態與摘要確認分開標示。</p>${result.rows.map((row) => `<section><h2>${e(row.label)}</h2><p class="meta">${row.left.points.length && row.right.points.length ? "兩邊均有符合條件的重點，請逐項對照原文。" : row.left.points.length || row.right.points.length ? "只有一邊有符合條件的重點；不能據此判斷變好或變差。" : "兩邊均未有符合條件的重點。"}</p><div class="columns">${lane(row.left, row)}${lane(row.right, row)}</div>${renderComparisonNote(row, result, token, verificationPath)}</section>`).join("")}` : '<p class="banner">請選同一賽事的兩個不同年份。只有一年資料時，可在另一邊載入其他已覆核快照；不會補造另一年的留言。</p>'}
  <footer class="meta">比較版本 <span id="comparison-version">${e(result.comparison_fingerprint)}</span><br>${e(result.rule_version)} · ${e(result.generated_at)} · 修改摘要、主題或留言後請重新載入比較；既有下載不會自動更新。</footer>`
      : ""
  }</main><script>${COMPARISON_NOTE_SCRIPT}</script></body></html>`;
}
