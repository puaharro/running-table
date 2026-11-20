import { RaceDataText } from "@/components/race-data-text";
import { englishRaceTerm } from "@/lib/race-terms.en";
import { englishDate, englishTimestamp, language, localPath } from "@/lib/english-races";
import "./race-detail.css";
import { raceExperience, RaceExperienceSections } from "@/components/race-experience";
import { RaceSaveActions } from "@/components/race-save";
import { notFound } from "next/navigation";
import Link from "next/link";
import { publicRaces as races } from "@/data/races";
import { guideMatchesRace, guides } from "@/data/guides";
import { AdSlot, Breadcrumb, GuideCard, Icon } from "@/components/ui";
import { ReturnLink } from "@/components/return-link";
import { RaceAnnouncement, RaceDayInformation } from "@/components/race-day-information";
import { RegistrationTimeline } from "@/components/registration-timeline";
import { RaceChapterNav } from "@/components/race-chapter-nav";
import {
  PublicRegistrationCountdown,
  RaceOverview,
  RegistrationGroups,
} from "@/components/live-registration";
import { RegistrationSummary } from "@/components/registration-summary";
import { formatTimestamp } from "@/lib/races";
import { pageMetadata, raceHref } from "@/lib/site";
import { releaseSettings } from "@/lib/release";
import { raceStructuredData, safeJsonLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return races.map((r) => ({ year: r.date.slice(0, 4), slug: r.slug }));
}
type Props = { params: Promise<{ year: string; slug: string }> };
async function getRace(params: Props["params"]) {
  const { year, slug } = await params;
  return races.find((r) => r.slug === slug && r.date.startsWith(year));
}
export async function generateMetadata({ params }: Props) {
  const race = await getRace(params);
  return race ? pageMetadata(race.name, race.summary, raceHref(race)) : {};
}

