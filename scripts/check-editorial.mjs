import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { assertPublicationApproval } from "./editorial-publication.mjs";
const records = JSON.parse(
  readFileSync(new URL("../src/data/editorial-reviews.json", import.meta.url), "utf8"),
);
if (!Array.isArray(records)) throw new Error("Editorial records must be an array.");
for (const record of records) assertPublicationApproval(record);
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0");
if (tracked.some((path) => path.startsWith(".editorial-private/")))
  throw new Error("Private editorial records must not be tracked.");
console.log(
  `Editorial publication verified: ${records.length} approved reviews; pending material excluded.`,
);
