import { Icon } from "./ui";
import {
  raceAnnouncementTitles,
  racePdfFilename,
  racePdfHref,
  verifiedStarts,
} from "@/lib/race-day";
import { formatTimestamp } from "@/lib/races";
import type { Race } from "@/lib/types";

export function RaceAnnouncement({ race }: { race: Race }) {
  const notice = race.announcement;
  const source = race.sources?.find((item) => item.id === notice?.sourceId);
  if (!notice || !source) return null;
  return (
    <aside className="race-announcement" aria-label="賽事變更公告">
      <strong>{raceAnnouncementTitles[notice.kind]}</strong>
      <p>{notice.summary}</p>
      <div>
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          官方公告 ↗
        </a>
        <time dateTime={source.checkedAt}>核對：{formatTimestamp(source.checkedAt)} HKT</time>
      </div>
    </aside>
  );
}

export function RaceDayInformation({ race }: { race: Race }) {
  const starts = verifiedStarts(race);
  return (
    <>
      {!!starts.length && (
        <ul className="race-start-points">
          {starts.map(({ venue, names, sources }) => (
            <li key={venue}>
              <Icon name="pin" size={20} />
              <div>
                <strong>{venue}</strong>
                {!!names.length && <small>{names.join("／")}</small>}
                <div className="race-start-links">
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${venue} 香港`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`在地圖搜尋${venue}（另開分頁）`}
                  >
                    開啟地圖 ↗
                  </a>
                  {sources.map((source) => (
                    <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.title} ↗
                    </a>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p>{race.transport}</p>
      <a className="button" href={racePdfHref(race)} download={racePdfFilename(race)}>
        儲存 PDF
      </a>
    </>
  );
}
