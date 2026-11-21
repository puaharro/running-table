import { editorialReviews } from "@/data/editorial-reviews";
import { confirmedRaceExperience } from "@/lib/confirmed-race-experience";
import { reviewsForGroup } from "@/lib/editorial-reviews";
import { language } from "@/lib/english-races";
import { localRatingAssessment } from "@/lib/local-rating-preview";
import { runnerCopyForRace } from "@/lib/runner-copy";
import type { Race } from "@/lib/types";
import { RaceConfirmedExperience } from "./confirmed-race-experience";
import { RaceRatingAssessmentPreview } from "./race-rating-assessment-preview";
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

  if (runnerCopy) {
    chapters.push({ id: "runner-copy", label: t("跑手分享", "Runner accounts") });
    overviewLabel = t("跑手分享（無評分）", "Runner accounts (unrated)");
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
      : reviewedGroup
        ? t("參賽體驗", "Race experience")
        : t("參賽體驗（未評）", "Race experience (unrated)");
  }

  if (confirmed) {
    if (runnerCopy) {
      chapters.push({
        id: "race-confirmed-experience",
        label: t(`${confirmed.year} 往屆體驗`, `${confirmed.year} race experience`),
      });
    }
    const group = race.groups.find(({ id }) => id === confirmed.groupId);
    if (group) {
      const { current, historical } = reviewsForGroup(race, group, editorialReviews);
      const review = [...current, ...historical].find(
        ({ editionYear }) => editionYear === confirmed.year,
      );
      if (review) reviewAnchor = `review-${review.id}`;
    }
  }

  return {
    chapters,
    overviewHref: `#${chapters[0].id}`,
    overviewLabel,
    runnerCopy,
    confirmed,
    ratingAssessment,
    reviewAnchor,
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
  const { runnerCopy, confirmed, ratingAssessment, reviewAnchor } = experience;
  return (
    <>
      {ratingAssessment && <RaceRatingAssessmentPreview draft={ratingAssessment} />}
      {runnerCopy && <RaceRunnerCopy english={english} copy={runnerCopy} />}
      {confirmed ? (
        <RaceConfirmedExperience
          english={english}
          experience={confirmed}
          currentYear={race.date.slice(0, 4)}
          reviewAnchor={reviewAnchor}
        />
      ) : (
        <UnscopedRunnerOpinions english={english} race={race} />
      )}
    </>
  );
}
