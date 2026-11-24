import { language, localPath } from "@/lib/english-races";
import "./guides.css";
import Link from "next/link";
import { guides } from "@/data/guides";
import { Breadcrumb, GuideCard, Icon } from "@/components/ui";
import { pageMetadata } from "@/lib/site";
export const metadata = pageMetadata(
  "原創報名及選賽指南",
  "由報名清單到選賽比較，協助香港跑手掌握須核實的資訊。",
  "/guides/",
);
export default function GuidesPage({ english = false }: { english?: boolean }) {
  const t = language(english);
  const categories = [
    {
      id: "choosing",
      category: "選賽指南",
      title: t("如何選擇賽事", "Choosing a race"),
      description: t(
        "由距離、路線到交通，逐項比較您重視的條件。",
        "Compare the distances, courses and transport options that matter to you.",
      ),
    },
    {
      id: "registration",
      category: "報名指南",
      title: t("報名前準備", "Before you enter"),
      description: t(
        "選定賽事後，核對報名入口、資料、費用及確認通知。",
        "Check the entry link, information, fees and confirmation after choosing a race.",
      ),
    },
  ];
  return (
    <main id="main" className="guides-page guides-index">
      <div className="shell">
        <Breadcrumb
          english={english}
          items={[{ label: t("報名及選賽指南", "Race selection and registration guides") }]}
        />
        <header className="guides-heading">
          <h1>{t("報名及選賽指南", "Race selection and registration guides")}</h1>
          <p>
            {t(
              "從首次參加路跑到準備下一場半馬，查閱實用的報名及選賽方法。",
              "Practical guidance on choosing and entering your first road race or next half marathon.",
            )}
          </p>
          <nav aria-label={t("指南分類", "Guide categories")}>
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
                <span>
                  {t(
                    `${articles.length} 篇指南`,
                    `${articles.length} ${articles.length === 1 ? "guide" : "guides"}`,
                  )}
                </span>
              </div>
              <p>{category.description}</p>
              <div className="guide-grid">
                {articles.map((guide) => (
                  <GuideCard english={english} key={guide.slug} guide={guide} />
                ))}
              </div>
            </section>
          );
        })}
        <div className="guides-next-step">
          <div>
            <h2>{t("搜尋下一場賽事", "Find your next race")}</h2>
            <p>
              {t(
                "按賽期及距離縮窄選擇，再查閱賽事資料及指定年份的參賽體驗。",
                "Narrow your options by date and distance, then explore race details and reviews of specific editions.",
              )}
            </p>
          </div>
          <div className="guides-next-actions">
            <Link className="guides-primary-link" href={localPath("/races/", english)}>
              {t("查看路跑時間表", "View the race calendar")} <Icon name="arrow" />
            </Link>
            <Link className="guides-secondary-link" href={localPath("/ratings/", english)}>
              {t("查看參賽評論", "View race reviews")}
            </Link>
          </div>
        </div>
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
