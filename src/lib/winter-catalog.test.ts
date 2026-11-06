import { expect, it } from "vitest";
import { races } from "@/data/races";

it("keeps the winter expansion sourced and within the researched window without inventing registration", () => {
  // Select the new batch by its documented stable IDs rather than the test clock.
  const batch = races.filter((r) =>
    [
      "rmac-gold",
      "pocari-sweat",
      "gorun-together",
      "disney-magic",
      "pegasus-shek",
      "asics-hk",
      "garmin-run",
      "tai-po-half",
      "dhk-healthy",
      "world-heart",
      "run-with-love",
      "sai-kung-district",
    ].some((id) => r.id.startsWith(id)),
  );
  expect(batch).toHaveLength(12);
  for (const race of batch) {
    expect(race.date >= "2026-11-07" && race.endDate <= "2027-02-07").toBe(true);
    expect(race.sources?.length).toBeGreaterThan(0);
    expect(race.groups.every((g) => g.channels.every((c) => c.status !== "open"))).toBe(true);
  }
  expect(
    batch
      .find((r) => r.id === "run-with-love-2027")!
      .groups.every((g) => g.channels[0].price === null && !g.startTime),
  ).toBe(true);
  expect(
    batch.find((r) => r.id === "disney-magic-run-fest-2026")!.groups.map((g) => g.date),
  ).toEqual(["2026-11-29", "2026-11-28", "2026-11-28", "2026-11-29"]);
});
