import { registrationPanel } from "./registration-view.mjs";
import { Workflow, COVERAGE } from "./workflow.mjs";
import { SOURCES } from "../research/sources.mjs";
import { materials } from "./materials.mjs";
import { draftBasisStatus } from "./research-state.mjs";
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
export function researchDashboard(content, { race = null, year = null } = {}) {
  const w = new Workflow(content),
    drafts = content
      .list()
      .filter((d) => (!race || d.race_id === race) && (!year || d.year === year));
  const scope = new Map();
  for (const d of drafts) scope.set(`${d.race_id}:${d.year}`, { race_id: d.race_id, year: d.year });
  for (const m of materials(content, race).filter((m) => !year || m.year === year))
    scope.set(`${m.race_id}:${m.year}`, { race_id: m.race_id, year: m.year });
  for (const d of w
    .list()
    .filter(
      (d) =>
        ["coverage", "website"].includes(d.kind) &&
        (!race || d.data.race_id === race) &&
        (!year || d.data.year === year),
    ))
    scope.set(`${d.data.race_id}:${d.data.year}`, { race_id: d.data.race_id, year: d.data.year });
  const links = content.db
    .prepare("SELECT 1 FROM sqlite_master WHERE name='agent_research_links'")
    .get()
    ? content.db
        .prepare("SELECT payload_json FROM agent_research_links")
        .all()
        .map((r) => JSON.parse(r.payload_json))
    : [];
  const tasks = [],
    coverage = [];
  for (const s of scope.values()) {
    const rows = w.coverage(s.race_id, s.year);
    coverage.push(...rows);
    const login = rows.filter((r) => r.data.state === "awaiting_login");
    for (const r of login)
      tasks.push({
        type: "login",
        ...s,
        title: `${SOURCES[r.data.platform].label} 等待你登入`,
        reason: r.data.notes,
        href: `/research-progress?race=${encodeURIComponent(s.race_id)}&year=${s.year}#source-${r.data.platform}`,
        action: "開來源進度／登入協作",
      });
    const pending = rows.filter(
      (r) => !["reviewed", "no_results", "awaiting_login"].includes(r.data.state),
    );
    if (pending.length)
      tasks.push({
        type: "sources",
        ...s,
        title: `${pending.length} 類來源待續查`,
        reason: pending
          .map((r) => `${SOURCES[r.data.platform].label}：${COVERAGE[r.data.state]}`)
          .join("；"),
        href: `/research-progress?race=${encodeURIComponent(s.race_id)}&year=${s.year}`,
        action: "繼續來源研究",
      });
  }
  const seen = new Set();
  for (const l of links.filter(
    (l) => (!race || l.race_id === race) && (!year || l.year === year),
  )) {
    const key = `${l.dataset_id}:${l.record_key}`;
    if (seen.has(key)) continue;
    seen.add(key);
    let decision = null;
    try {
      decision = content.researchReviews
        ?.decisions(l.dataset_id)
        .find((d) => d.record_key === l.record_key);
    } catch {}
    if (!decision || decision.decision === "pending")
      tasks.push({
        type: "verify",
        race_id: l.race_id,
        year: l.year,
        title: "材料待核實",
        reason: decision?.note ?? "尚未有可讀取的逐條覆核決定。",
        href: `/review/${l.dataset_id}`,
        action: "查看原文及逐條覆核",
      });
  }
  for (const d of drafts) {
    const basis = draftBasisStatus(content, d);
    tasks.push({
      type: basis.stale ? "stale" : "draft",
      race_id: d.race_id,
      year: d.year,
      title: basis.stale
        ? basis.tracked
          ? "草稿依據需重審"
          : "舊草稿需建立依據基準"
        : `私人草稿待審 · 第 ${d.revision} 版`,
      reason: basis.stale ? basis.reason : d.title,
      href: `/drafts?id=${d.id}`,
      action: basis.stale ? "檢查依據及更新草稿" : "閱讀私人草稿",
    });
  }
  for (const r of w
    .list("website")
    .filter((r) => (!race || r.data.race_id === race) && (!year || r.data.year === year))) {
    let reason = "";
    try {
      w.assertBasis(r);
    } catch (err) {
      reason = err.message;
    }
    if (reason || r.status !== "confirmed")
      tasks.push({
        type: reason ? "stale" : "website",
        race_id: r.data.race_id,
        year: r.data.year,
        title: reason ? "網站稿依據需重審" : "網站稿待確認",
        reason: reason || `第 ${r.revision} 版尚未確認。`,
        href: `/website-copy?id=${r.id}`,
        action: "檢查網站稿及來源",
      });
  }
  return {
    tasks,
    coverage,
    counts: Object.fromEntries(
      ["login", "stale", "verify", "sources", "draft", "website"].map((t) => [
        t,
        tasks.filter((r) => r.type === t).length,
      ]),
    ),
    summary: {
      total: coverage.length,
      recorded: coverage.filter((r) => r.revision > 0).length,
      complete: coverage.filter((r) => ["reviewed", "no_results"].includes(r.data.state)).length,
    },
  };
}
export function renderResearchDashboard(content, filter) {
  const d = researchDashboard(content, filter),
    names = {
      login: "待登入",
      stale: "依據有變／需建立基準",
      verify: "待核實材料",
      sources: "來源待續查",
      draft: "私人草稿待審",
      website: "網站稿待確認",
    };
  const active = Object.entries(names).filter(([key]) => d.counts[key] > 0);
  return `<section class="panel" id="research-todo"><h2>需要處理</h2>${active.length ? "" : "<p>暫無研究待辦。</p>"}${active
    .map(
      ([k, v]) =>
        `<details id="todo-${k}"><summary>${e(v)} · ${d.counts[k]}</summary><ul>${
          d.tasks
            .filter((t) => t.type === k)
            .map(
              (t) =>
                `<li><strong>${e(content.catalog.find((r) => r.id === t.race_id)?.name ?? t.race_id)} · 研究年份 ${t.year} · ${e(t.title)}</strong><p class="meta">${e(t.reason)}</p><a href="${e(t.href)}">${e(t.action)} →</a></li>`,
            )
            .join("") || "<li>目前沒有此類待辦。</li>"
        }</ul></details>`,
    )
    .join(
      "",
    )}${registrationPanel(content, filter ?? {})}</section><section class="panel" id="source-progress"><h2>來源研究進度</h2><p>已入庫 ${d.summary.recorded}／${d.summary.total} 類來源紀錄 · 已完成 ${d.summary.complete} 類。</p><p class="meta">「已搜尋但無相關結果」只表示該次搜尋沒有相關結果；有候選原帖、待登入或閱讀限制的來源仍須續查。材料保留不等於整類來源已查齊。</p><details><summary>逐賽事及來源紀錄</summary><ul>${d.coverage.map((r) => `<li><a href="/research-progress?race=${encodeURIComponent(r.data.race_id)}&year=${r.data.year}#source-${r.data.platform}">${e(content.catalog.find((c) => c.id === r.data.race_id)?.name)} · ${r.data.year} · ${e(SOURCES[r.data.platform].label)}</a>：${e(COVERAGE[r.data.state])} · 第 ${r.revision} 版</li>`).join("") || "<li>請先選擇賽事並建立研究材料或來源進度。</li>"}</ul></details></section>`;
}
