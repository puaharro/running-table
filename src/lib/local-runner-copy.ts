import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface LocalRunnerCopy {
  revision: number;
  raceId: string;
  markdown: string;
  sha256: string;
}

// Owner-confirmed website copy, retained in Git for reproducible local previews.
// Raw research stays private; this section remains excluded from production exports.
export function localRunnerCopy(raceId: string): LocalRunnerCopy | null {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.LOCAL_RMAC_COPY_PREVIEW !== "1" ||
    raceId !== "rmac-gold-coast-15k-2026"
  )
    return null;

  const record: LocalRunnerCopy = JSON.parse(
    readFileSync(join(process.cwd(), "content/runner-copy-previews/rmac-2026.json"), "utf8"),
  );
  if (
    record.raceId !== raceId ||
    record.revision !== 2 ||
    typeof record.markdown !== "string" ||
    record.sha256 !== createHash("sha256").update(record.markdown).digest("hex")
  )
    throw new Error("Local RMAC preview does not match the selected website copy revision.");
  return record;
}
