import { language } from "./english-races";
import { clockTime, channelStatus, registrationIsStale, type Clock } from "./races";
import type { Race, RaceGroup, RegistrationChannel } from "./types";

export function registrationUncertaintyReason(
  race: Race,
  raceGroup: RaceGroup,
  group: RegistrationChannel,
  now: Clock,
  english = false,
) {
  const t = language(english);
  if (channelStatus(race, raceGroup, group, now) !== "unknown") return null;
  if (race.status === "postponed")
    return t(
      "賽事已延期，報名安排待重新確認。",
      "The race has been postponed. Entry arrangements await confirmation.",
    );
  const current = clockTime(now).getTime();
  const opening =
    group.registrationOpensAt ??
    (group.registrationStart ? `${group.registrationStart}T00:00:00+08:00` : undefined);
  if (group.status === "upcoming" && opening && current >= Date.parse(opening))
    return t(
      "已到預告開放時間，實際報名狀態待確認。",
      "The advertised opening time has passed. Entry status is unconfirmed.",
    );
  if (!group.registrationVerifiedAt)
    return t(
      "尚未完成報名資料核對，請查看官方最新安排。",
      "Entry information is unverified. Check the organiser’s latest arrangements.",
    );
  const checked = Date.parse(group.registrationVerifiedAt);
  if (!Number.isFinite(checked) || checked > current)
    return t(
      "報名核對時間有待確認，請查看官方最新安排。",
      "The verification time is unconfirmed. Check the organiser’s latest arrangements.",
    );
  if (registrationIsStale(race, group, now))
    return t(
      "上次報名狀態核對已超過 72 小時，請向大會確認。",
      "Entry status was last checked more than 72 hours ago. Confirm with the organiser.",
    );
  return t(
    "已查看來源，但尚未能確認此組別及渠道的報名狀態。",
    "The available sources do not confirm entry status for this category and channel.",
  );
}
