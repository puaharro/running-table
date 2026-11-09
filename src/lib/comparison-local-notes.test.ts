import { expect, it } from "vitest";
import { noteStorageKey, parseLocalNote, saveLocalNote } from "./comparison-local-notes";

function memory() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
it("appends immutable revisions including cleared fields and original-source snapshots", () => {
  const storage = memory();
  const values = {
    differences: "2025 記錄水站意見",
    verification: "待核實 2026",
    basis: "原文及 https://example.invalid/source",
  };
  const first = saveLocalNote(storage, "race/group/2025/2026/水站", 0, values);
  const second = saveLocalNote(storage, first.context, 1, {
    differences: "",
    verification: "",
    basis: "new evidence",
  });
  expect(second.history).toHaveLength(2);
  expect(second.history[0]).toEqual(first.history[0]);
  expect(second.history[1].differences).toBe("");
  expect(parseLocalNote(storage.getItem(noteStorageKey(first.context)), first.context)).toEqual(
    second,
  );
});
it("isolates race, group, year orientation and topic, rejects stale and invalid writes", () => {
  const storage = memory();
  const context = JSON.stringify(["race", "half", 2025, 2026, "水站"]);
  const values = { differences: "a", verification: "b", basis: "source" };
  saveLocalNote(storage, context, 0, values);
  expect(() => saveLocalNote(storage, context, 0, values)).toThrow("另一個視窗");
  for (const other of [
    ["other", "half", 2025, 2026, "水站"],
    ["race", "full", 2025, 2026, "水站"],
    ["race", "half", 2026, 2025, "水站"],
    ["race", "half", 2025, 2026, "交通"],
  ])
    expect(
      parseLocalNote(storage.getItem(noteStorageKey(JSON.stringify(other))), JSON.stringify(other))
        .history,
    ).toHaveLength(0);
  expect(() =>
    saveLocalNote(storage, context, 1, { ...values, differences: "a".repeat(2001) }),
  ).toThrow();
  expect(parseLocalNote(storage.getItem(noteStorageKey(context)), context).history).toHaveLength(1);
  storage.setItem(noteStorageKey(context), "broken");
  expect(() => saveLocalNote(storage, context, 1, values)).toThrow();
  expect(storage.getItem(noteStorageKey(context))).toBe("broken");
});
it("does not claim success when browser storage is unavailable", () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota");
    },
  };
  expect(() =>
    saveLocalNote(storage, "test", 0, { differences: "a", verification: "b", basis: "source" }),
  ).toThrow("quota");
});
