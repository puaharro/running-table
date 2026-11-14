import { afterEach, expect, test, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import hz from "../../content/race-experiences/hzmb-half-2025.json";
import sc from "../../content/race-experiences/hk-marathon-2025.json";
import { confirmedRaceExperience } from "./confirmed-race-experience";
import { assertConfirmedExperience } from "./confirmed-race-experience-schema.mjs";

vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

test("production reads both selected public display records without private preview flags", () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("LOCAL_2025_EXPERIENCE_PREVIEW", "");
  for (const [record, file] of [
    [hz, "hzmb-half-2025.json"],
    [sc, "hk-marathon-2025.json"],
  ] as const) {
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(record));
    expect(confirmedRaceExperience(record.raceId)?.sections).toEqual(record.sections);
    expect(readFileSync).toHaveBeenLastCalledWith(
      join(process.cwd(), "content", "race-experiences", file),
      "utf8",
    );
  }
  expect([
    hz.assessments.course.score,
    hz.assessments.organization.score,
    hz.assessments.aid.score,
  ]).toEqual([3, 4, 3]);
  expect([
    sc.assessments.course.score,
    sc.assessments.organization.score,
    sc.assessments.aid.score,
  ]).toEqual([2, null, null]);
});

test("unrelated races cannot receive these editions or read files", () => {
  expect(confirmedRaceExperience("rmac-gold-coast-15k-2026")).toBeNull();
  expect(readFileSync).not.toHaveBeenCalled();
});

test("changed score, wording, source, limitation or edition invalidates the content binding", () => {
  for (const change of [
    (r: typeof hz) => {
      r.assessments.course.score = 5;
    },
    (r: typeof hz) => {
      r.assessments.course.comment = "changed";
    },
    (r: typeof hz) => {
      r.sections[0].urls = ["https://example.com/changed"];
    },
    (r: typeof hz) => {
      r.sections[0].limitations = "changed";
    },
    (r: typeof hz) => {
      r.year = 2026;
    },
  ]) {
    const record = structuredClone(hz);
    change(record);
    expect(() => assertConfirmedExperience(record, hz.raceId)).toThrow(/renewed confirmation/);
  }
  expect(() => assertConfirmedExperience(hz, sc.raceId)).toThrow(/renewed confirmation/);
});
