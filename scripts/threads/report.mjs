import { createHash } from "node:crypto";
import { Store } from "./store.mjs";
import { collect } from "./collector.mjs";
import { CollectorError } from "./client.mjs";

// Read committed run snapshots, not the globally upserted latest post/comment rows.
// A later collection must not rewrite the evidence shown for an earlier run.
export function readReport(db, runId, mode = "collected") {
  db.exec("BEGIN");
  try {
    const run = db
      .prepare(
        `SELECT c.*,r.name AS race,r.target_year FROM collection_runs c
      JOIN races r ON r.id=c.race_id WHERE c.id=?`,
      )
      .get(runId);
    if (!run) throw new CollectorError("unknown_run");
    const queries = db
      .prepare("SELECT id,keyword,status FROM search_queries WHERE run_id=? ORDER BY id")
      .all(runId);
    const roots = db
      .prepare("SELECT post_id,status FROM run_posts WHERE run_id=? ORDER BY post_id")
      .all(runId);
    const errors = db
      .prepare(
        "SELECT endpoint,attempt,kind,http_status,api_code,occurred_at FROM api_errors WHERE run_id=? ORDER BY id",
      )
      .all(runId);
    const posts = new Map(),
      comments = new Map();
    const keywordByQuery = new Map(queries.map((q) => [String(q.id), q.keyword]));
    for (const page of db
      .prepare(
        "SELECT task_key,collected_at,raw_data_json FROM collection_pages WHERE run_id=? ORDER BY id",
      )
      .all(runId)) {
      const data = JSON.parse(page.raw_data_json);
      if (!Array.isArray(data)) throw new CollectorError("invalid_saved_page");
      const search = page.task_key.startsWith("query:");
      const taskId = page.task_key.slice(page.task_key.indexOf(":") + 1);
      for (const raw of data) {
        if (search) {
          const keywords = new Set(posts.get(raw.id)?.keywords ?? []);
          const keyword = keywordByQuery.get(taskId);
          if (keyword !== undefined) keywords.add(keyword);
          posts.set(raw.id, {
            id: raw.id,
            root_post_id: raw.root_post?.id ?? raw.id,
            collected_at: page.collected_at,
            keywords: [...keywords],
            raw,
          });
        } else
          comments.set(raw.id, {
            id: raw.id,
            root_post_id: taskId,
            parent_id: raw.replied_to?.id ?? null,
            collected_at: page.collected_at,
            raw,
          });
      }
    }
    const allPosts = [...posts.values()],
      allComments = [...comments.values()];
    return {
      schema_version: 1,
      mode,
      generated_at: new Date().toISOString(),
      run: {
        id: run.id,
        race: run.race,
        target_year: run.target_year,
        status: run.status,
        started_at: run.started_at,
        updated_at: run.updated_at,
        search_type: run.search_type,
      },
      summary: {
        posts: posts.size,
        comments: comments.size,
        accounts: new Set(
          [...allPosts, ...allComments].map((item) => item.raw.username).filter(Boolean),
        ).size,
        conversations_complete: roots.filter((root) => root.status === "complete").length,
        conversations_total: roots.length,
        queries_complete: queries.filter((q) => q.status === "complete").length,
        queries_total: queries.length,
        failed_requests: errors.filter((error) => error.attempt > 0).length,
      },
      queries,
      conversations: roots,
      posts: allPosts,
      comments: allComments,
      errors,
    };
  } finally {
    db.exec("ROLLBACK");
  }
}

export function listRuns(db) {
  return db
    .prepare(
      `SELECT c.id,r.name AS race,r.target_year,c.status,c.started_at,c.updated_at
    FROM collection_runs c JOIN races r ON r.id=c.race_id ORDER BY c.started_at DESC,c.id`,
    )
    .all();
}

