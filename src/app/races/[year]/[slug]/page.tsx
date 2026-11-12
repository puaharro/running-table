import "./race-detail.css";
import { runnerCopyForRace } from "@/lib/runner-copy";
import { RaceRunnerCopy } from "@/components/race-runner-copy";
import { localRatingAssessment } from "@/lib/local-rating-preview";
import { RaceRatingAssessmentPreview } from "@/components/race-rating-assessment-preview";
import { UnscopedRunnerOpinions } from "@/components/runner-opinions";
import { RaceSaveActions } from "@/components/race-save";
import { notFound } from "next/navigation";
import Link from "next/link";
import { publicRaces as races } from "@/data/races";
import { guides } from "@/data/guides";
import { editorialReviews } from "@/data/editorial-reviews";
import { reviewsForGroup } from "@/lib/editorial-reviews";
import { AdSlot, Breadcrumb, GuideCard, Icon } from "@/components/ui";
import { ReturnLink } from "@/components/return-link";
import { RaceAnnouncement, RaceDayInformation } from "@/components/race-day-information";
import { RegistrationTimeline } from "@/components/registration-timeline";
import { RaceChapterNav } from "@/components/race-chapter-nav";
import {
  PublicRegistrationCountdown,
  RaceOverview,
  RegistrationGroups,
  RegistrationSummary,
} from "@/components/live-registration";
import { formatTimestamp } from "@/lib/races";
import { pageMetadata, raceHref } from "@/lib/site";
import { releaseSettings } from "@/lib/release";
import { raceStructuredData, safeJsonLd } from "@/lib/structured-data";

export const dynamicParams = false;
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

