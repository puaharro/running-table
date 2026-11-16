import { RaceDataText } from "./race-data-text";
import { language, englishTimestamp, localPath } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { Icon } from "./ui";
import {
  raceAnnouncementTitles,
  racePdfFilename,
  racePdfHref,
  verifiedStarts,
} from "@/lib/race-day";
import { formatTimestamp } from "@/lib/races";
import type { Race } from "@/lib/types";

export function RaceAnnouncement({ race, english = false }: { race: Race; english?: boolean }) {
  const t = language(english);
  const notice = race.announcement;
  const source = race.sources?.find((item) => item.id === notice?.sourceId);
  if (!notice || !source) return null;
  return (
    <aside className="race-announcement" aria-label={t("賽事變更公告", "Race update")}>
      <strong>{englishRaceTerm(raceAnnouncementTitles[notice.kind], english)}</strong>
      <p>
        <RaceDataText value={notice.summary} english={english} />
      </p>
      <div>
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          {t("官方公告 ↗", "Official announcement ↗")}
        </a>
        <time dateTime={source.checkedAt}>
          {t("核對：", "Checked:")}
          {english
            ? englishTimestamp(source.checkedAt)
            : `${formatTimestamp(source.checkedAt)} HKT`}
        </time>
      </div>
    </aside>
  );
}

export function RaceDayInformation({ race, english = false }: { race: Race; english?: boolean }) {
  const t = language(english);
  const starts = verifiedStarts(race);
  return (
    <>
      {!!starts.length && (
        <ul className="race-start-points">
          {starts.map(({ venue, names, sources }) => (
            <li key={englishRaceTerm(venue, english)}>
              <Icon name="pin" size={20} />
              <div>
                <strong>{englishRaceTerm(venue, english)}</strong>
                {!!names.length && (
                  <small>
                    {names
                      .map((name) => englishRaceTerm(name, english))
                      .join(english ? " / " : "／")}
                  </small>
                )}
                <div className="race-start-links">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${englishRaceTerm(venue, english)} 香港`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t(
                      `在地圖搜尋${venue}（另開分頁）`,
                      `Find ${englishRaceTerm(venue, true)} on the map (new tab)`,
                    )}
                  >
                    {t("開啟地圖 ↗", "Open map ↗")}
                  </a>
                  {sources.map((source) => (
                    <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">
                      <RaceDataText value={source.title} english={english} /> ↗
                    </a>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p>
        <RaceDataText value={race.transport} english={english} />
      </p>
      <a
        className="button"
        href={localPath(racePdfHref(race), english)}
        download={racePdfFilename(race)}
      >
        {t("儲存 PDF", "Download PDF")}
      </a>
    </>
  );
}