export async function demoReport() {
  const store = new Store(":memory:");
  try {
    const runId = store.createRun({
      race: "香港示範路跑（虛構）",
      year: 2027,
      keywords: ["示範路跑", "Demo Hong Kong Race"],
    });
    const post = (id, text, username = "demo_runner") => ({
      id,
      text,
      username,
      timestamp: "2026-11-01T08:30:00+0800",
      permalink: null,
    });
    const reply = (id, parent, text) => ({
      ...post(id, text, `demo_${id}`),
      root_post: { id: "100" },
      replied_to: parent ? { id: parent } : undefined,
    });
    await collect({
      store,
      runId,
      client: {
        async getPage(endpoint, params, cursor) {
          if (endpoint === "keyword_search")
            return {
              data: [
                post("100", "【虛構示範】想問呢場香港路跑嘅起點交通同寄存安排。"),
                post("200", "【虛構示範】另一篇討論：用嚟展示未能取得回覆嘅狀態。", "demo_author"),
              ],
              next: null,
            };
          if (endpoint === "200/conversation") throw new CollectorError("demo_unavailable", 404);
          return cursor
            ? {
                data: [
                  reply("103", "102", "【虛構示範】我想問嘅係半馬組別，唔係十公里。"),
                  reply("104", null, "【虛構示範】呢條留言冇 parent 欄位，保留未知關係。"),
                ],
                next: null,
              }
            : {
                data: [
                  reply("101", "100", "【虛構示範】寄存位置幾清楚，我大概等咗十分鐘。"),
                  reply("102", "101", "【虛構示範】你係幾點到起點？"),
                ],
                next: "demo-page-2",
              };
        },
      },
    });
    return readReport(store.db, runId, "demo");
  } finally {
    store.close();
  }
}

const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
export function sourceLink(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      ["threads.net", "www.threads.net", "threads.com", "www.threads.com"].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      !url.port
      ? url.href
      : null;
  } catch {
    return null;
  }
}

// Unknown/missing/cyclic parents remain unknown rather than inventing a root.
export function replyDepth(comment, comments) {
  const byId =
    comments instanceof Map ? comments : new Map(comments.map((item) => [item.id, item]));
  const seen = new Set([comment.id]);
  let parent = comment.parent_id,
    depth = 1;
  while (parent !== comment.root_post_id) {
    const item = byId.get(parent);
    if (!item || item.root_post_id !== comment.root_post_id || seen.has(parent)) return null;
    seen.add(parent);
    parent = item.parent_id;
    depth++;
  }
  return depth;
}

const SCRIPT = `const input=document.querySelector('#search');
const filter=document.querySelector('#progress');
function update(){let visible=0;for(const card of document.querySelectorAll('.conversation')){
const match=card.textContent.toLocaleLowerCase().includes(input.value.trim().toLocaleLowerCase());
const state=filter.value==='all'||card.dataset.status!=='complete';card.hidden=!(match&&state);if(!card.hidden)visible++;}
document.querySelector('#results').textContent=visible+' 個討論符合條件';
document.querySelector('#empty').hidden=visible!==0;}
input.addEventListener('input',update);filter.addEventListener('change',update);update();`;

