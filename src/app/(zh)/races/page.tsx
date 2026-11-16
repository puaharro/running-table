import { pageMetadata } from "@/lib/site";
import { RaceSearchView } from "./view";

export const metadata = pageMetadata(
  "賽事搜尋／時間表",
  "按日期、距離、地區及報名渠道搜尋香港路跑賽事，查看賽事時間表及官方報名資訊。",
  "/races/",
);

export default function RaceSearchPage() {
  return <RaceSearchView />;
}
