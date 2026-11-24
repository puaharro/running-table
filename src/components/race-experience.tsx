import { editorialReviews } from "@/data/editorial-reviews";
import { confirmedRaceExperience } from "@/lib/confirmed-race-experience";
import { reviewsForGroup, type EditorialReview } from "@/lib/editorial-reviews";
import { language } from "@/lib/english-races";
import { localRatingAssessment } from "@/lib/local-rating-preview";
import { runnerCopyForRace } from "@/lib/runner-copy";
import type { Race } from "@/lib/types";
import { RaceConfirmedExperience } from "./confirmed-race-experience";
import { RaceRatingAssessmentPreview } from "./race-rating-assessment-preview";
import { EditorialReviewCard } from "./group-ratings";
import { RaceRunnerCopy } from "./race-runner-copy";
import { UnscopedRunnerOpinions } from "./runner-opinions";

export function raceExperience(race: Race, english: boolean) {
  const t = language(english);
  const runnerCopy = runnerCopyForRace(race.id, Number(race.date.slice(0, 4)));
  const confirmed = confirmedRaceExperience(race.id);
  const ratingAssessment = localRatingAssessment(race.id);
  const chapters: { id: string; label: string }[] = [];
  let overviewLabel: string;
  let reviewAnchor: string | undefined;
  let laterReview: EditorialReview | undefined;

  if (confirmed) {
    const group = race.groups.find(({ id }) => id === confirmed.groupId);
    if (group) {
      const { current, historical } = reviewsForGroup(race, group, editorialReviews);
      const review = [...current, ...historical].find(
        ({ editionYear }) => editionYear === confirmed.year,
      );
      if (!runnerCopy) {
        laterReview = [...current, ...historical].find(
          ({ editionYear }) => editionYear > confirmed.year,
        );
      }
      if (review) reviewAnchor = `review-${review.id}`;
    }
  }

  if (runnerCopy || laterReview) {
    chapters.push({
      id: runnerCopy ? "runner-copy" : "runner-account-latest",
      label: t("跑手分享", "Runner accounts"),
    });
    overviewLabel = t("跑手分享", "Runner accounts");
  } else {
    const reviewedGroup = confirmed
      ? undefined
      : race.groups.find((group) => {
          const { current, historical } = reviewsForGroup(race, group, editorialReviews);
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
    chapters,
    overviewHref: `#${chapters[0].id}`,
    overviewLabel,
    runnerCopy,
    confirmed,
    ratingAssessment,
    reviewAnchor,
    laterReview,
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
  const { runnerCopy, confirmed, ratingAssessment, reviewAnchor, laterReview } = experience;
  const currentYear = race.date.slice(0, 4);
  const t = language(english);
  const latestId = runnerCopy ? "runner-copy" : "runner-account-latest";
  return (
    <>
      {ratingAssessment && <RaceRatingAssessmentPreview draft={ratingAssessment} />}
      {confirmed && (runnerCopy || laterReview) ? (
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
          <div className="runner-account-current">
            {runnerCopy ? (
              <RaceRunnerCopy english={english} copy={runnerCopy} embedded />
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
          {runnerCopy && <RaceRunnerCopy english={english} copy={runnerCopy} />}
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
