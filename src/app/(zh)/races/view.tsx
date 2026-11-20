import "./calendar.css";
import "./race-filter-panel.css";
import Link from "next/link";
import { englishDate, language, localPath } from "@/lib/english-races";
import { displayDate } from "@/lib/races";
import { raceHref } from "@/lib/site";
import { RaceExplorer } from "@/components/race-explorer";
import { publicRaces as races } from "@/data/races";
import { editorialReviews } from "@/data/editorial-reviews";

const racesByYear = Map.groupBy(
  [...races].sort((first, second) => second.date.localeCompare(first.date)),
  (race) => race.date.slice(0, 4),
);

export function RaceSearchView({ english = false }: { english?: boolean }) {
  const t = language(english);
  return (
    <main id="main" className="search-page">
      <RaceExplorer
        english={english}
        races={races}
        reviews={editorialReviews}
        initialNow={new Date().toISOString()}
      />
      <details id="race-directory" className="shell race-directory">
        <summary>{t("全部賽事及往屆紀錄", "All races and past editions")}</summary>
        {Array.from(racesByYear, ([year, entries]) => (
          <section key={year} aria-labelledby={`race-directory-${year}`}>
            <h2 id={`race-directory-${year}`}>{year}</h2>
            <ul>
              {entries.map((race) => (
                <li key={race.id}>
                  <Link href={localPath(raceHref(race), english)}>
                    {english ? race.englishName : race.name}
                  </Link>
                  <time dateTime={race.date}>
                    {english ? englishDate(race.date) : displayDate(race.date)}
                  </time>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </details>
    </main>
  );
}
