import { language } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import type { ConfirmedRaceExperience } from "@/lib/confirmed-race-experience";
import {
  RunnerAccountEdition,
  RunnerAccountHelp,
  RunnerAccountTopics,
} from "./runner-account-topics";
import { ratingDimensions, ratingPolicy } from "@/lib/rating-policy";

export function RaceConfirmedExperience({
  experience: e,
  currentYear,
  reviewAnchor,
  english = false,
  embedded = false,
}: {
  experience: ConfirmedRaceExperience;
  currentYear: string;
  reviewAnchor?: string;
  english?: boolean;
  embedded?: boolean;
}) {
  const t = language(english);
  return (
    <section
      id="race-confirmed-experience"
      className={embedded ? "experience-compact" : "race-runner-copy experience-compact"}
      tabIndex={-1}
    >
      {reviewAnchor && <span id={reviewAnchor} aria-hidden="true" />}
      <h2 className={embedded ? "sr-only" : undefined}>{t("跑手分享", "Runner accounts")}</h2>
      <RunnerAccountEdition
        english={english}
        year={e.year}
        group={e.group}
        currentYear={Number(currentYear)}
      />
      {!embedded && <RunnerAccountHelp english={english} />}
      <div className="runner-copy-body experience-topics">
        <details className="experience-topic experience-written-review">
          <summary>{t("參賽評論及依據", "Race experience review and evidence")}</summary>
          <div className="runner-copy-body">
            {ratingDimensions.map((key) => {
              const a = e.assessments[key];
              return (
                <section key={key}>
                  <h3 data-rating-dimension={key}>
                    {englishRaceTerm(ratingPolicy.dimensions[key].title, english)}{" "}
                    {t("· 完整評語", "· Full comments")}
                  </h3>
                  <p lang={english ? "zh-HK" : undefined}>{a.comment}</p>
                  {!!a.positives.length && (
                    <p>
                      {t("優點：", "Strengths: ")}
                      <span lang={english ? "zh-HK" : undefined}>{a.positives.join("；")}</span>
                    </p>
                  )}
                  {!!a.concerns.length && (
                    <p>
                      {t("關注：", "Concerns: ")}
                      <span lang={english ? "zh-HK" : undefined}>{a.concerns.join("；")}</span>
                    </p>
                  )}
                  <p>
                    {t("適用範圍：", "Scope: ")}
                    <span lang={english ? "zh-HK" : undefined}>{a.suitedFor}</span>
                  </p>
                  <p>
                    {t("依據及限制：", "Evidence and limitations: ")}
                    <span lang={english ? "zh-HK" : undefined}>{a.basis}</span>
                  </p>
                </section>
              );
            })}
            <p>
              {t("準則版本：", "Criteria version: ")}
              {e.ruleVersion}
            </p>
          </div>
        </details>
        <RunnerAccountTopics sections={e.sections} english={english} />
      </div>
    </section>
  );
}