export default async function RacePage({ params }: Props) {
  const race = await getRace(params);
  if (!race) notFound();
  const reviewedGroups = race.groups.filter((group) => {
    const reviews = reviewsForGroup(race, group, editorialReviews);
    return reviews.current.length || reviews.historical.length;
  });
  const runnerCopy = runnerCopyForRace(race.id);
  const ratingAssessment = localRatingAssessment(race.id);
  const experienceId = runnerCopy
    ? "runner-copy"
    : "ratings-" + (reviewedGroups[0] ?? race.groups[0]).id;
  const now = new Date().toISOString();
  const chapters = [
    { id: "race-about", label: "賽事概覽" },
    { id: "registration-groups", label: "組別及報名" },
    { id: experienceId, label: runnerCopy ? "跑手分享" : "參賽體驗" },
    { id: "race-transport", label: "交通及集合" },
    { id: "race-sources", label: "資料來源" },
    { id: "race-changes", label: "修改紀錄" },
  ];
  const schema = releaseSettings.indexable
    ? raceStructuredData(race, releaseSettings.origin)
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
        <ReturnLink compactOnMobile />
        <Breadcrumb
          items={[{ label: "賽事搜尋／時間表", href: "/races/" }, { label: race.name }]}
        />
        <RaceAnnouncement race={race} />
        <div className="race-hero">
          <div className="detail-heading">
            <div>
              <h1>{race.name}</h1>
              <p className="english-title">{race.englishName}</p>
            </div>
          </div>
          <PublicRegistrationCountdown race={race} initialNow={now} />
          <RaceSaveActions race={race} initialNow={now} />
          <RaceOverview
            race={race}
            initialNow={now}
            experienceHref={"#" + experienceId}
            experienceLabel={
              runnerCopy
                ? "跑手分享（無評分）"
                : reviewedGroups.length
                  ? "參賽體驗"
                  : "參賽體驗（未評）"
            }
          />
          <div className="registration-card race-official-panel">
            <h2>官方報名資料</h2>
            <p>查看大會當屆資料，確認你嘅組別、名額渠道及付款安排。</p>
            <a
              className="button button-coral official-cta"
              href={race.sourceUrl!}
              target="_blank"
              rel="noopener noreferrer"
            >
              前往官方賽事網站 <Icon name="arrow" />
            </a>
            <small>將開啟大會網站。本站唔收報名費，亦唔保證即時餘額。</small>
          </div>
        </div>
        <details className="race-verification">
          <summary>
            <Icon name="check" size={18} />
            <strong>賽事資料按官方來源整理</strong>
            <span>資料核對：{formatTimestamp(race.verifiedAt!)} HKT</span>
          </summary>
          <div>
            <p>
              賽事資料整理核對：{formatTimestamp(race.verifiedAt!)}{" "}
              HKT。核實範圍見下方來源紀錄；未知欄位保留待核實。報名狀態另按渠道列出核對時間，只對應所列渠道。
            </p>
          </div>
        </details>
        <div className="detail-layout">
          <RaceChapterNav chapters={chapters} compact />
          <article className="detail-content">
            <div className="key-facts">
              <div>
                <span>地區／起點</span>
                <strong>
                  {race.region ?? "多區／待核實"} · {race.venue}
                </strong>
              </div>
              <div>
                <span>主辦／統籌</span>
                <strong>{race.organizer}</strong>
              </div>
            </div>
            <section id="race-about" tabIndex={-1}>
              <h2>賽事概覽</h2>
              <p>{race.summary}</p>
            </section>
            <section>
              <h2>報名前，先睇呢幾點</h2>
              <ul className="highlight-list">
                {race.highlights.map((s, i) => (
                  <li key={s}>
                    <span>0{i + 1}</span>
                    <p>{s}</p>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <div className="subheading">
                <h2>組別及報名資料</h2>
                <span>時間：香港時間 · 收費說明以各組為準</span>
              </div>
              <div id="registration-groups" tabIndex={-1}>
                <nav className="race-group-links" aria-label="跳到參賽組別">
                  {race.groups.map((group) => (
                    <a key={group.id} href={`#group-${group.id}`}>
                      {group.name} <Icon name="arrow" size={16} />
                    </a>
                  ))}
                </nav>
                <RegistrationTimeline race={race} initialNow={now} />
                <details className="registration-comparison">
                  <summary>比較各組報名概況</summary>
                  <RegistrationSummary race={race} initialNow={now} />
                </details>
                <RegistrationGroups race={race} initialNow={now} />
              </div>
            </section>
            {ratingAssessment && <RaceRatingAssessmentPreview draft={ratingAssessment} />}
            {runnerCopy && <RaceRunnerCopy copy={runnerCopy} />}
            <UnscopedRunnerOpinions race={race} />
            <AdSlot />
            {!!race.enquiryLinks?.length && (
              <section id="enquiries" tabIndex={-1}>
                <h2>其他慈善機構查詢</h2>
                <div className="source-cards">
                  {race.enquiryLinks.map((link) => (
                    <div key={link.id} className="source-card">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        {link.title} ↗
                      </a>
                      <p>{link.description}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section id="race-transport" tabIndex={-1}>
              <h2>交通及集合安排</h2>
              <RaceDayInformation race={race} />
            </section>
            <section id="race-sources" tabIndex={-1}>
              <h2>資料來源及核實範圍</h2>
              <p>
                「已核對」只適用下列列明欄位。未完成核對嘅費用、資格及報名狀態，唔會用其他組別資料代填。
              </p>
              <div className="source-cards">
                {race.sources?.map((source) => (
                  <div key={source.id} className="source-card">
                    <a href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.title} ↗
                    </a>
                    <time dateTime={source.checkedAt}>{formatTimestamp(source.checkedAt)} HKT</time>
                    <p>
                      核實欄位：
                      {source.fields
                        .map(
                          (field) =>
                            ({
                              charityEntry: "慈善名額",
                              date: "日期",
                              venue: "地點",
                              organizer: "主辦／統籌",
                              transport: "交通",
                              announcement: "賽事變更公告",
                              "groups.distanceKm": "組別距離",
                              "groups.price": "費用／最低籌款額",
                              "groups.startTime": "組別起跑時間",
                              "channels.registration": "渠道申請安排及期限",
                              "channels.price": "渠道價格",
                              "channels.eligibility": "渠道資格及套票內容",
                              "groups.limit": "資格／時限",
                              "groups.marathon.distanceKm": "全馬距離",
                              "groups.marathon.price": "全馬費用",
                              "groups.marathon.venue": "全馬起點",
                              "groups.marathon.limit": "全馬資格／時限",
                              "groups.half.distanceKm": "半馬距離",
                              "groups.half.price": "半馬費用",
                              "groups.half.venue": "半馬起點",
                              "groups.half.limit": "半馬資格／時限",
                              "groups.10k.distanceKm": "10K 距離",
                              "groups.10k.price": "10K 費用",
                              "groups.10k.venue": "10K 起點",
                              "groups.10k.limit": "10K 資格／時限",
                            })[field] ?? field,
                        )
                        .join("、")}
                    </p>
                    {source.note && <small>{source.note}</small>}
                  </div>
                ))}
              </div>
            </section>
            <section id="race-changes" tabIndex={-1}>
              <h2>修改紀錄</h2>
              <ul className="change-log">
                {race.changes?.map((change) => (
                  <li key={`${change.date}-${change.note}`}>
                    <time dateTime={change.date}>{change.date}</time>
                    <span>{change.note}</span>
                  </li>
                ))}
              </ul>
              <Link
                className="text-link"
                href={`/about/?race=${encodeURIComponent(race.id)}#corrections`}
              >
                回報資料有誤 ↗
              </Link>
            </section>
            <ReturnLink />
          </article>
          <aside className="detail-sidebar">
            <RaceChapterNav chapters={chapters} />
            <div className="sidebar-note">
              <Icon name="check" />
              <h3>抽籤截止，唔等於全部渠道截止。</h3>
              <p>同一比賽可能有公眾抽籤、慈善或其他特別名額。請按自身資格向官方確認。</p>
              <Link href="/guides/race-registration-checklist/" className="text-link">
                睇報名前清單 <Icon name="arrow" size={16} />
              </Link>
            </div>
          </aside>
        </div>
        <section className="related-section">
          <div className="section-heading">
            <h2>幫你作決定嘅實用指南</h2>
          </div>
          <div className="guide-grid">
            {guides.map((g) => (
              <GuideCard key={g.slug} guide={g} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
