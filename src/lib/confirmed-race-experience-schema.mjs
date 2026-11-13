import { createHash } from "node:crypto";

// These pins select the exact display revisions confirmed by the owner.
// They are content bindings, not publication approval or legal review receipts.
/** @type {Record<string, {file: string, groupId: string, websiteId: string, hash: string}>} */
export const selectedExperiences = {
  "hzmb-half-marathon-2026": {
    file: "hzmb-half-2025.json",
    groupId: "hzmb-2026-half",
    websiteId: "website-90de7c70-fcd2-4ac6-bf6c-adb4e6345159",
    hash: "3f62c63cf38f9e8c222964f6f5d3f7c5390233e60100c5326b9b14062ac64a4c",
  },
  "standard-chartered-hk-marathon-2027": {
    file: "hk-marathon-2025.json",
    groupId: "schkm-2027-marathon",
    websiteId: "website-9f450c03-615e-4d6d-84ad-fdfec68d7837",
    hash: "ded91bae3b8e510fbab9a63e127ad0899cc7abee1a29a701efd45be965873fc4",
  },
};

export function assertConfirmedExperience(record, raceId) {
  const pin = Object.hasOwn(selectedExperiences, raceId) ? selectedExperiences[raceId] : null;
  if (
    !pin ||
    !record ||
    record.raceId !== raceId ||
    record.groupId !== pin.groupId ||
    record.year !== 2025 ||
    record.copyRevision !== 2 ||
    record.ratingRevision !== 1 ||
    record.sourceWebsiteId !== pin.websiteId ||
    createHash("sha256").update(JSON.stringify(record)).digest("hex") !== pin.hash
  )
    throw new Error("Confirmed race experience changed; renewed confirmation required.");
}
