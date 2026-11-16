import { pageMetadata } from "@/lib/site";
import { HomeView } from "./home-view";

export const metadata = pageMetadata(
  "香港路跑時間表、賽事資料及體驗評論",
  "由香港路跑賽期出發，查閱官方報名資料、原創體驗評論及選賽指南，規劃您的下一場比賽。",
  "/",
);

export default function Home() {
  return <HomeView />;
}
