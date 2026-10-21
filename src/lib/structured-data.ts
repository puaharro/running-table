import type { Race } from "./types";
import { raceHref } from "./site";

export function raceStructuredData(race: Race, origin?: string) {
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
    name: race.name,
    description: race.summary,
    startDate: race.date,
    endDate: race.endDate,
    eventStatus: `https://schema.org/${race.status === "cancelled" ? "EventCancelled" : race.status === "postponed" ? "EventPostponed" : "EventScheduled"}`,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: new URL(raceHref(race), origin).toString(),
    sameAs: race.sourceUrl,
    location: {
      "@type": "Place",
      name: race.venue,
      address: {
        "@type": "PostalAddress",
        addressLocality: race.district,
        addressRegion: "Hong Kong",
        addressCountry: "HK",
      },
    },
  };
}
export function safeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
