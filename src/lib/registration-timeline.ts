import { validTimestamp } from "./catalog";
import { hongKongToday, validDate } from "./races";
import type { Race, Source } from "./types";

type Milestone = {
  key: string;
  label: string;
  channel: string;
  date: string;
  sortTime: number;
  day: string;
  timed: boolean;
  groups: Set<string>;
  sources: Map<string, Source>;
};

export function registrationTimeline(race: Race, now: string) {
  if (
    race.verification !== "verified" ||
    race.status === "cancelled" ||
    race.status === "postponed"
  ) {
    return { milestones: [], next: undefined };
  }

  const current = new Date(now);
  const today = hongKongToday(current);
  const entries = new Map<string, Milestone>();
  const sourcesById = new Map(race.sources?.map((source) => [source.id, source]));
  for (const group of race.groups) {
    for (const channel of group.channels) {
      const sources = channel.sourceIds.flatMap((id) => {
        const source = sourcesById.get(id);
        return source?.fields.includes("channels.registration") &&
          validTimestamp(source.checkedAt) &&
          Date.parse(source.checkedAt) <= current.getTime()
          ? [source]
          : [];
      });
      if (!sources.length) continue;

      const dates = [
        ["開始報名", channel.registrationOpensAt ?? channel.registrationStart],
        ["報名截止", channel.registrationClosesAt ?? channel.deadline],
        ["公布結果", channel.resultAnnouncedAt],
        ["繳費截止", channel.paymentClosesAt],
      ] as const;
      for (const [label, value] of dates) {
        if (!value) continue;
        const timed = validTimestamp(value);
        if (!timed && !validDate(value)) continue;
        const date = timed ? new Date(value).toISOString() : value;
        const day = timed ? hongKongToday(new Date(date)) : date;
        if (day > (group.endDate ?? group.date)) continue;
        const key = JSON.stringify([label, channel.name, date]);
        const milestone = entries.get(key) ?? {
          key,
          label,
          channel: channel.name,
          date,
          day,
          timed,
          sortTime: Date.parse(timed ? date : `${day}T23:59:59.999+08:00`),
          groups: new Set<string>(),
          sources: new Map<string, Source>(),
        };
        milestone.groups.add(group.name);
        for (const source of sources) milestone.sources.set(source.id, source);
        entries.set(key, milestone);
      }
    }
  }

  const milestones = [...entries.values()].sort((a, b) => a.sortTime - b.sortTime);
  const next =
    race.status === "scheduled"
      ? milestones.find((entry) =>
          entry.timed ? entry.sortTime >= current.getTime() : entry.day >= today,
        )
      : undefined;
  return { milestones, next };
}
