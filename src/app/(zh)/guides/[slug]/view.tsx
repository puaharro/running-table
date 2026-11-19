import {
  englishDate,
  englishDistance,
  englishDistanceTag,
  language,
  localPath,
} from "@/lib/english-races";
import "../guides.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { englishGuides } from "@/data/guides.en";
import { guideMatchesRace, guides } from "@/data/guides";
import { publicRaces as races } from "@/data/races";
import { AdSlot, Breadcrumb, GuideCard, Icon } from "@/components/ui";
import { RegistrationChecklist } from "@/components/registration-checklist";
import { displayDate, distanceLabel, hongKongToday } from "@/lib/races";
import { pageMetadata, raceHref, siteName } from "@/lib/site";
export const dynamicParams = false;
export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const g = guides.find((g) => g.slug === slug);
  return g ? pageMetadata(g.title, g.description, `/guides/${g.slug}/`) : {};
}
export default async function GuidePage({
  params,
  english = false,
}: Props & { english?: boolean }) {
  const t = language(english);
  const { slug } = await params;
  const original = guides.find((g) => g.slug === slug);
  if (!original) notFound();
  const translation = english ? englishGuides.find((item) => item.slug === slug) : undefined;
  const guide = translation
    ? {
        ...original,
        title: translation.title,
        description: translation.description,
        category: original.category === "報名指南" ? "Registration guide" : "Race selection guide",
        sections: translation.sections.map(([title, paragraph]) => ({
          title,
          paragraphs: [paragraph],
        })),
      }
    : original;
  const today = hongKongToday();
  const related = races
    .filter(
      (race) =>
        race.status === "scheduled" && race.endDate >= today && guideMatchesRace(guide, race),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const searchHref = localPath(
    `/races/${guide.relatedDistance ? `?distance=${encodeURIComponent(guide.relatedDistance)}` : ""}#race-list`,
    english,
  );
  const calendarLabel = guide.relatedDistance
    ? t(
        `查看香港 ${guide.relatedDistance} 賽事時間表`,
        `View Hong Kong ${guide.relatedDistance === "10K" ? "10K" : englishDistanceTag(guide.relatedDistance).toLowerCase()} race calendar`,
      )
    : t("查看完整賽事時間表", "View the full race calendar");
  return (
    <main id="main" className="guides-page guide-article">
      <div className="shell">
        <Breadcrumb
          english={english}
          items={[
            {
              label: t("報名及選賽指南", "Race selection and registration guides"),
              href: "/guides/",
            },
            { label: guide.category },
          ]}
        />
        <Link className="guide-back-link" href={localPath("/guides/", english)}>
          {t("← 返回指南列表", "← Back to guides")}
        </Link>
        <header className="guides-article-heading">
          <h1>{guide.title}</h1>
          <p>{guide.description}</p>
          <div className="guides-byline">
            {english
              ? `${guide.category} · ${guide.readMinutes} min read · By ${siteName} · `
              : `${guide.category}，約 ${guide.readMinutes} 分鐘閱讀。${siteName}編輯整理，原創內容。 `}
            <time dateTime="2026-10-21">{t("2026 年 10 月 21 日", "21 October 2026")}</time>
          </div>
        </header>
        <div className="guides-reading-layout">
          <nav
            id="guide-contents"
            className="guides-toc"
            aria-labelledby="guide-contents-heading"
            tabIndex={-1}
          >
            <h2 id="guide-contents-heading">
              {t("本文目錄", "In this guide")}{" "}
              <span>
                {guide.sections.length} {t("節", "sections")}
              </span>
            </h2>
            <ol>
              {guide.sections.map((section, index) => (
                <li key={section.title}>
                  <a href={`#section-${index + 1}`}>
                    <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <article className="guides-article-body" aria-label={guide.title}>
            {slug === "race-registration-checklist" && <RegistrationChecklist english={english} />}
            {guide.sections.map((section, index) => (
              <section key={section.title} id={`section-${index + 1}`} tabIndex={-1}>
                <h2>
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {index === 1 && <AdSlot />}
              </section>
            ))}
            <a className="guide-return-contents" href="#guide-contents">
              {t("返回目錄 ↑", "Back to contents ↑")}
            </a>
            <div className="guides-article-cta">
              <h2>{t("搜尋下一場賽事", "Find your next race")}</h2>
              <p>
                {t("按日期、距離及地區篩選賽事。", "Filter races by date, distance and region.")}
              </p>
              <Link className="guides-primary-link" href={searchHref}>
                {calendarLabel} <Icon name="arrow" />
              </Link>
              <small>
                {t(
                  "賽事詳情附官方來源與核實時間。",
                  "Race pages list official sources and when they were checked.",
                )}
              </small>
            </div>
          </article>
        </div>
        {!!related.length && (
          <section className="guides-related-races" aria-labelledby="related-races-heading">
            <div className="guides-section-heading">
              <h2 id="related-races-heading">
                {t("即將舉行的相關賽事", "Related upcoming races")}
              </h2>
              <Link href={searchHref}>
                {calendarLabel} <Icon name="arrow" size={16} />
              </Link>
            </div>
            <p>
              {t(
                "報名安排以大會最新資料為準。",
                "Check the organiser’s latest information for entry arrangements.",
              )}
            </p>
            <div className="guides-race-grid">
              {related.map((race) => (
                <Link
                  key={race.id}
                  className="guides-race-card"
                  href={localPath(raceHref(race), english)}
                >
                  <span>
                    <Icon name="calendar" size={16} />
                    <time dateTime={race.date}>
                      {english
                        ? englishDate(race.date)
                        : displayDate(race.date, { year: "numeric" })}
                    </time>
                  </span>
                  <h3>{english ? race.englishName : race.name}</h3>
                  <p>
                    {[
                      ...new Set(
                        race.groups.map((group) =>
                          (english ? englishDistance : distanceLabel)(group.distanceKm),
                        ),
                      ),
                    ].join(" · ")}
                  </p>
                  <span className="guides-race-action">
                    {t("查看賽事資料", "View race details")} <Icon name="arrow" size={18} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
        <section className="guides-read-next" aria-labelledby="read-next-heading">
          <div className="guides-section-heading">
            <h2 id="read-next-heading">{t("繼續閱讀", "Further reading")}</h2>
            <Link href={localPath("/guides/", english)}>
              {t("全部指南", "All guides")} <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="guide-grid">
            {guides
              .filter((item) => item.slug !== guide.slug)
              .map((item) => (
                <GuideCard english={english} key={item.slug} guide={item} />
              ))}
          </div>
        </section>
        <p className="guides-editorial-note">
          {t(
            "全部文章為本站原創。個別賽事日期、資格、費用及條款，以大會當屆正式公告為準。",
            "These guides are written by NXTGO. Check the organiser’s current announcement for dates, eligibility, fees and terms.",
          )}
        </p>
      </div>
    </main>
  );
}
