import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { assertPublicationApproval } from "./editorial-publication.mjs";
import {
  selectedExperiences,
  assertConfirmedExperience,
} from "../src/lib/confirmed-race-experience-schema.mjs";
const records = JSON.parse(
  readFileSync(new URL("../src/data/editorial-reviews.json", import.meta.url), "utf8"),
);
if (!Array.isArray(records)) throw new Error("Editorial records must be an array.");
for (const record of records) assertPublicationApproval(record);
for (const [raceId, pin] of Object.entries(selectedExperiences)) {
  const display = JSON.parse(
    readFileSync(new URL(`../content/race-experiences/${pin.file}`, import.meta.url), "utf8"),
  );
  assertConfirmedExperience(display, raceId);
}
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0");
if (tracked.some((path) => path.startsWith(".editorial-private/")))
  throw new Error("Private editorial records must not be tracked.");
console.log(
  `Editorial publication verified: ${records.length} existing reviews; ${Object.keys(selectedExperiences).length} selected display revisions; private material excluded.`,
);
