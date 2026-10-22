import { RaceExplorer } from "@/components/race-explorer";
import { races } from "@/data/races";
import { guides } from "@/data/guides";
import { GuideCard, Icon } from "@/components/ui";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { distanceLabel, displayDate, hongKongToday } from "@/lib/races";
import { raceHref } from "@/lib/site";

export const metadata = pageMetadata(
  "香港路跑賽事總覽",
  "按日期、距離、地區及報名狀態組合篩選香港路跑賽事，查看官方來源及原創報名指南。",
  "/",
);

export default function Home() {
  const nextRace = [...races]
    .filter((race) => race.endDate >= hongKongToday() && race.status === "scheduled")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return (
    <main id="main">
      <section className="calendar-masthead">
        <div className="shell masthead-grid">
          <div className="masthead-copy">
            <div className="masthead-kicker">
              <span /> HONG KONG RUNNING CALENDAR
            </div>
            <h1>
              每一場起跑，
              <br />
              都有<span>新可能。</span>
            </h1>
            <p>
              香港路跑賽事、報名資訊、選賽指南。
              <br />
              由第一場 5K，到你嘅下一個全馬。
            </p>
            <div className="masthead-actions">
              <a href="#race-list" className="button button-coral">
                探索賽事 <Icon name="arrow" />
              </a>
              <Link href="/guides/" className="masthead-guide">
                第一次報名？睇選賽指南 ↗
              </Link>
            </div>
            <div className="masthead-trust">
              <Icon name="check" size={15} /> 官方來源整理 <i /> 依組別列出報名狀態
            </div>
          </div>
          {nextRace && (
            <Link href={raceHref(nextRace)} className="next-race-card">
              <div className="next-race-top">
                <span>下一場已收錄賽事</span>
                <Icon name="arrow" />
              </div>
              <div className="next-race-visual" aria-hidden="true">
                <div className="track-orbit" />
                <div className="next-race-day">
                  {nextRace.date.slice(8)}
                  <span>
                    {Number(nextRace.date.slice(5, 7))} 月 · {nextRace.date.slice(0, 4)}
                  </span>
                </div>
                <span className="next-race-word">
                  NEXT
                  <br />
                  START.
                </span>
              </div>
              <div className="next-race-bottom">
                <small>
                  {displayDate(nextRace.date)} · {nextRace.district}
                </small>
                <h2>{nextRace.name}</h2>
                <div>
                  {[
                    ...new Set(nextRace.groups.map((group) => distanceLabel(group.distanceKm))),
                  ].map((distance) => (
                    <span key={distance}>{distance}</span>
                  ))}
                  <span className="next-race-detail">查看賽事 ↗</span>
                </div>
              </div>
            </Link>
          )}
        </div>
      </section>
      <RaceExplorer races={races} initialNow={new Date().toISOString()} />
      <section className="guides-section shell">
        <div className="section-heading">
          <div>
            <div className="eyebrow">BEFORE THE START LINE</div>
            <h2>準備好，再出發。</h2>
            <p>實用資訊，幫你揀一場適合自己嘅比賽。</p>
          </div>
          <Link className="text-link" href="/guides/">
            全部指南 <Icon name="arrow" />
          </Link>
        </div>
        <div className="guide-grid">
          {guides.map((g) => (
            <GuideCard key={g.slug} guide={g} />
          ))}
        </div>
      </section>
    </main>
  );
}
