import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ratingDimensions, ratingPolicy, type RatingDimension } from "./rating-policy";

export interface LocalRatingAssessment {
  revision: number;
  raceId: string;
  status: "pending-confirmation";
  ruleVersion: string;
  scope: string;
  dimensions: Record<RatingDimension, { score: null; reason: string; sources: number[] }>;
}

// Private review material is read only by an explicitly enabled development server.
export function localRatingAssessment(raceId: string): LocalRatingAssessment | null {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.LOCAL_RMAC_RATING_PREVIEW !== "1" ||
    raceId !== "rmac-gold-coast-15k-2026"
  )
    return null;
  const draft: LocalRatingAssessment = JSON.parse(
    readFileSync(
      join(process.cwd(), ".editorial-private/previews/rmac-rating-assessment-v1.json"),
      "utf8",
    ),
  );
  if (
    draft.raceId !== raceId ||
    draft.revision !== 1 ||
    draft.status !== "pending-confirmation" ||
    draft.ruleVersion !== ratingPolicy.version ||
    typeof draft.scope !== "string" ||
    !ratingDimensions.every((key) => {
      const item = draft.dimensions?.[key];
      return (
        item?.score === null &&
        typeof item.reason === "string" &&
        item.reason.length > 0 &&
        Array.isArray(item.sources) &&
        item.sources.every((n) => Number.isInteger(n) && n >= 1 && n <= 7)
      );
    })
  )
    throw new Error("Invalid private RMAC rating assessment.");
  return draft;
}
