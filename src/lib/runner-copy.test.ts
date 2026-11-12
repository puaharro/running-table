import { afterEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import record from "../../content/runner-copies/rmac-2026.json";
import { runnerCopyForRace } from "./runner-copy";
vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
const raceId = "rmac-gold-coast-15k-2026";
test("production builds include the selected confirmed copy without a preview flag", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("LOCAL_RMAC_COPY_PREVIEW", "");
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify(record));
  expect(runnerCopyForRace(raceId)?.markdown).toBe(record.markdown);
  expect(readFileSync).toHaveBeenCalledWith(
    expect.stringContaining("content/runner-copies/rmac-2026.json"),
    "utf8",
  );
});
test("unrelated races never read the RMAC copy", () => {
  expect(runnerCopyForRace("different-race")).toBeNull();
  expect(readFileSync).not.toHaveBeenCalled();
});
test("changed text, source identity or revision cannot silently replace confirmed content", () => {
  for (const change of [
    { markdown: "different" },
    { revision: 3 },
    { sourceContentHash: "different" },
    { sourceWebsiteId: "different" },
  ]) {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ ...record, ...change }));
    expect(() => runnerCopyForRace(raceId)).toThrow(/confirmed revision/);
  }
});
