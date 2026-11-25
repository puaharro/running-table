import type { RegistrationChannel } from "@/lib/types";
import { englishDate, englishTimestamp } from "@/lib/english-races";
import { displayDate, formatTimestamp } from "@/lib/races";

export function RegistrationDeadline({
  channel,
  english = false,
  fallback,
}: {
  channel: RegistrationChannel;
  english?: boolean;
  fallback: string;
}) {
  const deadline = channel.registrationClosesAt ?? channel.deadline;
  if (deadline) return <RegistrationTimestamp value={deadline} english={english} />;
  if (channel.registrationDeadlineCondition === "until-full")
    return english ? "Until full" : "額滿即止";
  return fallback;
}

export function RegistrationTimestamp({
  value,
  english = false,
}: {
  value: string;
  english?: boolean;
}) {
  return (
    <time dateTime={value}>
      {english
        ? value.includes("T")
          ? englishTimestamp(value)
          : englishDate(value)
        : value.includes("T")
          ? `${formatTimestamp(value)} HKT`
          : displayDate(value, { year: "numeric" })}
    </time>
  );
}