export function renderReport(report) {
  const e = escape;
  const commentMap = new Map(report.comments.map((comment) => [comment.id, comment]));
  const labels = {
    complete: "API 分頁完成",
    partial: "部分完成",
    failed: "未能取得",
    pending: "待收集",
    running: "收集中",
    interrupted: "已中斷",
  };
  const label = (status) => labels[status] ?? status;
  const renderItem = (item, comment = false) => {
    const link = sourceLink(item.raw.permalink);
    const depth = comment ? replyDepth(item, commentMap) : null;
    return `<article class="item ${comment ? "reply" : "post"}" style="--indent:${comment && depth !== null ? Math.min(depth - 1, 4) : 0}">
      <div class="item-meta"><strong>@${e(item.raw.username || "作者未知")}</strong><span>${e(item.raw.timestamp || "發佈時間未知")}</span></div>
      <p class="raw-text">${e(item.raw.text ?? "（API 未提供文字）")}</p>
      <div class="item-foot">ID ${e(item.id)}${comment ? ` · 回覆對象 ${e(item.parent_id ?? "未知")} · ${depth === null ? "層級未知／父節點缺漏" : `第 ${depth} 層`}` : ""}
      ${link ? ` · <a href="${e(link)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">查看 Threads 原文 ↗</a>` : " · 未有可用來源連結"}</div>
      <details class="raw"><summary>原始欄位與收集時間</summary><small>收集時間 ${e(item.collected_at)}</small><pre>${e(JSON.stringify(item.raw, null, 2))}</pre></details>
    </article>`;
  };
  const cards = report.conversations
    .map((root) => {
      const posts = report.posts.filter((post) => post.root_post_id === root.post_id);
      const comments = report.comments.filter((comment) => comment.root_post_id === root.post_id);
      const keywords = [...new Set(posts.flatMap((post) => post.keywords))];
      return `<section class="conversation" data-status="${e(root.status)}">
      <header class="conversation-head"><div><p class="eyebrow">ROOT ${e(root.post_id)}</p><h2>${e(posts.find((post) => post.id === root.post_id)?.raw.username ? `@${posts.find((post) => post.id === root.post_id).raw.username} 的討論` : "搜尋命中的討論")}</h2></div><span class="status ${root.status === "complete" ? "done" : ""}">${e(label(root.status))}</span></header>
      <div class="tags">${keywords.map((keyword) => `<span>${e(keyword)}</span>`).join("")}</div>
      ${posts.some((post) => post.id === root.post_id) ? "" : '<p class="notice">搜尋命中的是回覆；root 原文未由搜尋 API 提供。</p>'}
      ${posts.map((post) => renderItem(post)).join("")}
      <details class="replies" open><summary>${comments.length} 條已保存留言</summary>
        ${comments.length ? comments.map((comment) => renderItem(comment, true)).join("") : `<p class="notice">${root.status === "complete" ? "API 本次沒有返回留言。" : "尚未完成取得留言；請查看錯誤記錄或續跑。"}</p>`}
      </details></section>`;
    })
    .join("");
  const stats = [
    [report.summary.posts, "搜尋命中 posts"],
    [report.summary.comments, "已保存留言"],
    [report.summary.accounts, "不同 username"],
    [
      `${report.summary.conversations_complete}/${report.summary.conversations_total}`,
      "完成 conversations",
    ],
  ];
  const hash = createHash("sha256").update(SCRIPT).digest("base64");
  return `<!doctype html><html lang="zh-HK"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow"><meta name="referrer" content="no-referrer">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'sha256-${hash}'; base-uri 'none'; form-action 'none'">
    <title>${report.mode === "demo" ? "虛構示範 · " : ""}Threads 私人資料檢視 — ${e(report.run.race)}</title>
    <style>
    :root{color-scheme:light;--ink:#172f2b;--green:#166746;--line:#d9e2db;--muted:#5a6e64}*{box-sizing:border-box}body{margin:0;background:#f5f6f0;color:var(--ink);font:16px/1.65 system-ui,'Microsoft JhengHei',sans-serif}a{color:var(--green)}
    .top{background:#172f2b;color:#fff;padding:14px 5vw;display:flex;justify-content:space-between;gap:12px;font-size:13px;letter-spacing:.06em}.top strong{font-size:16px}.shell{max-width:1120px;margin:auto;padding:32px 24px 64px}.demo{background:#fff1cf;border:1px solid #e6c576;border-radius:10px;padding:15px 20px;margin-bottom:26px;color:#684506}.eyebrow{font-size:12px;letter-spacing:.1em;color:var(--muted);margin:0}h1{font-size:clamp(26px,5vw,40px);line-height:1.25;letter-spacing:-.04em;margin:8px 0 12px}h2{font-size:20px;margin:2px 0}p{margin:8px 0}.muted{color:var(--muted);font-size:14px}.intro{max-width:770px}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:26px 0}.metric{background:white;border:1px solid var(--line);border-radius:12px;padding:18px 20px}.metric strong{display:block;font-size:32px;line-height:1.2}.metric span{font-size:13px;color:var(--muted)}
    .toolbar{display:grid;grid-template-columns:1fr 200px;gap:16px;padding:20px;background:#e9eee6;border-radius:12px;margin:28px 0 12px}label{font-size:13px;font-weight:600}input,select{display:block;width:100%;padding:11px 12px;border:1px solid #afc1b4;border-radius:7px;font:inherit;background:white;color:var(--ink);margin-top:6px}input:focus,select:focus{outline:2px solid var(--green);outline-offset:2px}#results{font-size:13px;color:var(--muted);margin-bottom:18px}.conversation{background:#fff;border:1px solid var(--line);border-radius:14px;margin-bottom:20px;padding:24px}.conversation-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.status{font-size:12px;background:#fff1cf;color:#684506;border-radius:20px;padding:5px 12px;white-space:nowrap}.status.done{background:#e5f3e9;color:#1b633f}.tags{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0}.tags span{font-size:12px;background:#f0f3ee;border-radius:5px;padding:3px 9px}.item{padding:16px 0;border-top:1px solid var(--line);min-width:0}.item-meta{display:flex;flex-wrap:wrap;gap:8px 18px;font-size:14px}.item-meta span{color:var(--muted);font-size:12px}.raw-text{white-space:pre-wrap;overflow-wrap:anywhere;margin:10px 0}.item-foot{font-size:12px;color:var(--muted);overflow-wrap:anywhere}.reply{margin-left:calc(var(--indent)*18px);padding-left:16px;border-left:2px solid #dce8da}.replies{margin-top:16px}.replies>summary{font-weight:600;padding-bottom:12px}.raw{font-size:12px;margin-top:8px;color:var(--muted)}summary{cursor:pointer}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f7f3;padding:12px;border-radius:6px}.notice{color:var(--muted);font-size:14px;padding:12px;background:#f5f7f3;border-radius:7px}.audit{margin-top:36px;border-top:1px solid var(--line);padding-top:20px}.audit h2{margin:0 0 12px}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;border-bottom:1px solid var(--line);padding:9px 12px;vertical-align:top}footer{margin-top:32px;font-size:12px;color:var(--muted);overflow-wrap:anywhere}[hidden]{display:none!important}
    @media(max-width:650px){.shell{padding:22px 14px 40px}.metrics{grid-template-columns:repeat(2,1fr)}.metric{padding:14px}.toolbar{grid-template-columns:1fr;padding:16px}.conversation{padding:17px}.conversation-head{align-items:flex-start;flex-direction:column}.reply{margin-left:calc(var(--indent)*8px);padding-left:10px}.top{font-size:11px}.top strong{font-size:14px}}
    </style></head><body><div class="top"><strong>NXTGO / RESEARCH</strong><span>私人資料檢視 · 本機使用</span></div><main class="shell">
    ${report.mode === "demo" ? '<div class="demo"><strong>虛構示範資料</strong> · 沒有連接 Threads，以下 posts、留言、帳號及錯誤全部是模擬，不能用作賽事評價。</div>' : ""}
    <div class="intro"><p class="eyebrow">THREADS COLLECTOR / RAW EVIDENCE</p><h1>${e(report.run.race)}</h1><p>先讀原文，再理解跑手經驗。</p><p class="muted">目標屆次 ${e(report.run.target_year)} · ${e(label(report.run.status))} · ${e(report.run.search_type)}</p><p class="muted">搜尋命中未核實相關性、年份或組別。分頁完成只代表本次可讀 API 分頁走完；以下沒有評分。</p></div>
    <div class="metrics">${stats.map(([value, text]) => `<div class="metric"><strong>${e(value)}</strong><span>${text}</span></div>`).join("")}</div>
    <div class="toolbar"><label for="search">搜尋原文、作者、關鍵字或 ID<input id="search" type="search" placeholder="例如：寄存、起點、post ID" autocomplete="off"></label><label for="progress">收集進度<select id="progress"><option value="all">全部討論</option><option value="unfinished">僅未完成</option></select></label></div><p id="results" aria-live="polite"></p>
    ${cards}<p id="empty" class="notice" hidden>沒有符合條件的討論。</p>
    <section class="audit"><h2>搜尋來源與進度</h2><div class="table-wrap"><table><thead><tr><th>關鍵字</th><th>狀態</th></tr></thead><tbody>${report.queries.map((query) => `<tr><td>${e(query.keyword)}</td><td>${e(label(query.status))}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="audit"><h2>錯誤記錄 · ${report.errors.length}</h2>${report.errors.length ? `<div class="table-wrap"><table><thead><tr><th>請求</th><th>分類</th><th>HTTP / API code</th><th>記錄時間</th></tr></thead><tbody>${report.errors.map((error) => `<tr><td>${e(error.endpoint)}</td><td>${e(error.kind)}</td><td>${e(error.http_status ?? "—")} / ${e(error.api_code ?? "—")}</td><td>${e(error.occurred_at)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">本 run 未記錄錯誤。</p>'}</section>
    <footer>Run ${e(report.run.id)}<br>開始 ${e(report.run.started_at)} · 報告產生 ${e(report.generated_at)}<br>依照本 run 已提交的原始頁面重建；不會被後來 run 更新的原文取代。請將報告保留在私人目錄。</footer>
    </main><script>${SCRIPT}</script></body></html>`;
}
