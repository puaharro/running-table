import "../guides.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { guides } from "@/data/guides";
import { publicRaces as races } from "@/data/races";
import { AdSlot, Breadcrumb, GuideCard, Icon } from "@/components/ui";
import { RegistrationChecklist } from "@/components/registration-checklist";
import { displayDate, distanceLabel } from "@/lib/races";
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
export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guides.find((g) => g.slug === slug);
  if (!guide) notFound();
  const related = races
    .filter(
      (race) =>
        !guide.relatedDistance ||
        race.groups.some((group) => distanceLabel(group.distanceKm) === guide.relatedDistance),
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const searchHref = `/races/${guide.relatedDistance ? `?distance=${encodeURIComponent(guide.relatedDistance)}` : ""}#race-list`;
  return (
    <main id="main" className="guides-page guide-article">
      <div className="shell">
        <Breadcrumb
          items={[{ label: "報名及選賽指南", href: "/guides/" }, { label: guide.category }]}
        />
        <Link className="guide-back-link" href="/guides/">
          ← 返回指南列表
        </Link>
        <header className="guides-article-heading">
          <h1>{guide.title}</h1>
          <p>{guide.description}</p>
          <div className="guides-byline">
            {guide.category}，約 {guide.readMinutes} 分鐘閱讀。{siteName}編輯整理，原創內容。{" "}
            <time dateTime="2026-10-21">2026 年 10 月 21 日</time>
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
              本文目錄 <span>{guide.sections.length} 節</span>
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
            {slug === "race-registration-checklist" && <RegistrationChecklist />}
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
              返回目錄 ↑
            </a>
            <div className="guides-article-cta">
              <h2>睇完指南，搵下一場。</h2>
              <p>按日期、距離及地區，縮窄你嘅選擇。</p>
              <Link className="guides-primary-link" href={searchHref}>
                {guide.relatedDistance ? `查看${guide.relatedDistance}時間表` : "前往賽事搜尋"}{" "}
                <Icon name="arrow" />
              </Link>
              <small>賽事詳情附官方來源與核實時間。</small>
            </div>
          </article>
        </div>
        <section className="guides-related-races" aria-labelledby="related-races-heading">
          <div className="guides-section-heading">
            <h2 id="related-races-heading">相關賽事</h2>
            <Link href={searchHref}>
              查看完整時間表 <Icon name="arrow" size={16} />
            </Link>
          </div>
          <p>報名安排以大會最新資料為準。</p>
          <div className="guides-race-grid">
            {related.map((race) => (
              <Link key={race.id} className="guides-race-card" href={raceHref(race)}>
                <span>
                  <Icon name="calendar" size={16} />
                  <time dateTime={race.date}>{displayDate(race.date, { year: "numeric" })}</time>
                </span>
                <h3>{race.name}</h3>
                <p>
                  {[...new Set(race.groups.map((group) => distanceLabel(group.distanceKm)))].join(
                    " · ",
                  )}
                </p>
                <span className="guides-race-action">
                  查看賽事資料 <Icon name="arrow" size={18} />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="guides-read-next" aria-labelledby="read-next-heading">
          <div className="guides-section-heading">
            <h2 id="read-next-heading">繼續閱讀</h2>
            <Link href="/guides/">
              全部指南 <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="guide-grid">
            {guides
              .filter((item) => item.slug !== guide.slug)
              .map((item) => (
                <GuideCard key={item.slug} guide={item} />
              ))}
          </div>
        </section>
        <p className="guides-editorial-note">
          全部文章為本站原創。個別賽事日期、資格、費用及條款，以大會當屆正式公告為準。
        </p>
      </div>
    </main>
  );
}
