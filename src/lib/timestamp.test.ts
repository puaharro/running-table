import { afterEach, expect, it, vi } from "vitest";
import { displayDate, formatTimestamp } from "./races";

afterEach(() => vi.restoreAllMocks());

it("keeps deadline text stable across ICU literal-spacing differences", () => {
  const input = "2026-10-26T12:00:00+08:00";
  const parts = new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(input));
  const spy = vi.spyOn(Intl.DateTimeFormat.prototype, "formatToParts");
  for (const literal of [" ", "\u2009", "\u202f"]) {
    spy.mockReturnValueOnce(
      parts.map((part) => (part.type === "literal" ? { ...part, value: literal } : part)),
    );
    expect(formatTimestamp(input)).toBe("26/10/2026 12:00");
  }
});

it("renders midnight in Hong Kong on the correct calendar date", () => {
  expect(formatTimestamp("2026-10-25T16:00:00Z")).toBe("26/10/2026 00:00");
});

it("renders calendar dates and weekdays independently of runtime locale data", () => {
  const intl = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(() => {
    throw new Error("Runtime locale data must not affect date-only labels");
  });
  expect(displayDate("2026-11-15")).toBe("11月15日");
  expect(displayDate("2026-11-15", { year: "numeric", weekday: "short" })).toBe(
    "2026年11月15日週日",
  );
  expect(displayDate("2026-11-15", { weekday: "long", month: undefined, day: undefined })).toBe(
    "星期日",
  );
  expect(displayDate("2027-01-03", { year: "numeric" })).toBe("2027年1月3日");
  intl.mockRestore();
});
