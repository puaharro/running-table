import Link from "next/link";
import { notFound } from "next/navigation";
import { guides } from "@/data/guides";
import { races } from "@/data/races";
import { AdSidebar, AdSlot, Breadcrumb, Icon } from "@/components/ui";
import { pageMetadata, raceHref } from "@/lib/site";
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
  return (
    <main id="main" className="article-main shell">
      <Breadcrumb
        items={[{ label: "報名及選賽指南", href: "/guides/" }, { label: guide.category }]}
      />
      <header className="article-heading">
        <div className="eyebrow">
          {guide.category} <span>{guide.readMinutes} 分鐘閱讀</span>
        </div>
        <h1>{guide.title}</h1>
        <p>{guide.description}</p>
        <div className="article-byline">跑期編輯整理 · 原創內容 · 2026 年 10 月 21 日</div>
      </header>
      <div className="article-layout">
        <article className="prose">
          {guide.sections.map((s, i) => (
            <section key={s.title} id={`section-${i + 1}`}>
              <h2>
                <span>0{i + 1}</span>
                {s.title}
              </h2>
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {i === 1 && <AdSlot />}
            </section>
          ))}
          <div className="article-cta">
            <h2>睇完指南，搵下一場。</h2>
            <p>按日期、距離及地區，縮窄你嘅選擇。</p>
            <Link
              className="button button-dark"
              href={`/${guide.relatedDistance ? `?distance=${encodeURIComponent(guide.relatedDistance)}` : ""}#race-list`}
            >
              前往賽事總覽 <Icon name="arrow" />
            </Link>
            <small>賽事詳情附官方來源與核實時間。</small>
          </div>
        </article>
        <aside className="article-sidebar">
          <div className="toc">
            <h2>本文內容</h2>
            {guide.sections.map((s, i) => (
              <a key={s.title} href={`#section-${i + 1}`}>
                <span>0{i + 1}</span>
                {s.title}
              </a>
            ))}
          </div>
          <AdSidebar />
          <div className="related-races">
            <h2>相關賽事</h2>
            <p>報名安排以大會最新資料為準。</p>
            {races
              .filter(
                (r) =>
                  !guide.relatedDistance ||
                  r.groups.some((g) =>
                    guide.relatedDistance === "10K"
                      ? g.distanceKm === 10
                      : Math.abs(g.distanceKm - 21.0975) < 0.1,
                  ),
              )
              .slice(0, 3)
              .map((r) => (
                <Link key={r.id} href={raceHref(r)}>
                  {r.name}
                  <Icon name="arrow" size={16} />
                </Link>
              ))}
          </div>
        </aside>
      </div>
    </main>
  );
}
