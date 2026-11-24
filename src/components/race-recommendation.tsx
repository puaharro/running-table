import { language } from "@/lib/english-races";
import type { Race, RaceGroup } from "@/lib/types";

const bridgeHalf2026 = {
  raceId: "hzmb-half-marathon-2026",
  groupId: "hzmb-2026-half",
  year: 2026,
  source: "Marathon’s World",
  ratings: [
    { stars: 3, runners: 1 },
    { stars: 4, runners: 12 },
  ],
  interpretedReview: {
    stars: 4,
    runners: 1,
    url: "https://www.youtube.com/watch?v=_In8246hZPA",
  },
};
const minimumRunners = 5;
const starPath = "M10 1.5 12.6 7l6 .8-4.4 4.3 1 6-5.2-2.8-5.2 2.8 1-6L1.4 7.8l6-.8Z";

export function RaceRecommendation({
  race,
  groups,
  english,
  compact = false,
}: {
  race: Race;
  groups: RaceGroup[];
  english: boolean;
  compact?: boolean;
}) {
  const { raceId, groupId, year, source, ratings, interpretedReview } = bridgeHalf2026;
  if (race.id !== raceId || !groups.some((group) => group.id === groupId)) return null;

  const t = language(english);
  const runners = ratings.reduce((total, rating) => total + rating.runners, 0);
  const average =
    ratings.reduce((total, rating) => total + rating.stars * rating.runners, 0) / runners;
  const stars = Math.round(average * 2) / 2;
  const scoreLabel = `${average.toFixed(1)}/5 ${t("星", "stars")}`;

  const starDisplay = (
    <span className="race-recommendation-stars" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, stars - index));
        return (
          <svg key={index} viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
            <path d={starPath} fill="none" stroke="currentColor" strokeWidth="1.2" />
            {fill > 0 && (
              <svg width={20 * fill} height="20" overflow="hidden">
                <path d={starPath} fill="currentColor" />
              </svg>
            )}
          </svg>
        );
      })}
    </span>
  );

  if (compact) {
    return runners >= minimumRunners ? (
      <div className="calendar-recommendation-compact">
        {starDisplay}
        <strong>
          <span className="sr-only">{t("推薦指數", "Recommendation score")} </span>
          {scoreLabel}
        </strong>
      </div>
    ) : null;
  }

  return (
    <div className="race-recommendation">
      <div className="race-recommendation-primary">
        <strong>{t("推薦指數", "Recommendation score")}</strong>
        {runners >= minimumRunners ? (
          <>
            {starDisplay}
            <strong>{scoreLabel}</strong>
          </>
        ) : (
          <span>
            {t("評分累積中", "Collecting ratings")} · {runners}/{minimumRunners}
          </span>
        )}
        <span className="race-recommendation-source">
          {source} · {runners} {t("位跑手", "runners")} · {year} {t("半馬組", "half marathon")}
        </span>
      </div>
      <p className="race-recommendation-source">
        {t("文字推算", "Inferred from text")} · {interpretedReview.stars}/5 {t("星", "stars")} ·{" "}
        {interpretedReview.runners} {t("位跑手（樣本不足）", "runner (insufficient sample)")} ·{" "}
        <a href={interpretedReview.url} target="_blank" rel="noopener noreferrer">
          YouTube ↗
        </a>
      </p>
    </div>
  );
}
