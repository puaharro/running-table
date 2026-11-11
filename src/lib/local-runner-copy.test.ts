import { afterEach, expect, test, vi } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { localRunnerCopy } from "./local-runner-copy";

vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
const raceId = "rmac-gold-coast-15k-2026";

test("production export cannot read or include a local preview even with its flag set", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("LOCAL_RMAC_COPY_PREVIEW", "1");
  expect(localRunnerCopy(raceId)).toBeNull();
  expect(readFileSync).not.toHaveBeenCalled();
});

test("development requires explicit opt-in and the matching race", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("LOCAL_RMAC_COPY_PREVIEW", "");
  expect(localRunnerCopy(raceId)).toBeNull();
  vi.stubEnv("LOCAL_RMAC_COPY_PREVIEW", "1");
  expect(localRunnerCopy("different-race")).toBeNull();
  expect(readFileSync).not.toHaveBeenCalled();
});

test("local preview preserves the selected text and rejects corrupted or wrong revisions", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("LOCAL_RMAC_COPY_PREVIEW", "1");
  const markdown = "# Fictional test only\n\n## 補給\n\n**未知。**";
  const record = {
    revision: 2,
    raceId,
    markdown,
    sha256: createHash("sha256").update(markdown).digest("hex"),
  };
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify(record));
  expect(localRunnerCopy(raceId)?.markdown).toBe(markdown);
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ ...record, markdown: "different" }));
  expect(() => localRunnerCopy(raceId)).toThrow(/revision/);
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ ...record, revision: 1 }));
  expect(() => localRunnerCopy(raceId)).toThrow(/revision/);
});
