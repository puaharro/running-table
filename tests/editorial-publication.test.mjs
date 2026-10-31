import { describe, expect, it } from "vitest";
import {
  assertPublicationApproval,
  publicationDigest,
  publicationRiskFlags,
} from "../scripts/editorial-publication.mjs";
const now = "2026-10-31T12:00:00Z";
function fixture() {
  const record = {
    id: "test-only",
    status: "published",
    revision: 1,
    reviewedAt: "2026-10-30T12:00:00Z",
    ruleVersion: "test-v1",
    assessments: { course: { score: 3, comment: "Test observation" } },
    observationLimits: "One test runner",
    evidence: [{ id: "test-evidence", description: "Test facts" }],
  };
  record.approval = {
    by: "Fictional test human",
    at: now,
    reference: "test-only-confirmation",
    revision: 1,
    contentHash: publicationDigest(record),
    confirmed: { scores: true, wording: true, evidence: true, scope: true },
  };
  return record;
}
describe("publication confirmation gate", () => {
  it("accepts an unchanged confirmed revision independent of key ordering", () => {
    const r = fixture();
    expect(() => assertPublicationApproval(r, now)).not.toThrow();
    expect(publicationDigest(Object.fromEntries(Object.entries(r).reverse()))).toBe(
      publicationDigest(r),
    );
  });
  it.each(["score", "wording", "evidence", "scope", "rules", "response", "revision"])(
    "invalidates confirmation after changing %s",
    (field) => {
      const r = fixture();
      if (field === "score") r.assessments.course.score = 4;
      if (field === "wording") r.assessments.course.comment += " changed";
      if (field === "evidence") r.evidence[0].description += " changed";
      if (field === "scope") r.observationLimits += " changed";
      if (field === "rules") r.ruleVersion = "test-v2";
      if (field === "response") r.organizerResponses = [{ text: "Test reply" }];
      if (field === "revision") r.revision = 2;
      expect(() => assertPublicationApproval(r, now)).toThrow();
    },
  );
  it("rejects missing, incomplete and future confirmation and public drafts", () => {
    const r = fixture();
    delete r.approval;
    expect(() => assertPublicationApproval(r, now)).toThrow("human confirmation");
    const incomplete = fixture();
    incomplete.approval.confirmed.evidence = false;
    expect(() => assertPublicationApproval(incomplete, now)).toThrow("must be confirmed");
    const future = fixture();
    future.approval.at = "2027-01-01T00:00:00Z";
    expect(() => assertPublicationApproval(future, now)).toThrow();
    const draft = fixture();
    draft.status = "pending-confirmation";
    expect(() => assertPublicationApproval(draft, now)).toThrow("only approved");
  });
  it("requires additional human review for low scores or sensitive words without certifying legality", () => {
    const r = fixture();
    r.assessments.course.score = 1;
    r.approval.contentHash = publicationDigest(r);
    expect(publicationRiskFlags(r)).toContain("低分需額外覆核");
    expect(() => assertPublicationApproval(r, now)).toThrow("additional human");
    r.approval.riskReview = {
      by: "Fictional second review",
      reference: "test-extra-review",
      note: "Test context reviewed; not legal clearance",
    };
    expect(() => assertPublicationApproval(r, now)).not.toThrow();
    r.assessments.course.comment = "Test allegation: fraud";
    r.approval.contentHash = publicationDigest(r);
    expect(publicationRiskFlags(r)).toContain("fraud");
  });
});
