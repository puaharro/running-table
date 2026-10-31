import { describe, expect, it } from "vitest";
import { editorialReviews } from "@/data/editorial-reviews";
import { exportNotebook, initialNotebook, parseNotebook } from "./review-notebook";
describe("private browser notebook format", () => {
  it("seeds only published commentary but never invents marathon observations or draft scores", () => {
    const n = initialNotebook();
    expect(n.status).toBe("draft");
    expect(n.entries.map((e) => e.year)).toEqual(["2025", "2026"]);
    for (const d of Object.values(n.entries[0].dimensions)) expect(d.score).toBe("");
    for (const d of Object.values(n.entries[1].dimensions))
      expect(d).toEqual({ score: "", notes: "" });
    const published = editorialReviews.find(
      (r) => r.targetId === "hzmb-half" && r.editionYear === 2025,
    );
    expect(n.entries[0].dimensions.course.notes).toBe(published?.assessments.course.comment ?? "");
    expect(n.entries[0].observationLimits).toBe(published?.observationLimits ?? "");
    expect(n.entries[0].reviewer).toBe("");
  });
  it("round-trips all drafts including multi-edition notes without losing text", () => {
    const n = initialNotebook();
    n.entries[0].dimensions.course = { score: "4", notes: "第一段觀察\n第二段觀察" };
    n.entries.push({ ...structuredClone(n.entries[1]), id: "another-year", year: "2024" });
    expect(parseNotebook(exportNotebook(n))).toEqual(n);
  });
  it("rejects malformed storage/imports and invalid years or dimensions", () => {
    for (const value of ["{", "null", "{}", '{"entries":[]}'])
      expect(() => parseNotebook(value)).toThrow();
    const n = initialNotebook();
    n.entries[0].year = "abc";
    expect(() => exportNotebook(n)).toThrow();
    n.entries[0].year = "2025";
    n.entries[0].dimensions.aid.score = "6";
    expect(() => exportNotebook(n)).toThrow();
    n.entries[0].dimensions.aid.score = "";
    n.entries[0].id = n.entries[1].id;
    expect(() => exportNotebook(n)).toThrow();
  });
});
