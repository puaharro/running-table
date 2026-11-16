import pins from "../../content/cms-runtime/selected-experiences.json" with { type: "json" };
import { createHash } from "node:crypto";

// These pins select the exact display revisions confirmed by the owner.
// They are content bindings, not publication approval or legal review receipts.
/** @type {Record<string, {file: string, groupId: string, websiteId: string, hash: string}>} */
export const selectedExperiences = pins;

export function assertConfirmedExperience(record, raceId) {
  const pin = Object.hasOwn(selectedExperiences, raceId) ? selectedExperiences[raceId] : null;
  if (
    !pin ||
    !record ||
    record.raceId !== raceId ||
    record.groupId !== pin.groupId ||
    !Number.isInteger(record.year) ||
    !Number.isInteger(record.copyRevision) ||
    record.copyRevision < 1 ||
    !Number.isInteger(record.ratingRevision) ||
    record.ratingRevision < 1 ||
    record.sourceWebsiteId !== pin.websiteId ||
    createHash("sha256").update(JSON.stringify(record)).digest("hex") !== pin.hash
  )
    throw new Error("Confirmed race experience changed; renewed confirmation required.");
}
