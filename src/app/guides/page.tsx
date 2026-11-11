import "./guides.css";
import Link from "next/link";
import { guides } from "@/data/guides";
import { Breadcrumb, GuideCard, Icon } from "@/components/ui";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata(
  "原創報名及選賽指南",
  "由報名清單到選賽比較，幫香港跑手掌握需要核實嘅資訊。",
  "/guides/",
);
export default function GuidesPage() {
  const categories = [
    {
      id: "choosing",
      category: "選賽指南",
      title: "點揀比賽",
      description: "由距離、路線到交通，逐項比較你重視嘅條件。",
    },
    {
      id: "registration",
      category: "報名指南",
      title: "報名前準備",
      description: "揀好比賽之後，核對入口、資料、費用同確認通知。",
    },
  ];
  return (
    <main id="main" className="guides-page guides-index">
      <div className="shell">
        <Breadcrumb items={[{ label: "報名及選賽指南" }]} />
        <header className="guides-heading">
          <h1>報名及選賽指南</h1>
          <p>由第一場路跑到下一場半馬，整理實用嘅報名及選賽方法。</p>
          <nav aria-label="指南分類">
            {categories.map((category) => (
              <a key={category.id} href={`#${category.id}`}>
                {category.title} <Icon name="arrow" size={16} />
              </a>
            ))}
          </nav>
        </header>
        {categories.map((category) => {
          const articles = guides.filter((guide) => guide.category === category.category);
          return (
            <section
              id={category.id}
              className={`guides-category guides-${category.id}`}
              key={category.id}
              aria-labelledby={`${category.id}-heading`}
              tabIndex={-1}
            >
              <div className="guides-section-heading">
                <h2 id={`${category.id}-heading`}>{category.title}</h2>
                <span>{articles.length} 篇指南</span>
              </div>
              <p>{category.description}</p>
              <div className="guide-grid">
                {articles.map((guide) => (
                  <GuideCard key={guide.slug} guide={guide} />
                ))}
              </div>
            </section>
          );
        })}
        <div className="guides-next-step">
          <div>
            <h2>有咗方向，就搵下一場。</h2>
            <p>按賽期同距離縮窄選擇，再睇賽事資料及指定年份嘅參賽體驗。</p>
          </div>
          <div className="guides-next-actions">
            <Link className="guides-primary-link" href="/races/">
              查看路跑時間表 <Icon name="arrow" />
            </Link>
            <Link className="guides-secondary-link" href="/ratings/">
              睇體驗評級
            </Link>
          </div>
        </div>
        <p className="guides-editorial-note">
          全部文章為本站原創。個別賽事日期、資格、費用及條款，以大會當屆正式公告為準。
        </p>
      </div>
    </main>
  );
}
