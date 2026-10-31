import { exportNotebook, notebookFormat, type ReviewDraft } from "./review-notebook";
import { ratingPolicy } from "./rating-policy";
import policy from "@/data/editorial-review-policy.json";
export function prepareReviewRequest(draft: ReviewDraft, requestedAt = new Date().toISOString()) {
  exportNotebook({ format: notebookFormat, status: "draft", entries: [draft] });
  if (!draft.year) throw new Error("請先填寫參賽年份。");
  const words = JSON.stringify(draft).toLowerCase();
  const riskHints = policy.riskWords.filter((word) => words.includes(word));
  if (
    Object.values(draft.dimensions).some(
      (d) => d.score && Number(d.score) <= policy.lowScoreThreshold,
    )
  )
    riskHints.push("低分需額外覆核");
  return {
    format: "nxtgo-review-request-v1",
    status: "pending-confirmation",
    ruleVersion: ratingPolicy.version,
    requestedAt,
    review: structuredClone(draft),
    riskHints,
    note: "此為待確認素材，不是批准紀錄。完整稿件、分數、依據及範圍需由營運者確認後才可發布。",
  };
}
