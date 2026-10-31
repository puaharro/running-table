import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EditorialFeedback } from "@/components/editorial-feedback";
import {
  prepareEditorialFeedback,
  editorialContactEmail,
  type EditorialFeedback as Feedback,
} from "./editorial-contact";
import { initialNotebook } from "./review-notebook";
import { prepareReviewRequest } from "./review-request";
const input: Feedback = {
  type: "complaint",
  raceName: "測試賽事",
  group: "半馬",
  year: "2025",
  reviewId: "test-review",
  quotedText: "測試爭議句子",
  details: "這是測試原因",
  evidenceUrl: "",
  replyEmail: "",
};
describe("private editorial email preparation", () => {
  it("prepares an email without requiring official evidence or publishing a GitHub issue", () => {
    const draft = prepareEditorialFeedback(input);
    const url = new URL(draft.url);
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(editorialContactEmail);
    expect(url.searchParams.get("body")).toContain(input.quotedText);
    expect(draft.body).toContain("2025／半馬");
    expect(draft.url).not.toContain("github.com");
  });
  it("accepts optional HTTPS material and organizer responses", () => {
    const draft = prepareEditorialFeedback({
      ...input,
      type: "organizer-response",
      evidenceUrl: "https://example.com/evidence",
      replyEmail: "reply@example.com",
    });
    expect(draft.subject).toContain("大會回應");
    expect(draft.body).toContain("reply@example.com");
  });
  it("rejects unsafe links, missing configuration and invalid headers/addresses", () => {
    for (const evidenceUrl of ["javascript:alert(1)", "https://user:pass@example.com/"])
      expect(() => prepareEditorialFeedback({ ...input, evidenceUrl })).toThrow();
    expect(() => prepareEditorialFeedback(input, "")).toThrow("未設定");
    expect(() => prepareEditorialFeedback(input, "a@example.com\nbcc:x@example.com")).toThrow();
    expect(() => prepareEditorialFeedback(input, "a?bcc=x@example.com")).toThrow();
    expect(() => prepareEditorialFeedback({ ...input, year: "abc" })).toThrow();
    expect(() => prepareEditorialFeedback({ ...input, replyEmail: "invalid" })).toThrow();
  });
  it("states draft-only behavior and does not require an evidence URL", () => {
    const html = renderToStaticMarkup(
      createElement(EditorialFeedback, { races: [], recipient: editorialContactEmail }),
    );
    expect(html).toContain("唔會上傳或儲存投訴");
    expect(html).toContain("毋須為官方公告");
    expect(html).not.toContain("github.com");
    expect(html).not.toMatch(/required[^>]*type="url"|type="url"[^>]*required/);
  });
});
describe("pending review request export", () => {
  it("exports an independent pending snapshot without an approval or a publish operation", () => {
    const draft = initialNotebook().entries[0];
    draft.dimensions.course = { score: "2", notes: "測試待確認觀察" };
    const request = prepareReviewRequest(draft);
    expect(request.status).toBe("pending-confirmation");
    expect(request).not.toHaveProperty("approval");
    expect(request.riskHints).toContain("低分需額外覆核");
    draft.dimensions.course.notes = "changed";
    expect(request.review.dimensions.course.notes).toBe("測試待確認觀察");
  });
});
