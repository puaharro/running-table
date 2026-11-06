import { reviewTargets } from "@/lib/rating-policy";
import type { Race, RaceGroup } from "@/lib/types";

type SourceExcerpt = {
  author: string;
  quote: string;
  url: string;
  excerpt?: true;
  scope?: string;
};
type OpinionTopic = {
  title: string;
  summary: string;
  sources: SourceExcerpt[];
};
export type RunnerOpinions = {
  targetId: string;
  editionYear: number;
  sourceName: string;
  sourceUrl: string;
  checkedOn: string;
  scope: string;
  topics: OpinionTopic[];
};

const source = (id: string) => `https://www.marathonsworld.com/artapp/rating_detail.php?rid=${id}`;

// Published selection from the owner's confirmed Marathon's World v1 draft.
// Interviews, research notes and unapproved material stay in .editorial-private/.
export const runnerOpinions: RunnerOpinions[] = [
  {
    targetId: "hzmb-half",
    editionYear: 2025,
    sourceName: "Marathon’s World",
    sourceUrl: "https://www.marathonsworld.com/artapp/racedetail.php?rid=22553",
    checkedOn: "2026-11-06",
    scope:
      "節錄自 2025 賽事專頁，出帖日期未顯示。作者身份及參賽未逐一獨立核實；除 Rocky 自述第一槍出發外，批次及完賽位置未明。個別感受不代表全體跑手，不合併編輯評分。",
    topics: [
      {
        title: "賽道",
        summary: "有人喜歡、覺得好跑；亦有起伏及挑戰感受，建議擴闊頭 3 公里。",
        sources: [
          { author: "Lai Siu Fung", quote: "很喜歡的一條賽道", url: source("682235") },
          { author: "leo", quote: "ok好跑", url: source("631648") },
          {
            author: "Belton Chan",
            quote: "一條具挑戰性的賽道",
            url: source("631372"),
            scope: "挑戰感受不等於負面評價。",
          },
          {
            author: "Fifi Lau",
            quote: "路線有上落, 大會整體流暢",
            url: source("631197"),
          },
          {
            author: "Natalie Ngan",
            quote: "頭3K可以擴闊賽道就更好",
            url: source("630857"),
          },
        ],
      },
      {
        title: "大會安排",
        summary: "有人肯定較前屆改善；亦有時間安排、早起及沿途氣氛的改善意見。",
        sources: [
          {
            author: "rockiec",
            quote: "比去年有改善：廁所多咗、賽道駁口位覆蓋膠墊、下車至起點距離縮短",
            url: source("630594"),
            scope: "作者跨屆比較，未獨立核對數量或距離。",
          },
          {
            author: "mcfai",
            quote: "Time arrangement is bad",
            url: source("631309"),
            scope: "未說明涉及哪個環節。",
          },
          {
            author: "Christie Leung",
            quote: "零晨3:00起身消耗精神",
            url: source("630718"),
            excerpt: true,
            scope: "個人起床時間，不代表所有跑手需要同樣早起。",
          },
          {
            author: "Billy Tsang",
            quote: "大會比賽安排過程不錯，氣氛也強烈",
            url: source("630692"),
            excerpt: true,
          },
          {
            author: "腸粉跑馬拉松",
            quote: "希望中間有幫選手加油環節去增強氣氛",
            url: source("630633"),
          },
        ],
      },
      {
        title: "補給",
        summary:
          "有人希望加站或增加補給品；一位第一槍跑手覺得水站足夠、容易進入，但手冊里數資訊不足。",
        sources: [
          {
            author: "Lawrence Hui",
            quote: "希望多加一個補給站",
            url: source("655421"),
            scope: "加站建議不等於曾經斷水或取不到飲品。",
          },
          {
            author: "Joe Lam",
            quote: "補給品可要增加一些",
            url: source("631080"),
            excerpt: true,
            scope: "未指明品種或份量。",
          },
          {
            author: "Rocky",
            quote: "水站數量足夠",
            url: source("630878"),
            excerpt: true,
            scope:
              "自述第一槍出發、進水站容易；另認為手冊未清楚列出水站里數，難以預測。不代表其他批次或後段供應。",
          },
        ],
      },
    ],
  },
];

export function runnerOpinionsForGroup(race: Race, group: RaceGroup) {
  const target = reviewTargets.find((t) => t.raceId === race.id && t.groupId === group.id);
  return runnerOpinions.filter(
    (record) =>
      record.targetId === target?.id && record.editionYear <= Number(group.date.slice(0, 4)),
  );
}
