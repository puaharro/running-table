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

export const calendarRegistrationLabels = { ...registrationLabels, open: "接受報名" };

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
  const time = next.timed ? formatTimestamp(next.date).slice(-5) : null;
  const label = time ? `${dateLabel} ${time} 截止（香港時間）` : `${dateLabel}截止（時刻待核實）`;
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
    day,
    time,
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
): { primary: string; secondary?: string; status?: RegistrationStatus } {
  const t = language(english);
  if (race.status === "cancelled") return { primary: t("賽事取消", "Race cancelled") };
  if (race.status === "postponed")
    return {
      primary: t("賽事延期", "Postponed"),
      secondary: t("報名待核實", "Entry status unverified"),
    };
  if (race.status === "completed" || race.endDate < hongKongToday(clockTime(now)))
    return { primary: t("賽事已完成", "Race completed") };
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
    return { primary: t("報名詳情請參閱大會網站", "See the official website for entry details") };
  if (!entries.length || entries.every((entry) => entry.status === "unknown"))
    return { primary: t("報名待核實", "Entry status unverified"), status: "unknown" };
  const parts = Object.entries(english ? englishChannels : channelTypeLabels)
    .flatMap(([type, channel]) => {
      const statuses = new Set(
        entries.filter((entry) => entry.type === type).map((entry) => entry.status),
      );
      if (!statuses.size) return [];
      const open = statuses.has("open");
      const unknown = statuses.has("unknown");
      const singleStatus = statuses.size === 1 ? [...statuses][0] : undefined;
      const label = singleStatus
        ? (english ? englishStatus : calendarRegistrationLabels)[singleStatus]
        : open
          ? t("部分接受報名", "Some categories open")
          : unknown
            ? t("部分待核實", "Partly unverified")
            : t("按組別而異", "Varies by category");
      const detail = open && unknown ? t("部分待核實", "Some unverified") : undefined;
      const status = open ? "open" : unknown ? "unknown" : singleStatus;
      return [{ channel, label, detail, status, priority: open ? 0 : unknown ? 1 : 2 }];
    })
    .sort((a, b) => a.priority - b.priority);
  const [first, second] = parts;
  const secondary = [first.channel, first.detail];
  if (second) {
    secondary.push(`${second.channel}${t("：", ": ")}${second.label}`, second.detail);
  }
  if (parts.length > 2)
    secondary.push(t(`另 ${parts.length - 2} 類渠道`, `+${parts.length - 2} more channels`));
  return {
    primary: first.label,
    secondary: secondary.filter(Boolean).join(" · "),
    status: first.status,
  };
}
