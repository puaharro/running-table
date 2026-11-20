import { englishDate, englishTimestamp } from "@/lib/english-races";
import { displayDate, formatTimestamp } from "@/lib/races";

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
