import { editorialReviews } from "@/data/editorial-reviews";
import { confirmedRaceExperience } from "./confirmed-race-experience";
import { reviewsForGroup, type EditorialReview } from "./editorial-reviews";
import { runnerCopyForRace } from "./runner-copy";
import type { Race } from "./types";

export function publishedReviewsForGroup(race: Race, group: Race["groups"][number]) {
  return reviewsForGroup(race, group, editorialReviews);
}

export function publishedRaceExperience(race: Race) {
  const runnerCopy = runnerCopyForRace(race.id, Number(race.date.slice(0, 4)));
  const confirmed = confirmedRaceExperience(race.id);
  const runnerCopyGroup =
    race.groups.find(({ id }) => id === runnerCopy?.groupId) ??
    (runnerCopy && !runnerCopy.groupId && race.groups.length === 1 ? race.groups[0] : undefined);
  const combinedRunnerCopy = runnerCopyGroup?.id === confirmed?.groupId ? runnerCopy : null;
  let reviewAnchor: string | undefined;
  let laterReview: EditorialReview | undefined;

  if (confirmed) {
    const group = race.groups.find(({ id }) => id === confirmed.groupId);
    if (group) {
      const { current, historical } = publishedReviewsForGroup(race, group);
      const review = [...current, ...historical].find(
        ({ editionYear }) => editionYear === confirmed.year,
      );
      if (!combinedRunnerCopy) {
        laterReview = [...current, ...historical].find(
          ({ editionYear }) => editionYear > confirmed.year,
        );
      }
      if (review) reviewAnchor = `review-${review.id}`;
    }
  }

  return { runnerCopy, runnerCopyGroup, combinedRunnerCopy, confirmed, reviewAnchor, laterReview };
}
