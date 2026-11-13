import { afterEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { localConfirmedExperience } from "./local-confirmed-experience";

vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

test("production cannot include private 2025 copy even when preview is enabled", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("LOCAL_2025_EXPERIENCE_PREVIEW", "1");
  for (const id of ["hzmb-half-marathon-2026", "standard-chartered-hk-marathon-2027"])
    expect(localConfirmedExperience(id)).toBeNull();
  expect(readFileSync).not.toHaveBeenCalled();
});

test("private reads require explicit development opt-in and a selected race", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("LOCAL_2025_EXPERIENCE_PREVIEW", "");
  expect(localConfirmedExperience("hzmb-half-marathon-2026")).toBeNull();
  vi.stubEnv("LOCAL_2025_EXPERIENCE_PREVIEW", "1");
  expect(localConfirmedExperience("rmac-gold-coast-15k-2026")).toBeNull();
  expect(readFileSync).not.toHaveBeenCalled();
});

test("changed or substituted copy cannot replace the selected revision", () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("LOCAL_2025_EXPERIENCE_PREVIEW", "1");
  vi.mocked(readFileSync).mockReturnValue("{}");
  expect(() => localConfirmedExperience("hzmb-half-marathon-2026")).toThrow(/confirmed content/);
});
