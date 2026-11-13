import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  selectedExperiences,
  assertConfirmedExperience,
} from "./confirmed-race-experience-schema.mjs";
import { ratingPolicy, type RatingDimension } from "./rating-policy";

export interface ConfirmedRaceExperience {
  groupId: string;
  group: string;
  year: number;
  title: string;
  sections: { topic: string; body: string; limitations: string; urls: string[] }[];
  ruleVersion: string;
  assessments: Record<
    RatingDimension,
    {
      score: number | null;
      comment: string;
      positives: string[];
      concerns: string[];
      suitedFor: string;
      basis: string;
    }
  >;
}

// The build reads selected display content only, never the private CMS or evidence store.
export function confirmedRaceExperience(raceId: string): ConfirmedRaceExperience | null {
  const pin = Object.hasOwn(selectedExperiences, raceId) ? selectedExperiences[raceId] : null;
  if (!pin) return null;
  const record = JSON.parse(
    readFileSync(join(process.cwd(), "content/race-experiences", pin.file), "utf8"),
  );
  assertConfirmedExperience(record, raceId);
  if (record.ruleVersion !== ratingPolicy.version)
    throw new Error("Experience rating policy changed; renewed confirmation required.");
  return record;
}
