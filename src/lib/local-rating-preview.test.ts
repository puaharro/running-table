import { afterEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { localRatingAssessment } from "./local-rating-preview";

vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

test("production never reads private assessments even with the local flag enabled", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("LOCAL_RMAC_RATING_PREVIEW", "1");
  expect(localRatingAssessment("rmac-gold-coast-15k-2026")).toBeNull();
  expect(readFileSync).not.toHaveBeenCalled();
});

test("private reads require development, explicit opt-in and the matching race", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("LOCAL_RMAC_RATING_PREVIEW", "");
  expect(localRatingAssessment("rmac-gold-coast-15k-2026")).toBeNull();
  vi.stubEnv("LOCAL_RMAC_RATING_PREVIEW", "1");
  expect(localRatingAssessment("another-race")).toBeNull();
  expect(readFileSync).not.toHaveBeenCalled();
});
