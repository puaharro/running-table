import { RaceExplorer } from "@/components/race-explorer";
import { races } from "@/data/races";
import { guides } from "@/data/guides";
import { GuideCard, Icon } from "@/components/ui";
import { pageMetadata } from "@/lib/site";
import Link from "next/link";
import { NextRaceCard } from "@/components/next-race-card";

export const metadata = pageMetadata(
  "香港路跑賽事總覽",
  "按日期、距離、地區及報名狀態組合篩選香港路跑賽事，查看官方來源及原創報名指南。",
  "/",
);

export default function Home() {
  const initialNow = new Date().toISOString();
  return (
    <main id="main">
      <section className="calendar-masthead">
        <div className="shell masthead-grid">
          <div className="masthead-copy">
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
              <Icon name="check" size={15} /> 官方來源整理 <i /> 依渠道列出申請安排
            </div>
          </div>
          <NextRaceCard races={races} initialNow={initialNow} />
        </div>
      </section>
      <RaceExplorer races={races} initialNow={initialNow} />
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
