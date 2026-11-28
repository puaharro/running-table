import Link from "next/link";
import { language, localPath } from "@/lib/english-races";
import { englishGuides } from "@/data/guides.en";
import { HomeFocusBanner } from "@/components/home-focus-banner";
import { homeFocusSlides } from "@/data/home-focus";
import { HomeHighlights } from "@/components/home-highlights";
import { HomePhoto } from "@/components/home-photo";
import { LegacySearchRedirect } from "@/components/legacy-search-redirect";
import { Icon } from "@/components/ui";
import { publicRaces as races } from "@/data/races";
import { guides } from "@/data/guides";
import { editorialReviews } from "@/data/editorial-reviews";
import { reviewTargets } from "@/lib/rating-policy";
import { raceHref } from "@/lib/site";
import "../homepage.css";

const reviewPhotos: Record<
  string,
  { file: string; height: number; alt: string; englishAlt: string }
> = {
  "hzmb-half-2025-participant-notes": {
    file: "hzmb-sha-lo-wan.webp",
    height: 640,
    alt: "2018 年環境照：從沙螺灣望向港珠澳大橋香港連接路",
    englishAlt: "2018 location photo of the Hong Kong Link Road from Sha Lo Wan",
  },
  "schkm-marathon-2026-participant-notes": {
    file: "schkm-2026.webp",
    height: 720,
    alt: "2026 年渣馬跑手經過市區路段的補給站",
    englishAlt: "2026 Hong Kong Marathon runners passing an urban aid station",
  },
};

const guidePhotos: Record<
  string,
  { file: string; alt: string; englishAlt: string; height?: number }
> = {
  "choose-your-first-10k": {
    file: "first-10k.webp",
    alt: "三位跑手沿海旁並排慢跑",
    englishAlt: "Three runners jogging side by side along the waterfront",
  },
  "race-registration-checklist": {
    file: "registration-gear.webp",
    alt: "跑鞋、號碼布同扣針",
    englishAlt: "Running shoes, a race bib and safety pins",
  },
  "compare-half-marathons": {
    file: "half-marathon.webp",
    alt: "兩位跑手攤開示意路線圖，比較路線同起伏",
    englishAlt: "Two runners comparing a route and its elevation on an illustrative course map",
    height: 384,
  },
};

