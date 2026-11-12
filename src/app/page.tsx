import Link from "next/link";
import Image from "next/image";
import { HomeFocusBanner } from "@/components/home-focus-banner";
import { homeFocusSlides } from "@/data/home-focus";
import { HomeHighlights } from "@/components/home-highlights";
import { LegacySearchRedirect } from "@/components/legacy-search-redirect";
import { Icon } from "@/components/ui";
import { publicRaces as races } from "@/data/races";
import { guides } from "@/data/guides";
import { editorialReviews } from "@/data/editorial-reviews";
import { reviewTargets } from "@/lib/rating-policy";
import { pageMetadata, raceHref } from "@/lib/site";
import "./homepage.css";

const reviewPhotos: Record<string, { file: string; height: number; alt: string }> = {
  "hzmb-half-2025-participant-notes": {
    file: "hzmb-sha-lo-wan.webp",
    height: 640,
    alt: "2018 年環境照：從沙螺灣望向港珠澳大橋香港連接路",
  },
  "schkm-marathon-2026-participant-notes": {
    file: "schkm-2026.webp",
    height: 720,
    alt: "2026 年渣馬跑手經過市區路段嘅補給枱",
  },
};

const guidePhotos: Record<string, { file: string; alt: string; height?: number }> = {
  "choose-your-first-10k": { file: "first-10k.webp", alt: "三位跑手沿海旁並排慢跑" },
  "race-registration-checklist": { file: "registration-gear.webp", alt: "跑鞋、號碼布同扣針" },
  "compare-half-marathons": {
    file: "half-marathon.webp",
    alt: "兩位跑手攤開示意路線圖，比較路線同起伏",
    height: 384,
  },
};

export const metadata = pageMetadata(
  "香港路跑時間表、賽事資料及體驗評論",
  "由香港路跑賽期出發，查閱官方報名資料、原創體驗評論及選賽指南，計劃你嘅下一場比賽。",
  "/",
);

export default function Home() {
  const initialNow = new Date().toISOString();
  return (
    <main id="main" className="homepage">
      <LegacySearchRedirect />
      <header className="shell home-intro">
        <div>
          <h1>你嘅下一場，由呢度起跑。</h1>
          <p>香港路跑賽期、報名資料同跑手體驗。</p>
        </div>
        <Link href="/races/">
          查看完整時間表 <Icon name="arrow" size={18} />
        </Link>
      </header>
      <HomeFocusBanner slides={homeFocusSlides} initialNow={initialNow} />
      <HomeHighlights races={races} initialNow={initialNow} />
      <section className="home-reviews" aria-labelledby="home-review-heading">
        <div className="shell home-block">
          <div className="home-section-head">
            <div>
              <h2 id="home-review-heading">跑手體驗評論</h2>
              <p>從跑手訪談了解賽道、大會執行同補給體驗，揀賽事多一個角度。</p>
            </div>
            <Link href="/ratings/">
              評論與評分準則 <Icon name="arrow" />
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
                    <Link href={`${raceHref(race)}#review-${review.id}`}>
                      {target.name}
                      <Icon name="arrow" size={23} />
                    </Link>
                  </h3>
                  <div className="home-review-meta">
                    <span>編輯點評 · 跑手訪談</span>
                    <span>
                      {review.editionYear} 年 · {target.group}
                    </span>
                  </div>
                  {photo && (
                    <div className="home-photo home-review-photo">
                      <Image
                        src={`/images/home/${photo.file}`}
                        alt={photo.alt}
                        width={960}
                        height={photo.height}
                      />
                    </div>
                  )}
                  {review.quickTake && (
                    <p className="home-review-summary">{review.quickTake.summary}</p>
                  )}
                  <p className="home-review-scope">
                    往屆評論，不代表 {race.date.slice(0, 4)}{" "}
                    年安排或表現。單一跑手觀察，完整依據及限制見內文。
                  </p>
                  <Link href={`${raceHref(race)}#review-${review.id}`} className="home-review-read">
                    閱讀完整評論 <Icon name="arrow" size={16} />
                  </Link>
                </article>
              );
            })}
            {!editorialReviews.length && <p>評論整理中，先了解我哋嘅評分準則。</p>}
          </div>
          <div className="home-review-method">
            <span>賽道體驗</span>
            <i />
            <span>大會執行</span>
            <i />
            <span>補給體驗</span>
            <Link href="/ratings/#method">
              三項獨立評分，睇清依據 <Icon name="arrow" size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="shell home-block home-guides" aria-labelledby="home-guide-heading">
        <div className="home-section-head">
          <div>
            <h2 id="home-guide-heading">報名及選賽指南</h2>
            <p>第一場 10K，或者下一場半馬，從一份實用指南開始。</p>
          </div>
          <Link href="/guides/">
            全部指南 <Icon name="arrow" />
          </Link>
        </div>
        <div className="home-guide-grid">
          {guides.map((guide) => {
            const photo = guidePhotos[guide.slug];
            return (
              <Link className="home-guide" href={`/guides/${guide.slug}/`} key={guide.slug}>
                <div className="home-guide-top">
                  <span>
                    {guide.category} · {guide.readMinutes} 分鐘
                  </span>
                </div>
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
                {photo && (
                  <span className="home-photo">
                    <Image
                      src={`/images/home/${photo.file}`}
                      alt={photo.alt}
                      width={768}
                    height={photo.height ?? 512}
                    />
                  </span>
                )}
                <span className="home-guide-read">
                  閱讀指南 <Icon name="arrow" size={18} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="shell home-help" aria-labelledby="home-help-heading">
        <div>
          <h2 id="home-help-heading">揀好目標，下一步就出發。</h2>
          <p>按日期、距離同地點，搵一場啱自己嘅比賽。</p>
        </div>
        <Link className="home-primary" href="/races/">
          前往賽事時間表 <Icon name="arrow" />
        </Link>
      </section>
      <section className="shell home-service-links" aria-label="報名重點及資料政策">
        <Link href="/races/?channel=charity">
          查看設有慈善名額嘅賽事 <Icon name="arrow" size={16} />
        </Link>
        <Link href="/races/?status=open&sort=deadline">
          按報名截止搵賽事 <Icon name="arrow" size={16} />
        </Link>
        <Link href="/about/">
          官方來源、核實與更正政策 <Icon name="arrow" size={16} />
        </Link>
      </section>
    </main>
  );
}
