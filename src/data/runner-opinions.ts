import { reviewTargets } from "@/lib/rating-policy";
import type { Race, RaceGroup } from "@/lib/types";

type SourceExcerpt = {
  author: string;
  quote: string;
  url: string;
  excerpt?: true;
  scope?: string;
  postedOn?: string | null;
};
type OpinionTopic = {
  title: string;
  summary: string;
  sources: SourceExcerpt[];
};
export type RunnerOpinions = {
  targetId: string;
  raceId?: string;
  groupId?: string;
  groupLabel?: string;
  intro?: string;
  reminders?: string[];
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
  {
    raceId: "standard-chartered-hk-marathon-2027",
    editionYear: 2025,
    sourceName: "多來源跑手意見",
    sourceUrl: "https://www.marathonsworld.com/artapp/racedetail.php?rid=22176",
    checkedOn: "2026-11-07",
    targetId: "schkm-marathon",
    groupId: "schkm-2027-marathon",
    groupLabel: "全馬",
    intro: "橋隧起伏有挑戰，港島尾段打氣有氣氛；啟德博覽會的體驗則有不同看法。",
    reminders: ["按自己能力部署橋隧段配速", "個人能量補充先有計劃"],
    scope:
      "三位自述參加2025全馬的作者；蜘蛛人校長為馬拉松2組，其餘起跑批次未明。參賽身份未獨立核實，不代表全體或其他年份，不合併編輯評分。",
    topics: [
      {
        title: "賽道",
        summary:
          "Rickie Kwong 提到橋隧上落及逆風辛苦，但喜歡港島市區尾段的打氣；miracle3 對突破個人紀錄感到滿足，也提到尾段打氣人群。感受與個人狀態有關，不構成客觀難度量度。",
        sources: [
          {
            author: "Rickie Kwong",
            quote: "坦白講，新不如舊！\n上上落落再加陣陣逆風",
            url: "https://rickiekwong.blogspot.com/2025/03/hk-actions-2025-standard-chartered-hong.html",
            excerpt: true,
            postedOn: "2025-03-27",
            scope: "全馬；個人狀態與賽事感受分開。",
          },
          {
            author: "miracle3",
            quote: "全馬PB紀錄，終於由3:50，改寫為 3:34。",
            url: "https://www.threads.com/@miracle3/post/DGBF5FEylG5",
            excerpt: true,
            postedOn: "2025-02-13",
            scope: "全馬；2025起跑批次未明，挑戰組目標不可視作當日起跑組別。",
          },
        ],
      },
      {
        title: "大會安排",
        summary:
          "蜘蛛人校長認為啟德領物資的組別分流清楚；Rickie Kwong 則較喜歡以往博覽會安排。兩者觀察不同，不推算整體滿意度。",
        sources: [
          {
            author: "蜘蛛人校長",
            quote: "報到領完物資後\n只有標準的水、運動飲料",
            url: "https://running.biji.co/index.php?act=detail&id=57168&q=review",
            excerpt: true,
            postedOn: "2025-03-02",
            scope: "自述馬拉松2組；此節錄對應領物資段落。",
          },
          {
            author: "Rickie Kwong",
            quote: "坦白講，新不如舊！\n上上落落再加陣陣逆風",
            url: "https://rickiekwong.blogspot.com/2025/03/hk-actions-2025-standard-chartered-hong.html",
            excerpt: true,
            postedOn: "2025-03-27",
            scope: "作者對博覽會新舊安排的個人偏好。",
          },
        ],
      },
      {
        title: "補給",
        summary:
          "蜘蛛人校長形容供應以基本飲品及食物為主，自己只帶兩條能量膠，後段靠糖果補充；不能據此稱大會補給不足。其餘兩篇未提供足夠補給觀察。",
        sources: [
          {
            author: "蜘蛛人校長",
            quote: "報到領完物資後\n只有標準的水、運動飲料",
            url: "https://running.biji.co/index.php?act=detail&id=57168&q=review",
            excerpt: true,
            postedOn: "2025-03-02",
            scope: "自述只帶兩條能量膠，不能推論大會供應不足。",
          },
        ],
      },
    ],
  },
  {
    raceId: "standard-chartered-hk-marathon-2027",
    editionYear: 2025,
    sourceName: "多來源跑手意見",
    sourceUrl: "https://www.marathonsworld.com/artapp/racedetail.php?rid=22176",
    checkedOn: "2026-11-07",
    targetId: "schkm-half-opinions",
    groupId: "schkm-2027-half",
    groupLabel: "半馬",
    scope:
      "一位半馬作者自述；同日回覆確認半馬：https://www.threads.com/@_9walker_/post/DF2lFqQy-0j 。起跑批次未明，參賽身份未獨立核實，不能套用全馬。",
    topics: [
      {
        title: "賽道及取水體驗",
        summary:
          "_9walker_（2025-02-09）表示早段人多影響配速，並希望水杯裝少一點。作者在同日回覆確認跑半馬；不能套用全馬，也不是缺水投訴。",
        sources: [
          {
            author: "_9walker_",
            quote: "塞人塞到早段俾人帶住 pacing",
            url: "https://www.threads.com/@_9walker_/post/DF2UaD3SUK1",
            excerpt: true,
            postedOn: "2025-02-09",
            scope: "半馬；水杯份量偏好不是缺水投訴。",
          },
        ],
      },
    ],
  },
  {
    raceId: "standard-chartered-hk-marathon-2027",
    editionYear: 2025,
    sourceName: "多來源跑手意見",
    sourceUrl: "https://www.marathonsworld.com/artapp/racedetail.php?rid=22176",
    checkedOn: "2026-11-07",
    targetId: "schkm-unscoped-opinions",
    groupLabel: "組別未明",
    scope:
      "四位來源作者的距離及批次未明，暫不納入組別評價。MW三項按2025專頁歸屬，未顯示出帖日期，不能當成2025年2月出帖。所有參賽身份未獨立核實，不代表2026／2027安排，不新增、轉載或合併分數。",
    topics: [
      {
        title: "補充來源 · 暫不納入組別評價",
        summary:
          "IG peitea（2025-02-20）自述參賽並喜歡賽事，希望橋段有更多賽事攝影；距離及起跑批次未明。 MW Chris 覺得跑入西隧新鮮，但出隧道上斜辛苦；DVS 建議增加賽前洗手間；Lawrence Hui 認為受傷跑手支援基本足夠，但希望等候時間縮短。三項均可確認收錄於2025專頁，未顯示出帖日期、距離或批次，不能當作2025年2月出帖，也不能套用全馬或半馬。",
        sources: [
          {
            author: "peitea",
            quote: "I joined . I love it.\nhope in the bridge too",
            url: "https://www.instagram.com/p/DGSiaXLCI3E/c/18020384795466442/",
            excerpt: true,
            postedOn: "2025-02-20",
            scope: "距離及起跑批次未明；日期按該留言 time 欄位核對。",
          },
          {
            author: "Chris",
            quote: "出隧道好斜，好難跑",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=728509",
            excerpt: true,
            postedOn: null,
            scope: "2025專頁所列評價；出帖日期、距離及起跑批次未明。",
          },
          {
            author: "DVS",
            quote: "賽前可以增加洗手間",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=699975",
            excerpt: true,
            postedOn: null,
            scope: "2025專頁所列評價；出帖日期、距離及起跑批次未明。",
          },
          {
            author: "Lawrence Hui",
            quote: "支援基本充足\n縮短等候時間會更好",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=655420",
            excerpt: true,
            postedOn: null,
            scope: "2025專頁所列評價；出帖日期、距離及起跑批次未明。",
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
      (record.groupId
        ? record.raceId === race.id && record.groupId === group.id
        : record.targetId === target?.id) && record.editionYear <= Number(group.date.slice(0, 4)),
  );
}

export function unscopedRunnerOpinionsForRace(race: Race) {
  return runnerOpinions.filter(
    (r) =>
      r.raceId === race.id &&
      !r.groupId &&
      r.groupLabel === "組別未明" &&
      r.editionYear <= Number(race.date.slice(0, 4)),
  );
}
