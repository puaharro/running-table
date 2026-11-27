import { language } from "@/lib/english-races";
import { englishRaceTerm } from "@/lib/race-terms.en";
import type { RunnerCopySection } from "@/lib/runner-copy";

export function RunnerAccountEdition({
  year,
  group,
  currentYear,
  context,
  english,
}: {
  year: number;
  group?: string;
  currentYear?: number;
  context?: string;
  english: boolean;
}) {
  const t = language(english);
  const parts = [t(`${year} 年`, String(year))];
  if (group) parts.push(englishRaceTerm(group, english));
  if (context) parts.push(context);
  if (english) parts.push("Original accounts in Chinese.");
  if (currentYear !== undefined && year < currentYear) {
    parts.push(
      t(
        `往屆體驗，不代表 ${currentYear} 年安排或表現。`,
        `Past edition. Arrangements and experience may differ in ${currentYear}.`,
      ),
    );
  }
  return <p className="review-edition-note">{parts.join(" · ")}</p>;
}

export function RunnerAccountHelp({ english }: { english: boolean }) {
  return (
    <p className="experience-help">
      {language(english)(
        "展開各主題，即可查閱全文、來源及觀察限制。",
        "Expand a topic to read the full account, sources and observation limits.",
      )}
    </p>
  );
}

function AccountParagraph({ text, english }: { text: string; english: boolean }) {
  // Insert visual breaks between sentences while retaining every character of the approved copy.
  const chunks = text.match(/[^。！？]*[。！？]+|[^。！？]+$/g) ?? [text];
  const paragraphs: string[] = [];
  let paragraph = "";
  for (const chunk of chunks) {
    paragraph += chunk;
    if (paragraph.trim().length >= 90) {
      paragraphs.push(paragraph);
      paragraph = "";
    }
  }
  if (paragraph) paragraphs.push(paragraph);
  return (
    <span lang={english ? "zh-HK" : undefined}>
      {paragraphs.map((part, index) => (
        <span key={index} className="experience-text-paragraph">
          {part}
        </span>
      ))}
    </span>
  );
}

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
            <p>
              <AccountParagraph text={s.body} english={english} />
            </p>
            <p>
              <strong>{t("觀察限制：", "Observation limits: ")}</strong>
              <AccountParagraph text={s.limitations} english={english} />
            </p>
            <p className="experience-sources">
              <strong>{t("來源：", "Sources: ")}</strong>
              {s.urls.length
                ? s.urls.map((url, i) => {
                    const sourceLabel = s.sourceLabels?.[i] ?? `來源${urls.indexOf(url) + 1}`;
                    return (
                      <span key={s.sourceLabels?.[i] ?? url}>
                        {i > 0 && " · "}
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          {english ? sourceLabel.replace(/^來源/, "Source ") : sourceLabel} ↗
                        </a>
                      </span>
                    );
                  })
                : t(
                    s.missingSources?.replace(/^來源：/, "") ?? "未知／原始公開連結未提供",
                    "Unknown. No public link was provided.",
                  )}
            </p>
          </div>
        </details>
      ))}
    </>
  );
}
