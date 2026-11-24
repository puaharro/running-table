import { language } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import type { RunnerCopySection } from "@/lib/runner-copy";

export function RunnerAccountTopics({
  sections,
  english,
}: {
  sections: RunnerCopySection[];
  english: boolean;
}) {
  const t = language(english);
  const urls = [...new Set(sections.flatMap((s) => s.urls))];
  return (
    <>
      {sections.map((s) => (
        <details key={s.topic} className="experience-topic">
          <summary>
            <strong>{englishRaceTerm(s.topic, english)}</strong>
            <span className="experience-topic-excerpt" lang={english ? "zh-HK" : undefined}>
              {s.body.match(/^.*?[。！？]/)?.[0] ?? s.body}
            </span>
            {s.body.includes("未知") && !s.body.startsWith("未知") && (
              <small>{t("部分未知", "Partly unverified")}</small>
            )}
          </summary>
          <div className="experience-topic-content">
            <p lang={english ? "zh-HK" : undefined}>{s.body}</p>
            <p>
              <strong>{t("觀察限制：", "Observation limits: ")}</strong>
              <span lang={english ? "zh-HK" : undefined}>{s.limitations}</span>
            </p>
            <p>
              {s.urls.length
                ? s.urls.map((url) => (
                    <span key={url}>
                      <a href={url} target="_blank" rel="noopener noreferrer">
                        {t("來源", "Source ")}
                        {urls.indexOf(url) + 1} ↗
                      </a>{" "}
                    </span>
                  ))
                : t(
                    "來源：未知／原始公開連結未提供",
                    "Source unknown. No public link was provided.",
                  )}
            </p>
          </div>
        </details>
      ))}
    </>
  );
}
