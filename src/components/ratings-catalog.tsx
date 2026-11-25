import { language, localPath } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { publishedRaceExperience, publishedReviewsForGroup } from "@/lib/published-race-experience";
import { raceHref } from "@/lib/site";
import type { Race } from "@/lib/types";

interface Edition {
  year: number;
  anchor: string;
  reviewIds: string[];
}

function runnerAccountRows(races: Race[]) {
  return races.flatMap((race) => {
    const { runnerCopy, runnerCopyGroup, confirmed } = publishedRaceExperience(race);
    const raceYear = Number(race.date.slice(0, 4));
    const groups = race.groups.map((group) => {
      const editions = new Map<number, Edition>();
      const { current, historical } = publishedReviewsForGroup(race, group);
      for (const review of [...current, ...historical]) {
        const edition = editions.get(review.editionYear) ?? {
          year: review.editionYear,
          anchor: "review-" + review.id,
          reviewIds: [],
        };
        edition.reviewIds.push(review.id);
        editions.set(review.editionYear, edition);
      }
      if (confirmed?.groupId === group.id) {
        editions.set(confirmed.year, {
          year: confirmed.year,
          anchor: "race-confirmed-experience",
          reviewIds: editions.get(confirmed.year)?.reviewIds ?? [],
        });
      }
      if (runnerCopy && runnerCopyGroup?.id === group.id) {
        editions.set(raceYear, {
          year: raceYear,
          anchor: "runner-copy",
          reviewIds: editions.get(raceYear)?.reviewIds ?? [],
        });
      }
      return { race, group, editions: [...editions.values()].sort((a, b) => b.year - a.year) };
    });
    if (!runnerCopy || runnerCopyGroup) return groups;
    return [
      ...groups,
      { race, group: null, editions: [{ year: raceYear, anchor: "runner-copy", reviewIds: [] }] },
    ];
  });
}

export function RunnerAccountsCatalog({
  races,
  english = false,
}: {
  races: Race[];
  english?: boolean;
}) {
  const t = language(english);
  const rows = runnerAccountRows(races);
  const published = rows
    .filter((row) => row.editions.length)
    .sort(
      (a, b) => b.editions[0].year - a.editions[0].year || b.race.date.localeCompare(a.race.date),
    );
  const empty = rows.filter((row) => !row.editions.length);
  return (
    <>
      {published.length ? (
        <ul className="ratings-account-list">
          {published.map(({ race, group, editions }) => {
            const name = (english ? race.englishName : race.name).replace(
              / \d{4}(?: — 主賽事)?$/,
              "",
            );
            const category = group
              ? englishRaceTerm(group.name, english)
              : t("賽事整體", "Race-wide");
            return (
              <li key={race.id + "/" + (group?.id ?? "")}>
                <div>
                  <h3>{name}</h3>
                  <span>{category}</span>
                </div>
                <ul>
                  {editions.map(({ year, anchor, reviewIds }) => (
                    <li key={year}>
                      {reviewIds.map((id) => (
                        <span key={id} id={"index-" + id} />
                      ))}
                      <a
                        href={localPath(raceHref(race) + "#" + anchor, english)}
                        aria-label={[name, category, year].join(" · ")}
                      >
                        {year}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>{t("尚未有已發布分享。", "No runner accounts have been published yet.")}</p>
      )}
      {!!empty.length && (
        <details className="ratings-coverage" id="edition-coverage">
          <summary>{t("暫無分享嘅組別", "Categories without runner accounts")}</summary>
          <ul className="ratings-empty-groups">
            {empty.map(
              ({ race, group }) =>
                group && (
                  <li key={race.id + "/" + group.id}>
                    <a href={localPath(raceHref(race) + "#ratings-" + group.id, english)}>
                      {english ? race.englishName : race.name} ·{" "}
                      {englishRaceTerm(group.name, english)}
                    </a>
                  </li>
                ),
            )}
          </ul>
        </details>
      )}
    </>
  );
}
