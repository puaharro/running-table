import { clockTime, channelStatus, registrationIsStale, type Clock } from "./races";
import type { Race, RaceGroup, RegistrationChannel } from "./types";

export function registrationUncertaintyReason(
  race: Race,
  raceGroup: RaceGroup,
  group: RegistrationChannel,
  now: Clock,
) {
  if (channelStatus(race, raceGroup, group, now) !== "unknown") return null;
  if (race.status === "postponed") return "賽事已延期，報名安排待重新確認。";
  const current = clockTime(now).getTime();
  const opening =
    group.registrationOpensAt ??
    (group.registrationStart ? `${group.registrationStart}T00:00:00+08:00` : undefined);
  if (group.status === "upcoming" && opening && current >= Date.parse(opening))
    return "已到預告開放時間，實際報名狀態待確認。";
  if (!group.registrationVerifiedAt) return "尚未完成報名資料核對，請查看官方最新安排。";
  const checked = Date.parse(group.registrationVerifiedAt);
  if (!Number.isFinite(checked) || checked > current)
    return "報名核對時間有待確認，請查看官方最新安排。";
  if (registrationIsStale(race, group, now))
    return "上次報名狀態核對已超過 72 小時，請向大會確認。";
  return "已查看來源，但尚未能確認此組別及渠道的報名狀態。";
}
