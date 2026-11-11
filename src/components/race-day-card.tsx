import { raceAnnouncementTitles, verifiedStarts } from "@/lib/race-day";
import { displayDate, formatTimestamp } from "@/lib/races";
import type { Race } from "@/lib/types";

function dateLabel(date: string) {
  return displayDate(date, { year: "numeric" });
}

export function RaceDayCard({ race }: { race: Race }) {
  const starts = verifiedStarts(race);
  const commonStart = starts.find((start) => !start.names.length);
  return (
    <section className="race-day-card" id="race-day-card" aria-labelledby="race-day-card-title">
      <header className="race-day-card-heading">
        <h2 id="race-day-card-title">賽日速查</h2>
        <p>{race.name}</p>
        {race.announcement && (
          <p className="race-day-card-notice">
            {raceAnnouncementTitles[race.announcement.kind]} · {race.announcement.summary}
          </p>
        )}
        {!race.announcement && (race.status === "cancelled" || race.status === "postponed") && (
          <p className="race-day-card-notice">{raceAnnouncementTitles[race.status]}</p>
        )}
        <p>
          <time dateTime={race.date}>{dateLabel(race.date)}</time>
          {race.endDate !== race.date && (
            <>
              {" "}
              至 <time dateTime={race.endDate}>{dateLabel(race.endDate)}</time>
            </>
          )}
        </p>
      </header>
      <dl className="race-day-card-groups">
        {race.groups.map((group) => {
          const start = starts.find((item) => item.groupIds.includes(group.id)) ?? commonStart;
          return (
            <div key={group.id}>
              <dt>{group.name}</dt>
              <dd>
                {(group.date !== race.date || group.endDate || group.startTime) && (
                  <span>
                    {group.startTime ? (
                      <time dateTime={group.startTime}>{formatTimestamp(group.startTime)} HKT</time>
                    ) : (
                      <time dateTime={group.date}>{dateLabel(group.date)}</time>
                    )}
                    {group.endDate && group.endDate !== group.date && (
                      <>
                        {" "}
                        至 <time dateTime={group.endDate}>{dateLabel(group.endDate)}</time>
                      </>
                    )}
                  </span>
                )}
                <span>{start?.venue ?? "起點待核實"}</span>
              </dd>
            </div>
          );
        })}
      </dl>
      <footer className="race-day-card-footer">
        <a href="#race-transport">交通及集合詳情 ↘</a>
      </footer>
    </section>
  );
}
