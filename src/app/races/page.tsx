import { RaceExplorer } from "@/components/race-explorer";
import { races } from "@/data/races";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata(
  "賽事搜尋／時間表",
  "按日期、距離、地區及報名渠道搜尋香港路跑賽事，查看賽事時間表及官方報名資訊。",
  "/races/",
);

export default function RaceSearchPage() {
  return (
    <main id="main" className="search-page">
      <RaceExplorer races={races} initialNow={new Date().toISOString()} />
    </main>
  );
}
