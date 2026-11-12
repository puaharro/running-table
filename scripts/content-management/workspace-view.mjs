import { Workflow, COVERAGE } from "./workflow.mjs";
import { SOURCES } from "../research/sources.mjs";
import { materials } from "./materials.mjs";
import { ProposalService } from "./proposals.mjs";
import { proposalContent } from "./proposal-view.mjs";
import { escapeHtml as e } from "./handoff.mjs";

export function workspacePanel(content, raceId, year) {
  const w = new Workflow(content),
    race = w.race(raceId);
  const coverage = w.coverage(raceId, year),
    rows = materials(content, raceId).filter((m) => m.year === year);
  const drafts = content.list().filter((d) => d.race_id === raceId && d.year === year);
  const copies = w.list("website").filter((r) => r.data.race_id === raceId && r.data.year === year);
  const pending = coverage.filter((c) => !["reviewed", "no_results"].includes(c.data.state));
  const proposals = proposalContent(content, new ProposalService(content), {
    raceId,
    year,
    collapsed: true,
  });
  const q = `race=${encodeURIComponent(raceId)}&year=${year}`;
  return {
    body: `<h1>賽事工作頁</h1><p>${e(race.name)} · ${year} 年</p><form action="/race-workspace" method="get"><input type="hidden" name="race" value="${e(raceId)}"><label>研究屆次<input name="year" type="number" min="1900" max="2200" value="${year}" required></label><button>切換屆次</button></form><p class="banner">${pending.length ? `下一步：處理 ${pending.length} 類未完成來源，或保留限制交付待覆核稿。` : "七類搜尋進度已記錄；接著覆核稿件與材料依據。"} 搜尋覆蓋不等於證據足夠，亦不代表全平台已窮盡。</p>
      <nav class="actions" aria-label="本場工作"><a href="#workspace-coverage">來源進度</a><a href="#workspace-proposals">AI 建議</a><a href="#website-saved-preview">網站全文及差異</a><a href="/materials?race=${e(raceId)}">材料庫</a></nav>
      <section class="panel" id="workspace-coverage"><h2>逐來源研究進度</h2><ul>${coverage.map((c) => `<li><a href="/research-progress?${q}#source-${c.data.platform}">${e(SOURCES[c.data.platform].label)}</a>：${e(COVERAGE[c.data.state])}<p class="meta">查閱時間：${e(c.data.checked_at || "未知")} · 原文連結 ${c.data.links.length} 條</p><details><summary>查閱範圍與限制</summary><p>${e(c.data.notes)}</p></details></li>`).join("")}</ul><p>原文連結數不是可採用材料數，材料數不是獨立跑手數。</p></section>
      <section class="panel"><h2>本屆材料及草稿</h2><p>已保存材料 ${rows.length} 則，是否適合採用須逐項覆核。</p><ul>${drafts.map((d) => `<li><a href="/drafts?id=${e(d.id)}">${e(d.title)}</a> · 第 ${d.revision} 版 · ${e(d.group || "組別未知")}</li>`).join("") || "<li>尚未有本屆草稿。</li>"}</ul><details><summary>本屆網站稿版本</summary><ul>${copies.map((c) => `<li><a href="/race-workspace?${q}&website=${e(c.id)}">${e(c.data.title)}</a> · 第 ${c.revision} 版 · ${c.status === "confirmed" ? "文字已確認" : "草稿"}</li>`).join("") || "<li>尚未保存網站稿。</li>"}</ul></details></section>
      <section id="workspace-proposals">${proposals.body}</section>`,
    script: proposals.script,
  };
}

export function websiteChanges(w, r) {
  const previous =
    r.revision > 1 ? w.history(r.id).find((v) => v.revision === r.revision - 1) : null;
  if (!previous)
    return '<section class="panel"><h2>與上一版差異</h2><p>首版／尚未保存，沒有上一版可比較。下方顯示完整文字。</p></section>';
  const before = previous.data,
    after = r.data;
  const fields = [{ label: "公開標題", before: before.title, after: after.title }];
  after.sections.forEach((s, i) => {
    for (const [key, label] of [
      ["body", "正文"],
      ["limitations", "觀察限制"],
      ["urls", "來源"],
    ])
      fields.push({
        label: `${s.topic} · ${label}`,
        before: before.sections[i][key],
        after: s[key],
      });
  });
  const changed = fields.filter((f) => JSON.stringify(f.before) !== JSON.stringify(f.after));
  return `<section class="panel"><h2>與上一版差異：第 ${previous.revision} → ${r.revision} 版</h2>${changed.map((f) => `<h3>${e(f.label)}</h3><div class="grid"><div><strong>上一版</strong><pre>${e(Array.isArray(f.before) ? f.before.join("\n") : f.before)}</pre></div><div><strong>本版</strong><pre>${e(Array.isArray(f.after) ? f.after.join("\n") : f.after)}</pre></div></div>`).join("") || "<p>公開文字與來源未變；請同時核對依據版本。</p>"}<p>差異摘要不代替下方完整版本覆核。</p></section>`;
}
