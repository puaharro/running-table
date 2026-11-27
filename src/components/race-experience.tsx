import { publishedRaceExperience, publishedReviewsForGroup } from "@/lib/published-race-experience";
import { language } from "@/lib/english-races";
import { localRatingAssessment } from "@/lib/local-rating-preview";
import type { Race } from "@/lib/types";
import { RaceConfirmedExperience } from "./confirmed-race-experience";
import { RaceRatingAssessmentPreview } from "./race-rating-assessment-preview";
import { EditorialReviewCard } from "./group-ratings";
import { RaceRunnerCopy } from "./race-runner-copy";
import { RunnerAccountHelp } from "./runner-account-topics";
import { UnscopedRunnerOpinions } from "./runner-opinions";

export function raceExperience(race: Race, english: boolean) {
  const t = language(english);
  const published = publishedRaceExperience(race);
  const { runnerCopy, combinedRunnerCopy, confirmed, laterReview } = published;
  const chapters: { id: string; label: string }[] = [];
  let overviewLabel: string;
  if (runnerCopy || laterReview) {
    chapters.push({
      id: combinedRunnerCopy || !laterReview ? "runner-copy" : "runner-account-latest",
      label: t("跑手分享", "Runner accounts"),
    });
    overviewLabel = t("跑手分享", "Runner accounts");
  } else {
    const reviewedGroup = confirmed
      ? undefined
      : race.groups.find((group) => {
          const { current, historical } = publishedReviewsForGroup(race, group);
          return current.length || historical.length;
        });
    chapters.push({
      id: confirmed
        ? "race-confirmed-experience"
        : `ratings-${(reviewedGroup ?? race.groups[0]).id}`,
      label: t("參賽體驗", "Race experience"),
    });
    overviewLabel = confirmed
      ? t(`${confirmed.year} 往屆體驗`, `${confirmed.year} race experience`)
      : t("參賽體驗", "Race experience");
  }

  return {
    ...published,
    chapters,
    overviewHref: `#${chapters[0].id}`,
    overviewLabel,
    ratingAssessment: localRatingAssessment(race.id),
  };
}

export function RaceExperienceSections({
  race,
  english,
  experience,
}: {
  race: Race;
  english: boolean;
  experience: ReturnType<typeof raceExperience>;
}) {
  const {
    runnerCopy,
    runnerCopyGroup,
    combinedRunnerCopy,
    confirmed,
    ratingAssessment,
    reviewAnchor,
    laterReview,
  } = experience;
  const currentYear = race.date.slice(0, 4);
  const t = language(english);
  const latestId = combinedRunnerCopy ? "runner-copy" : "runner-account-latest";
  return (
    <>
      {ratingAssessment && <RaceRatingAssessmentPreview draft={ratingAssessment} />}
      {runnerCopy && !combinedRunnerCopy && (
        <RaceRunnerCopy
          english={english}
          copy={runnerCopy}
          year={currentYear}
          group={runnerCopyGroup?.name}
          groupId={runnerCopyGroup?.id}
        />
      )}
      {confirmed && (combinedRunnerCopy || laterReview) ? (
        <section
          className="race-runner-copy runner-account-editions"
          aria-labelledby="runner-account-editions-title"
        >
          <header className="runner-account-editions-header">
            <h2 id="runner-account-editions-title">{t("跑手分享", "Runner accounts")}</h2>
            <nav aria-label={t("選擇跑手分享年份", "Choose race edition")}>
              <a className="runner-account-current-link" href={"#" + latestId}>
                {laterReview?.editionYear ?? currentYear}
              </a>
              <a className="runner-account-past-link" href="#race-confirmed-experience">
                {confirmed.year}
              </a>
            </nav>
          </header>
          <RunnerAccountHelp english={english} />
          <div className="runner-account-current">
            {combinedRunnerCopy ? (
              <RaceRunnerCopy
                english={english}
                copy={combinedRunnerCopy}
                year={currentYear}
                group={runnerCopyGroup?.name}
                groupId={runnerCopyGroup?.id}
                embedded
              />
            ) : laterReview ? (
              <div id={latestId} tabIndex={-1}>
                {laterReview.editionYear < Number(currentYear) && (
                  <p className="review-edition-note">
                    {t(
                      "往屆體驗，不代表 " + currentYear + " 年安排或表現。",
                      "Past edition. The " +
                        currentYear +
                        " arrangements and experience may differ.",
                    )}
                  </p>
                )}
                <EditorialReviewCard english={english} review={laterReview} />
              </div>
            ) : null}
          </div>
          <div className="runner-account-past">
            <RaceConfirmedExperience
              english={english}
              experience={confirmed}
              currentYear={currentYear}
              reviewAnchor={reviewAnchor}
              embedded
            />
          </div>
        </section>
      ) : (
        <>
          {confirmed ? (
            <RaceConfirmedExperience
              english={english}
              experience={confirmed}
              currentYear={currentYear}
              reviewAnchor={reviewAnchor}
            />
          ) : (
            <UnscopedRunnerOpinions english={english} race={race} />
          )}
        </>
      )}
    </>
  );
}
