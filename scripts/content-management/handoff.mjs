import { createHash } from "node:crypto";
import { Workflow } from "./workflow.mjs";
import { ReviewError } from "../threads/review-store.mjs";

export const contentHash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const titleWarning = (title) =>
  /候選|待覆核|待確認|未部署/.test(title)
    ? "公開標題含內部工作狀態，請另存新版本移除後再確認。"
    : "";
export const escapeHtml = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// Produces a reviewable public-text package, never writes to public data or deploys.
export function confirmedHandoff(content, id, revision, { audit = false } = {}) {
  const w = new Workflow(content),
    r = w.get(id);
  if (r.kind !== "website" || r.status !== "confirmed" || r.revision !== revision)
    throw new ReviewError(409, "請先人工確認指定網站稿版本。");
  w.assertBasis(r);
  if (titleWarning(r.data.title)) throw new ReviewError(409, titleWarning(r.data.title));
  const publicCopy = {
    race_id: r.data.race_id,
    year: r.data.year,
    title: r.data.title,
    sections: r.data.sections,
  };
  const citations = [...new Set(publicCopy.sections.flatMap((s) => s.urls))];
  const manifest = {
    schema_version: 1,
    source_website_id: r.id,
    source_revision: r.revision,
    source_content_hash: w.hash(r),
    public_content_hash: contentHash(publicCopy),
    citations,
    scores: { course: null, organization: null, aid: null },
    research_complete: w
      .coverage(r.data.race_id, r.data.year)
      .every((c) => ["reviewed", "no_results"].includes(c.data.state)),
    publication_approved: false,
    published: false,
    deployment_required_approval: true,
    demo: content.mode === "demo",
  };
  if (audit) {
    w.export(id, revision);
    w.event(id, {
      action: "handoff_exported",
      actor_type: "local_operator",
      revision,
      content_hash: manifest.source_content_hash,
      public_content_hash: manifest.public_content_hash,
      publication_approved: false,
    });
  }
  return { manifest, public_copy: publicCopy };
}

export function handoffHtml(bundle) {
  const e = escapeHtml,
    { manifest: m, public_copy: d } = bundle;
  return `<!doctype html><html lang="zh-HK"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="default-src 'none';style-src 'unsafe-inline';base-uri 'none';form-action 'none'"><title>${e(d.title)}</title><style>body{max-width:760px;margin:40px auto;padding:0 20px;font:17px/1.9 system-ui;color:#172f2b}section{border-top:1px solid #ddd;margin-top:28px}p{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#166746}aside{background:#fff1cf;padding:12px}</style><aside>${m.demo ? "虛構示範 · " : ""}本機交接預覽 · 第 ${m.source_revision} 版 · 文字已確認，未批准發布或部署</aside><h1>${e(d.title)}</h1>${d.sections.map((s) => `<section><h2>${e(s.topic)}</h2><p>${e(s.body)}</p><p><strong>觀察限制：</strong>${e(s.limitations)}</p><p>${s.urls.map((u) => `<a href="${e(u)}" target="_blank" rel="noopener noreferrer">來源${m.citations.indexOf(u) + 1} ↗</a>`).join(" · ") || "來源：未知／未有足夠材料"}</p></section>`).join("")}<p>無評分。個人自述不代表所有參賽者。</p></html>`;
}
