import { expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { races } from "@/data/races";
import { calendarFile, calendarItems, foldCalendarLine } from "./calendar";
import { favoritesKey, parseFavorites, toggleFavorite } from "./favorites";
import { RaceSaveActions } from "@/components/race-save";
const now = "2026-11-07T02:00:00Z";
function fixture() {
  const race = structuredClone(races[0]);
  race.sources = [
    {
      id: "official",
      title: "Official",
      url: "https://example.com/official",
      checkedAt: now,
      fields: ["channels.registration"],
    },
  ];
  const g = race.groups[0],
    c = g.channels[0];
  race.groups = [g];
  c.sourceIds = ["official"];
  c.deadline = "2026-11-12";
  c.registrationClosesAt = "2026-11-12T00:30:00+08:00";
  c.status = "unknown";
  return race;
}
it("toggles durable IDs without replacing other favorites, deduplicates old data and propagates write failures", () => {
  let value: string | null = null;
  const store = {
    getItem: (key: string) => {
      expect(key).toBe(favoritesKey);
      return value;
    },
    setItem: (_key: string, next: string) => {
      value = next;
    },
  };
  expect(toggleFavorite(store, "race-one")).toEqual(["race-one"]);
  expect(toggleFavorite(store, "race-two")).toEqual(["race-one", "race-two"]);
  expect(toggleFavorite(store, "race-one")).toEqual(["race-two"]);
  expect(parseFavorites('["race-two","race-two"]')).toEqual(["race-two"]);
  expect(() =>
    toggleFavorite(
      {
        ...store,
        setItem: () => {
          throw new Error("quota");
        },
      },
      "race-one",
    ),
  ).toThrow("quota");
  expect(value).toBe('["race-two"]');
  value = "broken JSON";
  expect(() => toggleFavorite(store, "race-one")).toThrow();
  expect(value).toBe("broken JSON");
  expect(() => parseFavorites('{"race-one":true}')).toThrow();
});
it("requires matching field provenance for deadlines, without inventing availability or using payment/result dates", () => {
  const race = fixture();
  expect(calendarItems(race, now).filter((i) => i.timed)).toHaveLength(1);
  race.sources![0].fields = ["date"];
  expect(calendarItems(race, now).filter((i) => i.timed)).toHaveLength(0);
  race.sources![0].fields = ["channels.registration"];
  const c = race.groups[0].channels[0];
  delete c.deadline;
  delete c.registrationClosesAt;
  c.resultAnnouncedAt = "2026-11-12T10:00:00+08:00";
  c.paymentClosesAt = "2026-11-13T10:00:00+08:00";
  expect(calendarItems(race, now).every((i) => i.id.endsWith(":race"))).toBe(true);
});
it("rejects contradictory, expired and invalid cutoffs and cancelled/postponed races", () => {
  const race = fixture(),
    c = race.groups[0].channels[0];
  c.deadline = "2026-11-13";
  expect(calendarItems(race, now).filter((i) => i.timed)).toHaveLength(0);
  c.deadline = "2026-11-12";
  c.registrationClosesAt = "2026-11-06T00:30:00+08:00";
  expect(calendarItems(race, now).filter((i) => i.timed)).toHaveLength(0);
  c.registrationClosesAt = "bad";
  expect(calendarItems(race, now).filter((i) => i.timed)).toHaveLength(0);
  race.status = "postponed";
  expect(calendarItems(race, now)).toEqual([]);
  race.status = "cancelled";
  expect(calendarItems(race, now)).toEqual([]);
});
it("exports date-only deadlines as one all-day date and exact Hong Kong deadlines as the correct previous UTC day", () => {
  const race = fixture(),
    c = race.groups[0].channels[0];
  let item = calendarItems(race, now).find((i) => i.timed)!;
  const exact = calendarFile(item, "https://example.com/race", now).replace(/\r\n /g, "");
  expect(exact).toContain("DTSTART:20261111T163000Z\r\n");
  delete c.registrationClosesAt;
  item = calendarItems(race, now).find((i) => i.id.endsWith(":deadline"))!;
  expect(item.label).toContain("時刻待核實");
  const allDay = calendarFile(item, "https://example.com/race", now).replace(/\r\n /g, "");
  expect(allDay).toContain("DTSTART;VALUE=DATE:20261112\r\nDTEND;VALUE=DATE:20261113");
  expect(allDay).not.toContain("2359");
});
it("preserves multi-day race group dates and produces folded, escaped, single-event UTF-8 calendars", () => {
  const disney = races.find((r) => r.id === "disney-magic-run-fest-2026")!;
  expect(
    calendarItems(disney, now)
      .filter((i) => i.id.endsWith(":race"))
      .map((i) => i.date),
  ).toEqual(disney.groups.map((g) => g.date));
  const item = calendarItems(fixture(), now)[0];
  item.title = "中文🏃".repeat(30) + ",;\\\nBEGIN:VEVENT";
  const file = calendarFile(item, "https://example.com/race", now);
  for (const line of file.split("\r\n"))
    expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  const unfolded = file.replace(/\r\n /g, "");
  expect(unfolded.match(/^BEGIN:VEVENT$/gm)).toHaveLength(1);
  expect(unfolded).toContain("\\,\\;\\\\\\nBEGIN:VEVENT");
  expect(unfolded).toContain("不會自動同步改期");
  expect(foldCalendarLine("中文🏃".repeat(30)).replace(/\r\n /g, "")).toBe("中文🏃".repeat(30));
});
it("renders without browser storage during static export and explains import and local-only scope", () => {
  const html = renderToStaticMarkup(
    createElement(RaceSaveActions, { race: fixture(), initialNow: now }),
  );
  expect(html).toContain("加入日曆");
  expect(html).toContain("收藏只存於此瀏覽器");
  expect(html).toContain("自行匯入");
});
