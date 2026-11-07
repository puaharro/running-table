import { validTimestamp } from "./catalog";
import { clockTime, hongKongToday, validDate, type Clock } from "./races";
import type { Race, RaceGroup, RegistrationChannel } from "./types";

// A fixed deadline can be verified even when live availability is unknown.
export function verifiedRegistrationDeadline(
  race: Race,
  group: RaceGroup,
  channel: RegistrationChannel,
  now: Clock,
) {
  if (race.status !== "scheduled" || race.verification === "demo") return null;
  const current = clockTime(now).getTime();
  if (!Number.isFinite(current)) return null;
  const today = hongKongToday(clockTime(now));
  const sources =
    race.sources?.filter(
      (source) =>
        channel.sourceIds.includes(source.id) &&
        source.fields.includes("channels.registration") &&
        validTimestamp(source.checkedAt) &&
        Date.parse(source.checkedAt) <= current,
    ) ?? [];
  if (!sources.length) return null;
  const exact = channel.registrationClosesAt;
  if (
    exact &&
    (!validTimestamp(exact) ||
      (channel.deadline && hongKongToday(new Date(exact)) !== channel.deadline))
  )
    return null;
  const date = exact ?? channel.deadline;
  if (!date || (exact ? Date.parse(exact) <= current : !validDate(date) || date < today))
    return null;
  if ((exact ? hongKongToday(new Date(exact)) : date) > group.date) return null;
  return { date, timed: !!exact, sources };
}
