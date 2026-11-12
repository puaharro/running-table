import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface RunnerCopy {
  revision: number;
  raceId: string;
  sourceWebsiteId: string;
  sourceContentHash: string;
  markdown: string;
  sha256: string;
}

// Selected owner-confirmed copy only; production builds never read the private CMS.
export function runnerCopyForRace(raceId: string): RunnerCopy | null {
  if (raceId !== "rmac-gold-coast-15k-2026") return null;

  const record: RunnerCopy = JSON.parse(
    readFileSync(join(process.cwd(), "content/runner-copies/rmac-2026.json"), "utf8"),
  );
  if (
    record.raceId !== raceId ||
    record.revision !== 2 ||
    record.sourceWebsiteId !== "website-8b0922fb-38b6-4609-b857-8eb9adefb8e1" ||
    record.sourceContentHash !==
      "3e99aea911b3c0894d83c94e28f808fab2fa4a8b3878c04879ae2a4f2891a341" ||
    record.sha256 !== "ac2416148e5e1862fc9742175a3319ddb993b12696870be57635d201ae3b4f1b" ||
    typeof record.markdown !== "string" ||
    record.sha256 !== createHash("sha256").update(record.markdown).digest("hex")
  )
    throw new Error("RMAC copy does not match the selected confirmed revision.");
  return record;
}
