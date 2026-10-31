import { describe, expect, it } from "vitest";
import { editorialReviews } from "@/data/editorial-reviews";
import { exportNotebook, initialNotebook, parseNotebook } from "./review-notebook";
describe("private browser notebook format", () => {
  it("seeds only confirmed published commentary without preselecting scores or a reviewer", () => {
    const n = initialNotebook();
    expect(n.status).toBe("draft");
    expect(n.entries.map((e) => e.year)).toEqual(["2025", "2026"]);
    for (const entry of n.entries) {
      const published = editorialReviews.find(
        (r) => r.targetId === entry.targetId && String(r.editionYear) === entry.year,
      );
      for (const [key, dimension] of Object.entries(entry.dimensions)) {
        expect(dimension.score).toBe("");
        expect(dimension.notes).toBe(
          published?.assessments[key as keyof typeof published.assessments].comment ?? "",
        );
      }
      expect(entry.observationLimits).toBe(published?.observationLimits ?? "");
      expect(entry.reviewer).toBe("");
    }
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
