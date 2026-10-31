import { createHash } from "node:crypto";
import policy from "../src/data/editorial-review-policy.json" with { type: "json" };

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export function publicationDigest(record) {
  const { approval, status, ...content } = record;
  return createHash("sha256").update(canonical(content)).digest("hex");
}
// A review prompt, not a legal finding. Human review remains necessary for unflagged text too.
export function publicationRiskFlags(record) {
  const words = JSON.stringify({
    quickTake: record.quickTake,
    assessments: record.assessments,
    courseNotes: record.courseNotes,
    evidence: record.evidence,
    organizerResponses: record.organizerResponses,
  });
  const flags = policy.riskWords.filter((word) => words.toLowerCase().includes(word));
  if (
    Object.values(record.assessments ?? {}).some(
      (a) => a.score !== null && a.score <= policy.lowScoreThreshold,
    )
  )
    flags.push("低分需額外覆核");
  return flags;
}
export function assertPublicationApproval(record, now = new Date().toISOString()) {
  const fail = (message) => {
    throw new Error(`Editorial approval ${record?.id ?? "unknown"}: ${message}`);
  };
  if (!record || record.status !== "published")
    fail("only approved published records may enter public data");
  if (!Number.isInteger(record.revision) || record.revision < 1) fail("revision required");
  const a = record.approval;
  const present = (v) => typeof v === "string" && !!v.trim();
  if (
    !a ||
    !present(a.by) ||
    !present(a.reference) ||
    !Number.isFinite(Date.parse(a.at)) ||
    Date.parse(a.at) > Date.parse(now) ||
    Date.parse(a.at) < Date.parse(record.reviewedAt) ||
    a.revision !== record.revision
  )
    fail("human confirmation of this revision required");
  if (a.contentHash !== publicationDigest(record))
    fail("content changed; renewed approval required");
  if (
    !a.confirmed ||
    !["scores", "wording", "evidence", "scope"].every((key) => a.confirmed[key] === true)
  )
    fail("scores, wording, evidence and scope must be confirmed");
  if (
    publicationRiskFlags(record).length &&
    (!a.riskReview ||
      !present(a.riskReview.by) ||
      !present(a.riskReview.reference) ||
      !present(a.riskReview.note))
  )
    fail("flagged content needs additional human review");
}
