import { notFound } from "next/navigation";
import Link from "next/link";
import { races } from "@/data/races";
import { guides } from "@/data/guides";
import { AdSlot, Breadcrumb, GuideCard, Icon } from "@/components/ui";
import { ReturnLink } from "@/components/return-link";
import {
  LiveRaceStatus,
  RegistrationGroups,
  RegistrationSummary,
} from "@/components/live-registration";
import { displayDate, distanceLabel, formatTimestamp } from "@/lib/races";
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
  const now = new Date().toISOString();
  const schema = releaseSettings.indexable
    ? raceStructuredData(race, releaseSettings.origin)
    : null;
  return (
    <main id="main" className="detail-main">
      <div className="shell">
        {schema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }}
          />
        )}
        <Breadcrumb items={[{ label: race.name }]} />
        <div className="detail-heading">
          <div>
            <div className="eyebrow">
              RACE INFORMATION <span>官方來源整理</span>
            </div>
            <h1>{race.name}</h1>
            <p className="english-title">{race.englishName}</p>
            <div className="detail-tags">
              <LiveRaceStatus race={race} initialNow={now} />
              <span className="tag">路跑</span>
              {race.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="date-stamp">
            <span>{race.date.slice(0, 4)}</span>
            <strong>{race.date.slice(5).replace("-", " / ")}</strong>
            <span>
              {displayDate(race.date, { weekday: "long", month: undefined, day: undefined })}
            </span>
          </div>
        </div>
        <div className="demo-notice verified-notice">
          <Icon name="check" size={22} />
          <div>
            <strong>賽事資料按官方來源整理</strong>
            <p>
              賽事資料整理核對：{formatTimestamp(race.verifiedAt!)}{" "}
              HKT。核實範圍見下方來源紀錄；未知欄位保留待核實。報名狀態另按渠道列出核對時間，只對應所列渠道。
            </p>
          </div>
        </div>
        <RegistrationSummary race={race} initialNow={now} />
        <div className="detail-layout">
          <article className="detail-content">
            <div className="key-facts">
              <div>
                <span>比賽日期</span>
                <strong>
                  {displayDate(race.date, { year: "numeric" })}
                  {race.date !== race.endDate && ` 至 ${displayDate(race.endDate)}`}
                </strong>
              </div>
              <div>
                <span>地區／起點</span>
                <strong>
                  {race.region ?? "多區／待核實"} · {race.venue}
                </strong>
              </div>
              <div>
                <span>參賽組別</span>
                <strong>
                  {[...new Set(race.groups.map((g) => distanceLabel(g.distanceKm)))].join(" / ")}
                </strong>
              </div>
              <div>
                <span>主辦／統籌</span>
                <strong>{race.organizer}</strong>
              </div>
            </div>
            <section>
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
                <RegistrationGroups race={race} initialNow={now} />
              </div>
            </section>
            <AdSlot />
            <section>
              <h2>交通及集合安排</h2>
              <p>{race.transport}</p>
            </section>
            <section>
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
                              date: "日期",
                              venue: "地點",
                              organizer: "主辦／統籌",
                              transport: "交通",
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
            <section>
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
            <div className="registration-card">
              <span className="eyebrow">OFFICIAL INFORMATION</span>
              <h2>先核對，再報名。</h2>
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
            <div className="eyebrow">MAKE YOUR NEXT MOVE</div>
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
