import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ratingDimensions, ratingPolicy, type RatingDimension } from "./rating-policy";

const selected = {
  "hzmb-half-marathon-2026": {
    prefix: "hzmb-half-2025",
    key: "hz",
    groupId: "hzmb-2026-half",
    group: "半馬",
    websiteId: "website-90de7c70-fcd2-4ac6-bf6c-adb4e6345159",
    copyHash: "60d0d30e406ba5ecf8da7f7bc3f2333a83bc4d33afa74cec386b6f907cb973ab",
    ratingHash: "81f49ca92f634d5175b9fc442fec65302ac597f60f9565a216cb1addebbadc16",
  },
  "standard-chartered-hk-marathon-2027": {
    prefix: "hk-marathon-2025",
    key: "sc",
    groupId: "schkm-2027-marathon",
    group: "全馬",
    websiteId: "website-9f450c03-615e-4d6d-84ad-fdfec68d7837",
    copyHash: "2cef43013cc92c306e2b9c6df7fb1402881080c4ec4153806305a617be364d34",
    ratingHash: "3cb1d5d80959f9e4275fb6696d2b2230641d083704f66022032419518a5c3aa4",
  },
} as const;

export interface LocalConfirmedExperience {
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
const hash = (text: string) => createHash("sha256").update(text).digest("hex");

// This preview is deliberately excluded from production and static export.
// Only the exact copy and rating wording selected by the owner are returned.
export function localConfirmedExperience(raceId: string): LocalConfirmedExperience | null {
  if (process.env.NODE_ENV !== "development" || process.env.LOCAL_2025_EXPERIENCE_PREVIEW !== "1")
    return null;
  const pin = selected[raceId as keyof typeof selected];
  if (!pin) return null;
  const root = join(process.cwd(), ".editorial-private/research2025");
  const bundle = JSON.parse(
    readFileSync(join(root, "confirmed-v2", `${pin.prefix}-website-v2-handoff.json`), "utf8"),
  );
  const ratingText = readFileSync(join(root, `${pin.key}-rating-proposal-v1.json`), "utf8");
  const ratings = JSON.parse(ratingText);
  const copy = bundle.public_copy;
  if (
    bundle.manifest?.source_website_id !== pin.websiteId ||
    bundle.manifest.source_revision !== 2 ||
    copy?.race_id !== raceId ||
    copy.year !== 2025 ||
    hash(JSON.stringify(copy)) !== pin.copyHash ||
    hash(ratingText) !== pin.ratingHash ||
    ratings.year !== 2025 ||
    ratings.rule_version !== ratingPolicy.version ||
    !ratingDimensions.every((key) => {
      const a = ratings.assessments?.[key];
      return a && (a.score === null || (Number.isInteger(a.score) && a.score >= 1 && a.score <= 5));
    })
  )
    throw new Error("Selected 2025 experience preview does not match the confirmed content.");
  return {
    groupId: pin.groupId,
    group: pin.group,
    year: 2025,
    title: copy.title,
    sections: copy.sections,
    ruleVersion: ratings.rule_version,
    assessments: ratings.assessments,
  };
}
