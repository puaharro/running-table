import { createHash } from "node:crypto";
import { ReviewError } from "../threads/review-store.mjs";
export function initResearchState(content) {
  content.db.exec(
    `CREATE TABLE IF NOT EXISTS draft_research_basis(draft_id TEXT NOT NULL REFERENCES content_drafts(id),revision INTEGER NOT NULL,basis_json TEXT NOT NULL,captured_at TEXT NOT NULL,reason TEXT NOT NULL,PRIMARY KEY(draft_id,revision))`,
  );
}
export function researchBasis(content, ids) {
  const exists = content.db
    .prepare("SELECT 1 FROM sqlite_master WHERE name='agent_research_links'")
    .get();
  return [...new Set(ids)].sort().map((id) => {
    const material = content.db
      .prepare("SELECT payload_json FROM content_materials WHERE id=?")
      .get(id);
    const row = exists
      ? content.db
          .prepare("SELECT payload_json FROM agent_research_links WHERE material_id=?")
          .get(id)
      : null;
    const link = row ? JSON.parse(row.payload_json) : null;
    if (link && !content.researchReviews)
      throw new ReviewError(503, "研究資料庫未連接，無法檢查依據版本。");
    const decision = link
      ? content.researchReviews
          .decisions(link.dataset_id)
          .find((d) => d.record_key === link.record_key)
      : null;
    return {
      material_id: id,
      material_digest: material
        ? createHash("sha256").update(material.payload_json).digest("hex")
        : null,
      dataset_id: link?.dataset_id ?? null,
      record_key: link?.record_key ?? null,
      revision: decision?.revision ?? 0,
      decision: decision?.decision ?? "pending",
    };
  });
}
export function recordDraftBasis(content, draft, reason = "保存草稿時建立依據版本") {
  const basis = researchBasis(content, draft.material_ids ?? []);
  content.db
    .prepare("INSERT INTO draft_research_basis VALUES(?,?,?,?,?)")
    .run(draft.id, draft.revision, JSON.stringify(basis), new Date().toISOString(), reason);
  return basis;
}
export function draftBasisStatus(content, draft) {
  const row = content.db
    .prepare("SELECT * FROM draft_research_basis WHERE draft_id=? AND revision=?")
    .get(draft.id, draft.revision);
  if (!row)
    return {
      stale: !!draft.material_ids?.length,
      tracked: false,
      reason: draft.material_ids?.length
        ? "舊稿未建立研究依據版本；請檢查後保存新版本。"
        : "沒有連結研究材料。",
    };
  try {
    const current = researchBasis(content, draft.material_ids ?? []),
      previous = JSON.parse(row.basis_json);
    const changed = current.filter(
      (r) =>
        JSON.stringify(r) !== JSON.stringify(previous.find((p) => p.material_id === r.material_id)),
    );
    const stale = changed.length > 0 || current.length !== previous.length;
    return {
      stale,
      tracked: true,
      changed,
      reason: stale ? "材料或逐條覆核決定已變，請檢查後保存草稿新版本。" : "依據版本一致。",
      captured_at: row.captured_at,
    };
  } catch (e) {
    return { stale: true, tracked: true, reason: e.message };
  }
}
