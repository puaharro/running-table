import { localPath } from "./english-races";
import { englishRaceTerm } from "./race-terms.en";
import type { Race } from "./types";
import { raceHref } from "./site";

export function raceStructuredData(race: Race, origin?: string, english = false) {
  if (
    !origin ||
    race.verification !== "verified" ||
    race.publication !== "published" ||
    !race.region
  )
    return null;
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: english ? race.englishName : race.name,
    description: englishRaceTerm(race.summary, english),
    startDate: race.date,
    endDate: race.endDate,
    eventStatus: `https://schema.org/${race.status === "cancelled" ? "EventCancelled" : race.status === "postponed" ? "EventPostponed" : "EventScheduled"}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: new URL(localPath(raceHref(race), english), origin).toString(),
    sameAs: race.sourceUrl,
    location: {
      "@type": "Place",
      name: englishRaceTerm(race.venue, english),
      address: {
        "@type": "PostalAddress",
        addressLocality: englishRaceTerm(race.district, english),
        addressRegion: "Hong Kong",
        addressCountry: "HK",
      },
    },
  };
}
export function safeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