export function HomeView({ english = false }: { english?: boolean }) {
  const t = language(english);
  const slides = english
    ? homeFocusSlides.map((slide) => {
        const race = races.find((event) => event.id === slide.id);
        const guide = englishGuides.find((item) => item.slug === slide.id);
        return {
          ...slide,
          title: race?.englishName ?? guide?.title ?? slide.title,
          description:
            guide?.description ??
            (slide.tone === "blue"
              ? "Compare the half marathon and 10K, including assembly and shuttle arrangements."
              : "Compare marathon, half marathon and 10K categories, start locations and entry channels."),
          action: guide ? "Read the guide" : "View race details",
          ...(slide.kind === "editorial"
            ? { category: guide ? "Race guide" : "Featured race" }
            : {}),
          href: localPath(slide.href, true),
        } as typeof slide;
      })
    : homeFocusSlides;
  const initialNow = new Date().toISOString();
  return (
    <main id="main" className="homepage">
      {!english && <LegacySearchRedirect />}
      <header className="shell home-intro">
        <div className="home-intro-copy">
          <h1>
            <span>{t("下一場，", "Find your")}</span>
            {english && " "}
            <span>{t("香港見。", "next race.")}</span>
          </h1>
          <p>
            {t(
              "香港路跑賽期、報名資料及跑手體驗。",
              "Hong Kong race dates, registration details and runner experiences.",
            )}
          </p>
        </div>
        <nav className="home-intro-links" aria-label={t("首頁快速入口", "Home quick links")}>
          <Link className="home-primary" href={localPath("/races/", english)}>
            {t("賽事時間表", "Race calendar")} <Icon name="arrow" size={18} />
          </Link>
        </nav>
      </header>
      <HomeFocusBanner english={english} slides={slides} initialNow={initialNow} />
      <HomeHighlights english={english} races={races} initialNow={initialNow} />
      <section className="home-reviews" aria-labelledby="home-review-heading">
        <div className="shell home-block">
          <div className="home-section-head">
            <div>
              <h2 id="home-review-heading">{t("跑手體驗評論", "Runner reviews")}</h2>
              <p>
                {t(
                  "透過跑手訪談了解賽道、大會執行及補給體驗，作為選擇賽事的參考。",
                  "Read runners’ accounts of the course, event organisation and aid stations before choosing a race.",
                )}
              </p>
            </div>
            <Link href={localPath("/ratings/", english)}>
              {t("更多跑手分享", "More runner accounts")} <Icon name="arrow" />
            </Link>
          </div>
          <div className="home-review-grid">
            {editorialReviews.map((review) => {
              const target = reviewTargets.find((entry) => entry.id === review.targetId);
              const race = races.find((entry) => entry.id === target?.raceId);
              if (!target || !race) return null;
              const photo = reviewPhotos[review.id];
              return (
                <article className="home-review-card" key={review.id}>
                  <h3>
                    <Link href={localPath(`${raceHref(race)}#review-${review.id}`, english)}>
                      {english ? race.englishName : target.name}
                      <Icon name="arrow" size={23} />
                    </Link>
                  </h3>
                  <div className="home-review-meta">
                    <span>{t("跑手訪談", "Runner interview")}</span>
                    <span>
                      {review.editionYear}
                      {t(" 年", "")} ·{" "}
                      {english
                        ? target.id === "hzmb-half"
                          ? "Half marathon"
                          : "Marathon"
                        : target.group}
                    </span>
                  </div>
                  {photo && (
                    <div className="home-photo home-review-photo">
                      <HomePhoto
                        file={photo.file}
                        alt={english ? photo.englishAlt : photo.alt}
                        width={960}
                        height={photo.height}
                        sizes="(max-width: 767px) calc(100vw - 74px), (max-width: 1100px) calc(50vw - 98px), (max-width: 1280px) calc(50vw - 110px), 530px"
                      />
                    </div>
                  )}
                  {review.quickTake && (
                    <p className="home-review-summary" lang={english ? "zh-HK" : undefined}>
                      {review.quickTake.summary}
                    </p>
                  )}
                  <p className="home-review-scope">
                    {english
                      ? `Past-edition review based on one runner’s account. See the original for evidence and limitations. It does not assess the ${race.date.slice(0, 4)} edition.`
                      : `往屆評論，不代表 ${race.date.slice(0, 4)} 年安排或表現。單一跑手觀察，完整依據及限制見內文。`}
                  </p>
                  <Link
                    href={localPath(`${raceHref(race)}#review-${review.id}`, english)}
                    className="home-review-read"
                  >
                    {t("閱讀完整評論", "Read the full review")} <Icon name="arrow" size={16} />
                  </Link>
                </article>
              );
            })}
            {!editorialReviews.length && (
              <p>{t("評論正在整理。", "Reviews are being prepared.")}</p>
            )}
          </div>
          <div className="home-review-method">
            <span>{t("賽道體驗", "Course experience")}</span>
            <i />
            <span>{t("大會執行", "Event organisation")}</span>
            <i />
            <span>{t("補給體驗", "Aid stations")}</span>
            <Link href={localPath("/ratings/#method", english)}>
              {t("了解評論如何整理", "How reviews are compiled")} <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="shell home-block home-guides" aria-labelledby="home-guide-heading">
        <div className="home-section-head">
          <div>
            <h2 id="home-guide-heading">
              {t("報名及選賽指南", "Race selection and registration guides")}
            </h2>
            <p>
              {t(
                "第一場 10K，或者下一場半馬，從一份實用指南開始。",
                "Practical guides for your first 10K or your next half marathon.",
              )}
            </p>
          </div>
          <Link href={localPath("/guides/", english)}>
            {t("全部指南", "All guides")} <Icon name="arrow" />
          </Link>
        </div>
        <div className="home-guide-grid">
          {guides.map((guide) => {
            const translated = english
              ? englishGuides.find((item) => item.slug === guide.slug)
              : undefined;
            const photo = guidePhotos[guide.slug];
            return (
              <Link
                className="home-guide"
                href={localPath(`/guides/${guide.slug}/`, english)}
                key={guide.slug}
              >
                <div className="home-guide-top">
                  <span>
                    {translated ? "Guide" : guide.category} · {guide.readMinutes} {t("分鐘", "min")}
                  </span>
                </div>
                <h3>{translated?.title ?? guide.title}</h3>
                <p>{translated?.description ?? guide.description}</p>
                {photo && (
                  <span className="home-photo">
                    <HomePhoto
                      file={photo.file}
                      alt={english ? photo.englishAlt : photo.alt}
                      width={768}
                      height={photo.height ?? 512}
                      sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1100px) calc((100vw - 112px) / 3), (max-width: 1280px) calc((100vw - 136px) / 3), 382px"
                    />
                  </span>
                )}
                <span className="home-guide-read">
                  {t("閱讀指南", "Read the guide")} <Icon name="arrow" size={18} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="shell home-help" aria-labelledby="home-help-heading">
        <div>
          <h2 id="home-help-heading">{t("選定您的下一場比賽", "Choose your next race")}</h2>
          <p>
            {t("按日期、距離及地點尋找合適的比賽。", "Find a race by date, distance and location.")}
          </p>
        </div>
        <Link className="home-primary" href={localPath("/races/", english)}>
          {t("前往賽事時間表", "Go to the race calendar")} <Icon name="arrow" />
        </Link>
      </section>
      <section
        className="shell home-service-links"
        aria-label={t("報名重點及資料政策", "Registration and information policy")}
      >
        <Link href={localPath("/races/?channel=charity", english)}>
          {t("查看設有慈善名額的賽事", "Find races with charity places")}{" "}
          <Icon name="arrow" size={16} />
        </Link>
        <Link href={localPath("/races/?status=open&sort=deadline", english)}>
          {t("按報名截止日期搜尋賽事", "Find races by entry deadline")}{" "}
          <Icon name="arrow" size={16} />
        </Link>
        <Link href={localPath("/about/", english)}>
          {t("官方來源、核實與更正政策", "Sources, verification and corrections")}{" "}
          <Icon name="arrow" size={16} />
        </Link>
      </section>
    </main>
  );
}
