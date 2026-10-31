import {
  ratingDimensions,
  reviewTargets,
  segmentLabels,
  type RatingDimension,
} from "./rating-policy";
import { editorialReviews as publishedReviews } from "@/data/editorial-reviews";

export const notebookFormat = "nxtgo-experience-notebook-v1";
export const notebookStorageKey = "nxtgo:experience-notebook:v1";
export interface ReviewDraft {
  id: string;
  targetId: string;
  year: string;
  reviewer: string;
  runnerSegment: keyof typeof segmentLabels;
  disclosure: string;
  observationLimits: string;
  courseNotes: string;
  dimensions: Record<RatingDimension, { score: string; notes: string }>;
}
export interface ReviewNotebook {
  format: typeof notebookFormat;
  status: "draft";
  entries: ReviewDraft[];
}
export function blankDraft(targetId: string, id: string, year = ""): ReviewDraft {
  return {
    id,
    targetId,
    year,
    reviewer: "",
    runnerSegment: "unknown",
    disclosure: "",
    observationLimits: "",
    courseNotes: "",
    dimensions: {
      course: { score: "", notes: "" },
      organization: { score: "", notes: "" },
      aid: { score: "", notes: "" },
    },
  };
}
export function initialNotebook(): ReviewNotebook {
  return {
    format: notebookFormat,
    status: "draft",
    entries: reviewTargets.map((t) => {
      const draft = blankDraft(t.id, `${t.id}-first`, t.draftYear);
      const published = publishedReviews.find(
        (r) => r.targetId === t.id && String(r.editionYear) === t.draftYear,
      );
      if (published) {
        draft.runnerSegment = published.runnerSegment as ReviewDraft["runnerSegment"];
        draft.observationLimits = published.observationLimits;
        draft.disclosure = published.disclosure;
        draft.courseNotes = published.courseNotes;
        for (const key of ratingDimensions) {
          draft.dimensions[key].notes = published.assessments[key].comment;
        }
      }
      return draft;
    }),
  };
}
// Parse local storage/imports without trusting browser data or silently replacing it.
export function parseNotebook(value: string): ReviewNotebook {
  const data = JSON.parse(value) as ReviewNotebook;
  const shortText = (v: unknown) => typeof v === "string" && v.length <= 12000;
  if (
    !data ||
    data.format !== notebookFormat ||
    data.status !== "draft" ||
    !Array.isArray(data.entries) ||
    !data.entries.length ||
    data.entries.length > 100
  )
    throw new Error("筆記格式不符");
  const ids = new Set<string>();
  for (const e of data.entries) {
    if (
      !e ||
      typeof e.id !== "string" ||
      !e.id ||
      ids.has(e.id) ||
      !reviewTargets.some((t) => t.id === e.targetId) ||
      typeof e.year !== "string" ||
      (e.year !== "" && !/^(20\d{2})$/.test(e.year)) ||
      !Object.hasOwn(segmentLabels, e.runnerSegment)
    )
      throw new Error("筆記年份或組別不符");
    ids.add(e.id);
    if (![e.reviewer, e.disclosure, e.observationLimits, e.courseNotes].every(shortText))
      throw new Error("筆記內容格式不符");
    for (const key of ratingDimensions) {
      const d = e.dimensions?.[key];
      if (!d || !shortText(d.notes) || typeof d.score !== "string" || !/^[1-5]?$/.test(d.score))
        throw new Error("筆記評分格式不符");
    }
  }
  return data;
}
export function exportNotebook(notebook: ReviewNotebook) {
  const value = JSON.stringify(notebook, null, 2);
  parseNotebook(value);
  return value;
}
