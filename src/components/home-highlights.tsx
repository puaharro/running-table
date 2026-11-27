"use client";

import Link from "next/link";
import { language, localPath } from "@/lib/english-races";
import { homeRaceNews } from "@/lib/home-race-news";
import { HomePhoto } from "./home-photo";
import { Icon } from "./ui";
import { useClock } from "@/lib/use-clock";
import type { Race } from "@/lib/types";

export function HomeHighlights({
  races,
  initialNow,
  english = false,
}: {
  races: Race[];
  initialNow: string;
  english?: boolean;
}) {
  const t = language(english);
  const now = useClock(initialNow);
  const news = homeRaceNews(races, now, english);
  return (
    <>
      <section className="shell home-calendar-section" aria-labelledby="home-news-heading">
        <div className="home-calendar-section-head">
          <h2 id="home-news-heading">{t("最新消息", "Latest news")}</h2>
          <Link href={localPath("/races/", english)}>
            {t("賽事時間表", "Race calendar")} <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="home-calendar-layout">
          <div className="home-news-sheet">
            {news.length ? (
              <ul className="home-news-list" role="list">
                {news.map((item) => (
                  <li key={item.id} data-news-kind={item.kind}>
                    <Link href={item.href}>
                      <div className="home-news-copy">
                        <p className="home-news-category">{item.category}</p>
                        <h3>{item.headline}</h3>
                        <p className="home-news-summary">
                          {item.summary}
                          {item.date && (
                            <>
                              {" "}
                              · <time dateTime={item.date.value}>{item.date.label}</time>
                            </>
                          )}
                        </p>
                      </div>
                      <Icon name="arrow" size={18} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="home-news-empty">
                {t(
                  "暫無已核實的最新消息。您可在賽事時間表查看已收錄的比賽。",
                  "There are no verified updates at the moment. See the calendar for listed races.",
                )}
              </p>
            )}
          </div>
          <aside className="home-calendar-focus" aria-labelledby="home-focus-heading">
            <h2 id="home-focus-heading">
              {t("一場比賽，", "Choose a race")}
              <br />
              {t("了解詳情後再作決定。", "with the details in view.")}
            </h2>
            <p>
              {t(
                "除日期和距離外，亦可參考報名資格、交通安排及跑手體驗，再選擇合適的賽事。",
                "Alongside dates and distances, check eligibility, transport and runner reviews to find a race that suits you.",
              )}
            </p>
            <div className="home-photo">
              <HomePhoto
                file="harbour-run.webp"
                alt={t("清晨沿海濱慢跑的跑手", "A runner jogging along the waterfront at dawn")}
                width={768}
                height={512}
                sizes="(max-width: 767px) calc(100vw - 80px), (max-width: 1100px) calc((100vw - 76px) / 2.8 - 56px), (max-width: 1280px) calc((100vw - 104px) / 2.9 - 56px), 350px"
              />
            </div>
            <ul>
              <li>
                <Icon name="check" size={17} />{" "}
                {t("當屆官方資料逐項整理", "Official details for the current edition")}
              </li>
              <li>
                <Icon name="check" size={17} />{" "}
                {t("往屆評論列明年份及組別", "Past reviews identify the year and category")}
              </li>
              <li>
                <Icon name="check" size={17} />{" "}
                {t("未能確認的資料標示為待核實", "Unconfirmed details are marked as unverified")}
              </li>
            </ul>
            <Link href={localPath("/ratings/", english)}>
              {t("了解體驗評論與評分", "About runner reviews and ratings")}{" "}
              <Icon name="arrow" size={17} />
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
