import { englishDate, englishTimestamp, language, localPath } from "./english-races";
import { listDeadline } from "./list-registration";
import { hongKongToday } from "./races";
import { raceHref } from "./site";
import type { Race } from "./types";

const dayMs = 86_400_000;
const deadlineWindow = 14;
const courseMapWindow = 30;

type NewsItem = {
  id: string;
  href: string;
  category: string;
  headline: string;
  summary: string;
  date?: { value: string; label: string };
  order: number;
};

export function homeRaceNews(races: Race[], now: string, english = false) {
  const current = Date.parse(now);
  const today = hongKongToday(new Date(now));
  const t = language(english);
  const deadlines: NewsItem[] = [];
  const courseMaps: NewsItem[] = [];

  for (const race of races) {
    if (
      race.verification !== "verified" ||
      race.publication !== "published" ||
      race.status !== "scheduled" ||
      race.endDate < today
    )
      continue;

    const name = english ? race.englishName : race.name;
    const href = localPath(raceHref(race), english);
    const groups = race.groups.map((group) => ({
      ...group,
      // A verified date may remain usable after the last check of live availability.
      channels: group.channels.filter(
        (channel) =>
          channel.status === "open" &&
          (!channel.registrationStart || channel.registrationStart <= today) &&
          (!channel.registrationOpensAt || Date.parse(channel.registrationOpensAt) <= current),
      ),
    }));
    const deadline = listDeadline(race, groups, now, english);
    if (deadline) {
      const timed = deadline.date.includes("T");
      const day = timed ? hongKongToday(new Date(deadline.date)) : deadline.date;
      const days = (Date.parse(day) - Date.parse(today)) / dayMs;
      if (days <= deadlineWindow) {
        const remaining =
          days === 0
            ? t("報名今日截止", "entries close today")
            : t(
                `距報名截止尚餘 ${days} 日`,
                `entries close in ${days} ${days === 1 ? "day" : "days"}`,
              );
        const dateLabel = english
          ? timed
            ? `${englishTimestamp(deadline.date)} deadline`
            : `${englishDate(day)} deadline (time unconfirmed)`
          : deadline.label;
        deadlines.push({
          id: `${race.id}-deadline`,
          href: `${href}#registration-groups`,
          category: t("報名截止", "Entry deadline"),
          headline: t(`${name}：${remaining}`, `${name}: ${remaining}`),
          summary: deadline.scope,
          date: { value: deadline.date, label: dateLabel },
          order: Date.parse(timed ? deadline.date : `${day}T23:59:59.999+08:00`),
        });
      }
    }

    const map = race.sources
      ?.filter((source) => source.fields.includes("courseMap"))
      .sort((a, b) => Date.parse(b.checkedAt) - Date.parse(a.checkedAt))
      .find((source) => Date.parse(source.checkedAt) <= current);
    if (map && current - Date.parse(map.checkedAt) <= courseMapWindow * dayMs) {
      courseMaps.push({
        id: `${race.id}-course-map`,
        href: `${href}#source-${map.id}`,
        category: t("路線圖", "Course map"),
        headline: t(`${name}公布官方路線圖`, `${name}: official course map available`),
        summary: t(
          "可在賽事內頁查閱大會發布的路線圖。",
          "Find the organiser’s course map on the race page.",
        ),
        order: Date.parse(map.checkedAt),
      });
    }
  }

  return [
    ...deadlines.sort((a, b) => a.order - b.order).slice(0, courseMaps.length ? 3 : 4),
    ...courseMaps.sort((a, b) => b.order - a.order),
  ].slice(0, 4);
}
