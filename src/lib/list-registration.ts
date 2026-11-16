import {
  channelStatus,
  clockTime,
  hongKongToday,
  displayDate,
  formatTimestamp,
  type Clock,
} from "./races";
import { validTimestamp } from "./catalog";
import { englishChannels, englishStatus, englishDistance, language } from "./english-races";
import { verifiedRegistrationDeadline } from "./registration-deadline";
import {
  channelTypeLabels,
  registrationLabels,
  type Race,
  type RaceGroup,
  type RegistrationStatus,
} from "./types";

export function listDeadline(race: Race, groups: RaceGroup[], now: Clock, english = false) {
  const candidates = groups.flatMap((group) =>
    group.channels.flatMap((channel) => {
      const deadline = verifiedRegistrationDeadline(race, group, channel, now);
      if (!deadline) return [];
      // A known full/closed channel is not an actionable registration deadline.
      const status = channelStatus(race, group, channel, now);
      if (status === "full" || status === "closed") return [];
      return [{ ...deadline, group, channel }];
    }),
  );
  candidates.sort((a, b) => {
    const time = (item: typeof a) =>
      Date.parse(item.timed ? item.date : `${item.date}T23:59:59.999+08:00`);
    return time(a) - time(b);
  });
  const next = candidates[0];
  if (!next) return null;
  const day = next.timed ? hongKongToday(new Date(next.date)) : next.date;
  const currentYear = hongKongToday(clockTime(now)).slice(0, 4);
  const dateLabel = displayDate(
    day,
    day.slice(0, 4) === currentYear ? undefined : { year: "numeric" },
  );
  const label = next.timed
    ? `${dateLabel} ${formatTimestamp(next.date).slice(-5)} 截止（香港時間）`
    : `${dateLabel}截止（時刻待核實）`;
  const matchingGroups = new Set(
    candidates
      .filter(
        (item) =>
          item.date === next.date &&
          item.timed === next.timed &&
          item.channel.name === next.channel.name &&
          item.channel.type === next.channel.type,
      )
      .map((item) => item.group.id),
  );
  return {
    date: next.date,
    label,
    scope: english
      ? `${englishChannels[next.channel.type]} · ${matchingGroups.size > 1 ? `${matchingGroups.size} categories` : englishDistance(next.group.distanceKm)}`
      : `${next.channel.name} · ${matchingGroups.size > 1 ? `${matchingGroups.size} 個組別` : next.group.name}`,
  };
}

// Summarise only the groups/channels remaining after list filters.
export function listRegistration(
  race: Race,
  groups: RaceGroup[],
  now: Clock,
  english = false,
): string {
  const t = language(english);
  if (race.status === "cancelled") return t("賽事取消", "Race cancelled");
  if (race.status === "postponed")
    return t("賽事延期 · 報名待核實", "Postponed · Entry status unverified");
  if (race.status === "completed" || race.endDate < hongKongToday(clockTime(now)))
    return t("賽事已完成", "Race completed");
  const entries = groups.flatMap((group) =>
    group.channels.map((channel) => {
      const sourced =
        race.verification !== "demo" &&
        race.sources?.some(
          (source) =>
            channel.sourceIds.includes(source.id) &&
            source.fields.includes("channels.registration") &&
            validTimestamp(source.checkedAt) &&
            Date.parse(source.checkedAt) <= clockTime(now).getTime(),
        );
      return {
        type: channel.type,
        status: sourced
          ? channelStatus(race, group, channel, now)
          : ("unknown" as RegistrationStatus),
      };
    }),
  );
  if (!entries.length && race.charityEntry?.available)
    return t("報名詳情請參閱大會網站", "See the official website for entry details");
  if (!entries.length || entries.every((entry) => entry.status === "unknown"))
    return t("報名待核實", "Entry status unverified");
  const priority = (type: string) => {
    const statuses = entries.filter((entry) => entry.type === type).map((entry) => entry.status);
    return statuses.includes("open") ? 0 : statuses.includes("unknown") ? 1 : 2;
  };
  const parts = Object.entries(english ? englishChannels : channelTypeLabels)
    .sort(([a], [b]) => priority(a) - priority(b))
    .flatMap(([type, label]) => {
      const statuses = new Set(
        entries.filter((entry) => entry.type === type).map((entry) => entry.status),
      );
      if (!statuses.size) return [];
      if (english) {
        const status =
          statuses.size === 1
            ? englishStatus[[...statuses][0]]
            : statuses.has("open")
              ? "Some categories open"
              : statuses.has("unknown")
                ? "Partly unverified"
                : "Varies by category";
        return [`${label}: ${status}`];
      }
      if (statuses.size === 1) return [`${label}${registrationLabels[[...statuses][0]]}`];
      if (statuses.has("open"))
        return [`${label}部分接受申請${statuses.has("unknown") ? "，部分待核實" : ""}`];
      if (statuses.has("unknown")) return [`${label}部分待核實`];
      return [`${label}狀態按組別不同`];
    });
  return [
    ...parts.slice(0, 2),
    ...(parts.length > 2
      ? [t(`另 ${parts.length - 2} 類渠道`, `+${parts.length - 2} more channels`)]
      : []),
  ].join(" · ");
}
