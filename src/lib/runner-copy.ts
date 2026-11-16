import { readFileSync } from "node:fs";
import { join } from "node:path";
import selected from "../../content/cms-runtime/selected.json";
import { validateRuntimeRecord } from "./cms-runtime-schema.mjs";
export interface RunnerCopy {
  revision: number;
  raceId: string;
  sourceWebsiteId: string;
  sourceContentHash: string;
  markdown: string;
  sha256: string;
}
// Only explicit public content selections are loaded. Never open the private CMS here.
export function runnerCopyForRace(raceId: string): RunnerCopy | null {
  const records = selected.records as Record<
    string,
    { file: string; hash: string; format: string }
  >;
  const pin = Object.hasOwn(records, raceId) ? records[raceId] : null;
  if (!pin) return null;
  if (!/^(runner-copies|cms-runtime)\/[a-zA-Z0-9-]+\.json$/.test(pin.file))
    throw Error("Invalid public runtime path");
  return validateRuntimeRecord(
    JSON.parse(readFileSync(join(process.cwd(), "content", ...pin.file.split("/")), "utf8")),
    pin,
    raceId,
  );
}
