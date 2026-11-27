import { language } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import type { ConfirmedRaceExperience } from "@/lib/confirmed-race-experience";
import { RunnerAccountTopics } from "./runner-account-topics";
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
      <h2 className={embedded ? "sr-only" : undefined}>{english ? "Race experience" : e.title}</h2>
      <p className="review-edition-note">
        {t(
          `${e.year} 年 · ${e.group} · 往屆體驗，不代表 ${currentYear} 年安排或表現。`,
          `${e.year} · ${englishRaceTerm(e.group, true)} · Past edition, with original accounts in Chinese. Arrangements and experience may differ in ${currentYear}.`,
        )}
      </p>
      {!embedded && (
        <>
          <h3 className="experience-topics-heading">{t("跑手分享", "Runner accounts")}</h3>
          <p className="experience-help">
            {t(
              "展開各主題，即可查閱全文、來源及觀察限制。",
              "Expand a topic to read the original account, sources and observation limits.",
            )}
          </p>
        </>
      )}
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
