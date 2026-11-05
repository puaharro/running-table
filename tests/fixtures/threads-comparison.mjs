import { ReviewStore } from "../../scripts/threads/review-store.mjs";
import { ManualStore } from "../../scripts/threads/manual-store.mjs";
import { cleanReport } from "../../scripts/threads/clean.mjs";
import { buildSummary } from "../../scripts/threads/summary.mjs";
import { buildComparison } from "../../scripts/threads/comparison.mjs";
export function comparisonFixture({ reviewPath = ":memory:", manualPath = ":memory:" } = {}) {
  const reviews = new ReviewStore(reviewPath),
    manual = new ManualStore(manualPath, "demo"),
    ids = [];
  for (const year of [2026, 2027]) {
    const batch = manual.import({
      preset: "hk-marathon",
      target_year: year,
      kind: "comment",
      source_url: `https://www.threads.net/@fictional/post/COMPARE_${year}`,
      text: `【虛構測試 ${year}】巴士接駁${year === 2026 ? "等咗十分鐘" : "等咗二十分鐘"}。寄存標示清楚。`,
      username: "fictional",
      note: "【虛構測試】非使用者覆核。",
      link_scope: "root",
      root_url: "",
      parent_relation: "unknown",
      parent_url: "",
    }).batch_id;
    const source = cleanReport(manual.report(batch), "hk-marathon"),
      id = reviews.register(source);
    ids.push(id);
    manual.remember(batch, id);
    reviews.save(id, {
      record_key: source.records[0].key,
      decision: "keep",
      race_name: year === 2026 ? "渣馬" : "渣打香港馬拉松",
      event_year: year,
      note: "【虛構測試】非使用者覆核。",
      expected_revision: 0,
    });
  }
  const exports = () => reviews.exportMany(ids),
    compare = (options) => buildComparison(...exports(), options);
  const save = (side = 0, status = "confirmed", text = "【虛構測試】跑手提及接駁等候。") => {
    const r = buildSummary(reviews.export(ids[side])),
      p = r.points.find((p) => p.topic === "transport");
    return reviews.saveSummary(ids[side], {
      point_id: p.id,
      status,
      text,
      note: "【虛構測試】非使用者覆核。",
      expected_revision: p.manual?.revision ?? 0,
      expected_evidence_digest: p.evidence_digest,
      expected_summary_fingerprint: r.summary_fingerprint,
    });
  };
  return {
    reviews,
    manual,
    ids,
    exports,
    compare,
    save,
    close: () => {
      reviews.close();
      manual.close();
    },
  };
}
