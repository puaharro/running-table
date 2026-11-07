import { validDate, hongKongToday } from "./races";
import { validTimestamp } from "./catalog";
import type { Race } from "./types";

export type CalendarItem = {
  id: string;
  label: string;
  title: string;
  date: string;
  timed: boolean;
  location?: string;
  description: string;
};
export function calendarItems(race: Race, now: string): CalendarItem[] {
  if (race.status !== "scheduled") return [];
  const today = hongKongToday(new Date(now));
  const items: CalendarItem[] = race.groups
    .filter((g) => validDate(g.date) && g.date >= today)
    .map((g) => ({
      id: `${race.id}:${g.id}:race`,
      label: `比賽日 · ${g.name} · ${g.date}`,
      title: `${race.name} · ${g.name}`,
      date: g.date,
      timed: false,
      location: g.venue ?? race.venue,
      description: "比賽日全日行程；不代表起跑時間或已獲參賽資格。",
    }));
  for (const group of race.groups)
    for (const channel of group.channels) {
      const sources =
        race.sources?.filter(
          (s) =>
            channel.sourceIds.includes(s.id) &&
            s.fields.includes("channels.registration") &&
            validTimestamp(s.checkedAt) &&
            Date.parse(s.checkedAt) <= Date.parse(now),
        ) ?? [];
      if (!sources.length) continue;
      const exact = channel.registrationClosesAt;
      if (
        exact &&
        (!validTimestamp(exact) ||
          (channel.deadline && hongKongToday(new Date(exact)) !== channel.deadline))
      )
        continue;
      const date = exact ?? channel.deadline;
      if (
        !date ||
        (exact ? Date.parse(exact) <= Date.parse(now) : !validDate(date) || date < today)
      )
        continue;
      if ((exact ? hongKongToday(new Date(exact)) : date) > group.date) continue;
      items.push({
        id: `${race.id}:${group.id}:${channel.id}:deadline`,
        label: `報名截止 · ${group.name}／${channel.name} · ${exact ? new Date(exact).toLocaleString("zh-HK", { timeZone: "Asia/Hong_Kong", hour12: false }) + " 香港時間" : date + "（時刻待核實）"}`,
        title: `報名截止｜${race.name} · ${group.name}／${channel.name}`,
        date,
        timed: !!exact,
        description: `只適用此報名渠道，並非結果公布或付款期限；不保證即時名額。${exact ? "截止時間以香港時間顯示，日曆會按裝置時區轉換。" : "只核實截止日期，截止時刻待核實；此為全日行程。"}\n官方依據：${sources.map((s) => s.url).join("\n")}\n核對：${sources.map((s) => s.checkedAt).join("、")}`,
      });
    }
  return items;
}
const escapeText = (s: string) =>
  s
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
const utc = (s: string) =>
  new Date(s)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
// RFC 5545 folding counts UTF-8 octets, not JavaScript characters.
export function foldCalendarLine(line: string) {
  let result = "",
    width = 0;
  for (const char of line) {
    const bytes = new TextEncoder().encode(char).length;
    if (width + bytes > 75) {
      result += "\r\n ";
      width = 1;
    }
    result += char;
    width += bytes;
  }
  return result;
}
export function calendarFile(item: CalendarItem, url: string, now: string) {
  if (!/^https?:$/.test(new URL(url).protocol)) throw new Error("Invalid calendar URL");
  const start = item.timed ? utc(item.date) : item.date.replace(/-/g, "");
  const end = item.timed
    ? []
    : [
        `DTEND;VALUE=DATE:${new Date(Date.parse(item.date + "T00:00:00Z") + 86400000).toISOString().slice(0, 10).replace(/-/g, "")}`,
      ];
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//NXTGO//Race Calendar//ZH",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:${encodeURIComponent(item.id)}@nxtgo`,
      `DTSTAMP:${utc(now)}`,
      `DTSTART${item.timed ? "" : ";VALUE=DATE"}:${start}`,
      ...end,
      `SUMMARY:${escapeText(item.title)}`,
      `DESCRIPTION:${escapeText(item.description + "\n此為下載時的資料快照，不會自動同步改期；請再次查看大會資料。")}`,
      ...(item.location ? [`LOCATION:${escapeText(item.location)}`] : []),
      `URL:${url.replace(/[\r\n]/g, "")}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(foldCalendarLine)
      .join("\r\n") + "\r\n"
  );
}