export default async function RacePage({ params, english = false }: Props & { english?: boolean }) {
  const t = language(english);
  const race = await getRace(params);
  if (!race) notFound();
  const relatedGuides = guides.filter((guide) => guideMatchesRace(guide, race));
  const experience = raceExperience(race, english);
  const confirmedExperience = experience.confirmed;
  const now = new Date().toISOString();
  const chapters = [
    { id: "race-about", label: t("賽事概覽", "Race overview") },
    { id: "registration-groups", label: t("組別及報名", "Categories and entry") },
    ...experience.chapters,
    { id: "race-transport", label: t("交通及集合", "Transport and assembly") },
    { id: "race-sources", label: t("資料來源", "Sources") },
    { id: "race-changes", label: t("修改紀錄", "Update history") },
  ];
  const schema = releaseSettings.indexable
    ? raceStructuredData(race, releaseSettings.origin, english)
    : null;
  return (
    <main id="main" className="detail-main race-detail-page">
      <div className="shell">
        {schema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
          />
        )}
        <ReturnLink english={english} compactOnMobile />
        <Breadcrumb
          english={english}
          items={[
            { label: t("賽事搜尋／時間表", "Race calendar"), href: "/races/" },
            { label: english ? race.englishName : race.name },
          ]}
        />
        <RaceAnnouncement english={english} race={race} />
        <div className="race-hero">
          <div className="detail-heading">
            <div>
              <h1>{english ? race.englishName : race.name}</h1>
              <p className="english-title" lang={english ? "zh-HK" : "en"}>
                {english ? race.name : race.englishName}
              </p>
            </div>
          </div>
          <PublicRegistrationCountdown english={english} race={race} initialNow={now} />
          <RaceSaveActions english={english} race={race} initialNow={now} />
          <RaceOverview
            english={english}
            race={race}
            initialNow={now}
            experienceHref={experience.overviewHref}
            experienceLabel={experience.overviewLabel}
          />
          <div className="registration-card race-official-panel">
            <h2>{t("官方報名資料", "Official entry information")}</h2>
            <p>
              {t(
                "查看大會當屆資料，確認您的組別、名額渠道及付款安排。",
                "Check the organiser’s current information for your category, entry channel and payment arrangements.",
              )}
            </p>
            <a
              className="button button-coral official-cta"
              href={race.sourceUrl!}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("前往官方賽事網站", "Visit the official race website")} <Icon name="arrow" />
            </a>
            <small>
              {t(
                "將開啟大會網站。本站不收取報名費，亦不保證即時名額。",
                "Opens the organiser’s website. NXTGO does not collect entry fees or guarantee availability.",
              )}
            </small>
          </div>
        </div>
        <details className="race-verification">
          <summary>
            <Icon name="check" size={18} />
            <strong>
              {t("賽事資料按官方來源整理", "Race information compiled from official sources")}
            </strong>
            <span>
              {t("資料核對：", "Verified:")}
              {english
                ? englishTimestamp(race.verifiedAt!)
                : `${formatTimestamp(race.verifiedAt!)} HKT`}
            </span>
          </summary>
          <div>
            <p>
              {t("賽事資料整理核對：", "Race information checked:")}
              {english
                ? englishTimestamp(race.verifiedAt!).replace(/ HKT$/, "")
                : formatTimestamp(race.verifiedAt!)}{" "}
              {t(
                "HKT。核實範圍見下方來源紀錄；未知欄位保留待核實。報名狀態另按渠道列出核對時間，只對應所列渠道。",
                "HKT. The sources below explain what we checked. Other fields still need verification. Registration status applies only to the listed entry channels, each with its own verification time.",
              )}
            </p>
          </div>
        </details>
        <div className="detail-layout">
          <RaceChapterNav english={english} chapters={chapters} compact />
          <article className="detail-content">
            <div className="key-facts">
              <div>
                <span>{t("地區／起點", "Region / start location")}</span>
                <strong>
                  {englishRaceTerm(race.region ?? "多區／待核實", english)} ·{" "}
                  {englishRaceTerm(race.venue, english)}
                </strong>
              </div>
              <div>
                <span>{t("主辦／統籌", "Organiser")}</span>
                <strong>
                  <RaceDataText value={race.organizer} english={english} />
                </strong>
              </div>
            </div>
            <section id="race-about" tabIndex={-1}>
              <h2>{t("賽事概覽", "Race overview")}</h2>
              <p>
                <RaceDataText value={race.summary} english={english} />
              </p>
            </section>
            <section>
              <h2>{t("報名前須核對的事項", "What to check before entering")}</h2>
              <ul className="highlight-list">
                {race.highlights.map((s, i) => (
                  <li key={s}>
                    <span>0{i + 1}</span>
                    <p>
                      <RaceDataText value={s} english={english} />
                    </p>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <div className="subheading">
                <h2>{t("組別及報名資料", "Categories and registration")}</h2>
                <span>
                  {t(
                    "時間：香港時間 · 收費說明以各組為準",
                    "All times HKT · See each category for fees",
                  )}
                </span>
              </div>
              <div id="registration-groups" tabIndex={-1}>
                <nav
                  className="race-group-links"
                  aria-label={t("跳到參賽組別", "Jump to a race category")}
                >
                  {race.groups.map((group) => (
                    <a key={group.id} href={`#group-${group.id}`}>
                      {englishRaceTerm(group.name, english)} <Icon name="arrow" size={16} />
                    </a>
                  ))}
                </nav>
                <RegistrationTimeline english={english} race={race} initialNow={now} />
                <details className="registration-comparison">
                  <summary>{t("比較各組報名概況", "Compare entry options by category")}</summary>
                  <RegistrationSummary english={english} race={race} initialNow={now} />
                </details>
                <RegistrationGroups
                  english={english}
                  race={race}
                  initialNow={now}
                  previewEdition={
                    confirmedExperience
                      ? { groupId: confirmedExperience.groupId, year: confirmedExperience.year }
                      : undefined
                  }
                />
              </div>
            </section>
            <RaceExperienceSections race={race} english={english} experience={experience} />
            <AdSlot />
            {!!race.enquiryLinks?.length && (
              <section id="enquiries" tabIndex={-1}>
                <h2>{t("其他慈善機構查詢", "Enquiries for other charities")}</h2>
                <div className="source-cards">
                  {race.enquiryLinks.map((link) => (
                    <div key={link.id} className="source-card">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <RaceDataText value={link.title} english={english} /> ↗
                      </a>
                      <p>
                        <RaceDataText value={link.description} english={english} />
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section id="race-transport" tabIndex={-1}>
              <h2>{t("交通及集合安排", "Transport and assembly")}</h2>
              <RaceDayInformation english={english} race={race} />
            </section>
            <section id="race-sources" tabIndex={-1}>
              <h2>{t("資料來源及核實範圍", "Sources and scope of verification")}</h2>
              {english && <p>Some source names and notes are shown in the original Chinese.</p>}
              <p>
                {t(
                  "「已核對」只適用下列列明欄位。尚待核對的費用、資格及報名狀態，不會以其他組別的資料代填。",
                  "Verification covers only the fields listed below. Fees, eligibility and entry status are checked separately for each category.",
                )}
              </p>
              <div className="source-cards">
                {race.sources?.map((source) => (
                  <div key={source.id} id={`source-${source.id}`} className="source-card">
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      <RaceDataText value={source.title} english={english} /> ↗
                    </a>
                    <time dateTime={source.checkedAt}>
                      {english
                        ? englishTimestamp(source.checkedAt)
                        : `${formatTimestamp(source.checkedAt)} HKT`}
                    </time>
                    <p>
                      {t("核實欄位：", "Verified fields:")}
                      {source.fields
                        .map(
                          (field) =>
                            ({
                              charityEntry: t("慈善名額", "Charity places"),
                              date: t("日期", "Date"),
                              venue: t("地點", "Venue"),
                              organizer: t("主辦／統籌", "Organiser"),
                              transport: t("交通", "Transport"),
                              announcement: t("賽事變更公告", "Race update"),
                              courseMap: t("官方路線圖", "Official course map"),
                              "groups.distanceKm": t("組別距離", "Category distance"),
                              "groups.price": t("費用／最低籌款額", "Fees / minimum fundraising"),
                              "groups.startTime": t("組別起跑時間", "Category start time"),
                              "channels.registration": t(
                                "渠道申請安排及期限",
                                "Entry arrangements and deadlines",
                              ),
                              "channels.price": t("渠道價格", "Entry fees"),
                              "channels.eligibility": t(
                                "渠道資格及套票內容",
                                "Eligibility and package details",
                              ),
                              "groups.limit": t("資格／時限", "Eligibility / time limit"),
                              "groups.marathon.distanceKm": t("全馬距離", "Marathon distance"),
                              "groups.marathon.price": t("全馬費用", "Marathon fees"),
                              "groups.marathon.venue": t("全馬起點", "Marathon start location"),
                              "groups.marathon.limit": t(
                                "全馬資格／時限",
                                "Marathon eligibility / time limit",
                              ),
                              "groups.half.distanceKm": t("半馬距離", "Half marathon distance"),
                              "groups.half.price": t("半馬費用", "Half marathon fees"),
                              "groups.half.venue": t("半馬起點", "Half marathon start location"),
                              "groups.half.limit": t(
                                "半馬資格／時限",
                                "Half marathon eligibility / time limit",
                              ),
                              "groups.10k.distanceKm": t("10K 距離", "10K distance"),
                              "groups.10k.price": t("10K 費用", "10K fees"),
                              "groups.10k.venue": t("10K 起點", "10K start location"),
                              "groups.10k.limit": t(
                                "10K 資格／時限",
                                "10K eligibility / time limit",
                              ),
                            })[field] ?? field,
                        )
                        .join(english ? ", " : "、")}
                    </p>
                    {source.note && (
                      <small>
                        <RaceDataText value={source.note} english={english} />
                      </small>
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section id="race-changes" tabIndex={-1}>
              <h2>{t("修改紀錄", "Update history")}</h2>
              <ul className="change-log">
                {race.changes?.map((change) => (
                  <li
                    key={`${change.date}-$<RaceDataText value={change.note} english={english} />`}
                  >
                    <time dateTime={change.date}>
                      {english ? englishDate(change.date) : change.date}
                    </time>
                    <span>
                      <RaceDataText value={change.note} english={english} />
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                className="text-link"
                href={localPath(`/about/?race=${encodeURIComponent(race.id)}#corrections`, english)}
              >
                {t("回報資料有誤 ↗", "Report a correction ↗")}
              </Link>
            </section>
            <ReturnLink english={english} />
          </article>
          <aside className="detail-sidebar">
            <RaceChapterNav english={english} chapters={chapters} />
            <div className="sidebar-note">
              <Icon name="check" />
              <h3>
                {t(
                  "抽籤截止後，其他渠道仍可能接受申請。",
                  "Other entry channels may remain open after the ballot closes.",
                )}
              </h3>
              <p>
                {t(
                  "同一比賽可能有公眾抽籤、慈善或其他特別名額。請按自身資格向官方確認。",
                  "A race may offer a public ballot, charity places or other entry options. Check your eligibility with the organiser.",
                )}
              </p>
              <Link
                href={localPath("/guides/race-registration-checklist/", english)}
                className="text-link"
              >
                {t("查看報名前清單", "View the entry checklist")} <Icon name="arrow" size={16} />
              </Link>
            </div>
          </aside>
        </div>
        <section className="related-section">
          <div className="section-heading">
            <h2>{t("報名及選賽指南", "Race selection and registration guides")}</h2>
          </div>
          <div className="guide-grid">
            {relatedGuides.map((g) => (
              <GuideCard english={english} key={g.slug} guide={g} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
