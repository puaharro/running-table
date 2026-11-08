import { reviewTargets } from "@/lib/rating-policy";
import type { Race, RaceGroup } from "@/lib/types";

type SourceExcerpt = {
  reference: string;
  author: string;
  confirmationUrl?: string;
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
  publicationVersion: string;
  fullText: string;
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

// Owner explicitly approved HZMB 2025 v2 and SCHKM 2025 v5 on 2026-11-08.
// Source check dates are unchanged: publication is not a new source verification.
// Unapproved material and original private research remain outside the public source.
// Mobile summary v1 explicitly approved by the owner on 2026-11-08.
// Full approved reviews, public source excerpts, dates and scopes are retained.
export const runnerOpinions: RunnerOpinions[] = [
  {
    targetId: "hzmb-half",
    editionYear: 2025,
    sourceName: "Marathon’s World",
    sourceUrl: "https://www.marathonsworld.com/artapp/racedetail.php?rid=22553",
    checkedOn: "2026-11-06",
    scope:
      "以上整理自 Marathon’s World 港珠澳半馬 2025 專頁，涵蓋 20 個來源帳戶的相關留言；同一帳戶涉及多項主題只計一次。實際起跑批次及完賽位置多數未明，出帖日期未顯示；2025 是專頁屆次，不是已核實的出帖年份。參賽身份未獨立核實，來源數不代表支持票、整體滿意度或全體跑手經驗，亦不代表其他年份安排。\n另有 27 則欠缺具體體驗的短評及 5 個 Threads 背景／年份未明線索，保留於私人研究附件，不納入上述三項結論。本文為跑手意見整理，與編輯評論分開，不新增分數。",
    topics: [
      {
        title: "賽道",
        summary: "有人覺得好跑，亦有人感到起伏；建議擴闊頭 3 公里。",
        sources: [
          {
            reference: "H01",
            author: "Lai Siu Fung",
            quote: "很喜歡的一條賽道",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=682235",
            scope: "正面感受，未指明路段。",
            postedOn: null,
          },
          {
            reference: "H02",
            author: "leo",
            quote: "ok好跑",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=631648",
            scope: "未說明坡度、路面或擠塞。",
            postedOn: null,
          },
          {
            reference: "H03",
            author: "Belton Chan",
            quote: "一條具挑戰性的賽道",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=631372",
            scope: "挑戰感受不等於負面評價。",
            postedOn: null,
          },
          {
            reference: "H04",
            author: "Fifi Lau",
            quote: "路線有上落, 大會整體流暢",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=631197",
            scope: "同一來源涉及賽道及安排，只計一次。",
            postedOn: null,
          },
          {
            reference: "H05",
            author: "ALe",
            quote: "在上斜路段接近了隊伍就跟著一起跑",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=631295",
            scope: "個人配速及PB紀錄，不能推論普遍容易PB；不把身體狀況歸因於大會。",
            postedOn: null,
            excerpt: true,
          },
          {
            reference: "H07",
            author: "Yuk Yuen",
            quote: "賽道有上有落，當日天氣氣溫適宜長跑活動。和暖大橋無咁大風。",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=630864",
            scope: "當天天氣的個人感受，不推論其他年份。",
            postedOn: null,
          },
          {
            reference: "H08",
            author: "聰少",
            quote: "期待路線可以更完善。",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=630860",
            scope: "未指明路段或具體問題。",
            postedOn: null,
          },
          {
            reference: "H09",
            author: "Natalie Ngan",
            quote: "頭3K可以擴闊賽道就更好",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=630857",
            scope: "改善建議，未描述嚴重擠塞或事故。",
            postedOn: null,
          },
        ],
      },
      {
        title: "大會安排",
        summary: "有人肯定較前屆改善；亦有時間安排及早起負擔意見。",
        sources: [
          {
            reference: "H10",
            author: "Christie Leung",
            quote: "零晨3:00起身消耗精神",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=630718",
            scope: "個人起床時間，不代表所有跑手需要同樣早起。",
            postedOn: null,
            excerpt: true,
          },
          {
            reference: "H11",
            author: "rockiec",
            quote: "比去年有改善：廁所多咗、賽道駁口位覆蓋膠墊、下車至起點距離縮短",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=630594",
            scope: "作者跨屆比較，未獨立核對數量或距離。",
            postedOn: null,
          },
          {
            reference: "H12",
            author: "Tina chen",
            quote: "大會比上一屆準備的好很多！",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=631425",
            scope: "未列出具體改進項目。",
            postedOn: null,
          },
          {
            reference: "H13",
            author: "Bentomama Super",
            quote: "－切安排非常順暢",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=631305",
            scope: "原文首字為「－」；未具體描述安檢、行李或接駁。",
            postedOn: null,
          },
          {
            reference: "H14",
            author: "mcfai",
            quote: "Time arrangement is bad",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=631309",
            scope: "未說明涉及哪個環節。",
            postedOn: null,
          },
          {
            reference: "H15",
            author: "Ernest Lee",
            quote: "至少落車不用行多2 K左右去起跑區！",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=631225",
            scope: "作者跨屆比較，不當作今屆步行距離的量度。",
            postedOn: null,
            excerpt: true,
          },
          {
            reference: "H16",
            author: "ric",
            quote: "Well organised compared to last year’s!",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=631115",
            scope: "跨屆主觀比較，未指明具體流程。",
            postedOn: null,
          },
          {
            reference: "H17",
            author: "Billy Tsang",
            quote: "大會比賽安排過程不錯，氣氛也強烈",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=630692",
            scope: "未採用原文對另一賽事的跨賽事比較。",
            postedOn: null,
            excerpt: true,
          },
          {
            reference: "H18",
            author: "腸粉跑馬拉松",
            quote: "希望中間有幫選手加油環節去增強氣氛",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=630633",
            scope: "改善建議，不等於全程沒有打氣。",
            postedOn: null,
          },
        ],
      },
      {
        title: "補給",
        summary: "第一槍跑手覺得水站夠用；亦有人希望加站或增加補給品。",
        sources: [
          {
            reference: "H06",
            author: "Rocky",
            quote: "水站數量足夠",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=630878",
            scope:
              "自述第一槍出發、進水站容易；另認為手冊未清楚列出水站里數。不代表其他批次或後段供應。",
            postedOn: null,
            excerpt: true,
          },
          {
            reference: "H19",
            author: "Lawrence Hui",
            quote: "希望多加一個補給站",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=655421",
            scope: "加站建議不等於曾經斷水或取不到飲品。",
            postedOn: null,
          },
          {
            reference: "H20",
            author: "Joe Lam",
            quote: "補給品可要增加一些",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=631080",
            scope: "未指明品種或份量，不採用沒有具體對照賽事的跨地區比較。",
            postedOn: null,
            excerpt: true,
          },
        ],
      },
    ],
    publicationVersion: "v2",
    fullText:
      "港珠澳半馬 2025｜跑手意見 v2（完整確認稿）\n\n一句總結：賽道有起伏，跑手對好跑程度各有感受；有人肯定安排較前屆改善，亦有水站資訊、補給及沿途氣氛的改善建議。\n\n賽道\n有跑手喜歡這條賽道，覺得好跑或賽道不錯；亦有人形容路線有上落、具挑戰性。一位跑手建議擴闊頭 3 公里，另一位希望路線更完善，但沒有指明路段。這些是個人感受及改善建議，不能據此判定普遍容易做時間，或認定發生嚴重擠塞。[H01–H09]\n\n大會安排\n有跑手覺得流程順暢、比前屆進步；其中一則具體提到廁所、賽道接駁位膠墊及下車至起點路程的改善，另有跑手肯定下車後往起跑區的安排。這些跨屆比較未經獨立量度。[H04、H11–H13、H15–H16]\n同時，一位跑手不滿時間安排，但未說明涉及哪個環節；另一位提到凌晨 3 時起床帶來精神負荷，並非所有跑手都需要同一時間起床。沿途氣氛亦有不同觀感：有人覺得氣氛強烈，也有人希望增加中段打氣環節。[H10、H14、H17–H18]\n\n補給\n一位自述第一槍出發的跑手覺得水站數量足夠、容易進入，但希望跑手手冊更清楚列出水站里數。另有兩位分別希望增加一個補給站，以及增加補給品。增加站數或補給品的建議，不等於曾經斷水或取不到飲品；第一槍的觀察亦不能代表其他批次或後段供應。[H06、H19–H20]\n\n兩個提醒\n• 留意起伏路段，按自己能力安排配速。\n• 賽前查清當屆交通流程及水站位置，預先安排個人能量補充。\n\n觀察範圍\n以上整理自 Marathon’s World 港珠澳半馬 2025 專頁，涵蓋 20 個來源帳戶的相關留言；同一帳戶涉及多項主題只計一次。實際起跑批次及完賽位置多數未明，出帖日期未顯示；2025 是專頁屆次，不是已核實的出帖年份。參賽身份未獨立核實，來源數不代表支持票、整體滿意度或全體跑手經驗，亦不代表其他年份安排。\n另有 27 則欠缺具體體驗的短評及 5 個 Threads 背景／年份未明線索，保留於私人研究附件，不納入上述三項結論。本文為跑手意見整理，與編輯評論分開，不新增分數。",
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
    scope:
      "保留 8 個來源帳戶：全馬 3 個、半馬 1 個、組別未明 4 個；同一帳戶跨主題只計一次。出帖日期、組別確認連結及原文節錄另列於來源附件。三則 Marathon’s World 留言按 2025 賽事專頁歸屬，但沒有顯示出帖日期，不能當作已核實的 2025 年 1–2 月帖子。IG 使用留言日期，不以父帖日期代替。\n所有參賽身份未獨立核實，並非代表性樣本或全面平台搜尋結果，不代表全體跑手或 2026／2027 安排。另有一則 FB 候選缺乏組別及具體體驗，保留私人來源但不納入正文結論。本文與編輯評論分開，不新增分數。",
    topics: [
      {
        title: "賽道",
        summary: "港島尾段打氣有氣氛；橋隧上落及逆風有挑戰。",
        sources: [
          {
            author: "Rickie Kwong",
            quote: "上上落落再加陣陣逆風",
            url: "https://rickiekwong.blogspot.com/2025/03/hk-actions-2025-standard-chartered-hong.html",
            excerpt: true,
            postedOn: "2025-03-27",
            scope: "全馬；個人狀態與賽事感受分開。",
            reference: "S02",
          },
          {
            author: "miracle3",
            quote: "全馬PB紀錄，終於由3:50，改寫為 3:34。",
            url: "https://www.threads.com/@miracle3/post/DGBF5FEylG5",
            excerpt: true,
            postedOn: "2025-02-13",
            scope: "全馬；2025起跑批次未明，挑戰組目標不可視作當日起跑組別。",
            reference: "S03",
          },
        ],
      },
      {
        title: "大會安排",
        summary: "啟德領物資分流獲肯定；亦有人較喜歡以往安排。",
        sources: [
          {
            author: "蜘蛛人校長",
            quote: "報到領完物資後",
            url: "https://running.biji.co/index.php?act=detail&id=57168&q=review",
            excerpt: true,
            postedOn: "2025-03-02",
            scope: "自述馬拉松2組；此節錄對應領物資段落。",
            reference: "S01",
          },
          {
            author: "Rickie Kwong",
            quote: "坦白講，新不如舊！",
            url: "https://rickiekwong.blogspot.com/2025/03/hk-actions-2025-standard-chartered-hong.html",
            excerpt: true,
            postedOn: "2025-03-27",
            scope: "作者對博覽會新舊安排的個人偏好。",
            reference: "S02",
          },
        ],
      },
      {
        title: "補給",
        summary: "一位跑手形容供應以基本飲品為主；未能判斷整體補給。",
        sources: [
          {
            author: "蜘蛛人校長",
            quote: "只有標準的水、運動飲料",
            url: "https://running.biji.co/index.php?act=detail&id=57168&q=review",
            excerpt: true,
            postedOn: "2025-03-02",
            scope: "自述只帶兩條能量膠，不能推論大會供應不足。",
            reference: "S01",
          },
        ],
      },
    ],
    publicationVersion: "v5",
    fullText:
      "全馬留言肯定港島尾段打氣，也提到橋隧起伏的挑戰；領物資感受不一，半馬早段人流及組別未明意見分開看。\n\n全馬｜3 個來源帳戶自述參賽，起跑批次及完賽位置多數未明\n\n賽道\n兩位全馬跑手提到港島尾段打氣有氣氛；其中一位亦覺得橋隧上落及當日逆風辛苦。另一位分享刷新個人最佳時間的喜悅，但個人 PB 不能推論賽道普遍容易做時間。這些是個人體驗，並非客觀難度量度。[S01–S03]\n\n大會安排\n一位跑手認為啟德領物資的組別分流清楚；另一位較喜歡以往的博覽會安排。兩者關注點不同，不能由此推算整體滿意度，亦沒有足夠材料評價所有寄存、起跑或離場流程。[S01–S02]\n\n補給\n一位跑手形容供應以基本飲品為主，並記錄自己只帶兩條能量膠、後段靠糖果補充的經歷。這是其補充能量的個人經驗，不能據此認定大會補給不足或斷供。其餘全馬來源沒有足夠補給細節，暫不作整體判斷。[S01]\n\n兩個提醒\n• 全馬橋隧段按能力部署配速，個人能量補充先有計劃。\n• 留意留言所屬組別及批次；半馬早段人流、組別未明意見，不套用到自己的全馬安排。",
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
      "保留 8 個來源帳戶：全馬 3 個、半馬 1 個、組別未明 4 個；同一帳戶跨主題只計一次。出帖日期、組別確認連結及原文節錄另列於來源附件。三則 Marathon’s World 留言按 2025 賽事專頁歸屬，但沒有顯示出帖日期，不能當作已核實的 2025 年 1–2 月帖子。IG 使用留言日期，不以父帖日期代替。\n所有參賽身份未獨立核實，並非代表性樣本或全面平台搜尋結果，不代表全體跑手或 2026／2027 安排。另有一則 FB 候選缺乏組別及具體體驗，保留私人來源但不納入正文結論。本文與編輯評論分開，不新增分數。",
    topics: [
      {
        title: "賽道",
        summary: "一位半馬跑手指早段人多、影響配速。",
        sources: [
          {
            author: "_9walker_",
            quote: "塞人塞到早段俾人帶住 pacing",
            url: "https://www.threads.com/@_9walker_/post/DF2UaD3SUK1",
            excerpt: true,
            postedOn: "2025-02-09",
            scope: "半馬；水杯份量偏好不是缺水投訴。",
            reference: "S04",
            confirmationUrl: "https://www.threads.com/@_9walker_/post/DF2lFqQy-0j",
          },
        ],
      },
      {
        title: "大會安排",
        summary: "資料不足，暫不作判斷。",
        sources: [],
      },
      {
        title: "補給",
        summary: "同一跑手希望水杯少裝一點；並非缺水投訴。",
        sources: [],
      },
    ],
    publicationVersion: "v5",
    fullText:
      "半馬｜1 個來源帳戶自述參賽，起跑批次未明\n\n賽道：一位跑手表示早段人多影響配速；沒有足夠材料判斷其他批次的人流。[S04]\n大會安排：現有材料不足，暫不作判斷。\n補給：同一位跑手希望水杯裝少一點，屬取水使用感受，並非缺水投訴。作者在同日回覆確認跑半馬，這兩項觀察不套用到全馬。[S04、S04a]",
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
      "保留 8 個來源帳戶：全馬 3 個、半馬 1 個、組別未明 4 個；同一帳戶跨主題只計一次。出帖日期、組別確認連結及原文節錄另列於來源附件。三則 Marathon’s World 留言按 2025 賽事專頁歸屬，但沒有顯示出帖日期，不能當作已核實的 2025 年 1–2 月帖子。IG 使用留言日期，不以父帖日期代替。\n所有參賽身份未獨立核實，並非代表性樣本或全面平台搜尋結果，不代表全體跑手或 2026／2027 安排。另有一則 FB 候選缺乏組別及具體體驗，保留私人來源但不納入正文結論。本文與編輯評論分開，不新增分數。",
    topics: [
      {
        title: "賽道",
        summary: "一位跑手覺得西隧新鮮，但出隧道上斜辛苦。",
        sources: [
          {
            author: "Chris",
            quote: "出隧道好斜，好難跑",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=728509",
            excerpt: true,
            postedOn: null,
            scope: "2025專頁所列評價；出帖日期、距離及起跑批次未明。",
            reference: "S06",
          },
        ],
      },
      {
        title: "大會安排",
        summary: "傷者支援基本足夠，亦有等候、廁所及攝影改善意見。",
        sources: [
          {
            author: "peitea",
            quote: "I joined . I love it.\nhope in the bridge too",
            url: "https://www.instagram.com/p/DGSiaXLCI3E/c/18020384795466442/",
            excerpt: true,
            postedOn: "2025-02-20",
            scope:
              "距離及起跑批次未明；日期按該留言 time 欄位核對。 此處各行為非連續原文節錄，並非連續句子。",
            reference: "S05",
          },
          {
            author: "DVS",
            quote: "賽前可以增加洗手間",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=699975",
            excerpt: true,
            postedOn: null,
            scope: "2025專頁所列評價；出帖日期、距離及起跑批次未明。",
            reference: "S07",
          },
          {
            author: "Lawrence Hui",
            quote: "支援基本充足\n縮短等候時間會更好",
            url: "https://www.marathonsworld.com/artapp/rating_detail.php?rid=655420",
            excerpt: true,
            postedOn: null,
            scope:
              "2025專頁所列評價；出帖日期、距離及起跑批次未明。 此處各行為非連續原文節錄，並非連續句子。",
            reference: "S08",
          },
        ],
      },
      {
        title: "補給",
        summary: "資料不足，暫不作判斷。",
        sources: [],
      },
    ],
    publicationVersion: "v5",
    fullText:
      "組別未明｜4 個來源帳戶，另列參考，不納入全馬或半馬結論\n\n賽道：一位跑手覺得跑入西隧新鮮，同時形容出隧道上斜辛苦；不能將其個人身體狀況歸因於賽道。[S06]\n大會安排：一則 IG 留言表示喜歡賽事，希望橋段有更多攝影；這不代表橋段完全沒有攝影。另有跑手建議增加賽前洗手間；還有一則意見認為受傷跑手支援基本足夠，但希望縮短等候。沒有具體位置、等候時間或個案資料，不延伸成所有起跑區不足或醫療失當的結論。[S05、S07–S08]\n補給：這四個來源沒有足夠具體觀察，暫不作判斷。",
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
