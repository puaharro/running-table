import { distanceLabel } from "@/lib/races";
import type { Race } from "@/lib/types";

export interface Guide {
  slug: string;
  category: string;
  title: string;
  description: string;
  readMinutes: number;
  accent: string;
  sections: { title: string; paragraphs: string[] }[];
  relatedDistance: string;
}
export function guideMatchesRace(guide: Guide, race: Race) {
  return (
    !guide.relatedDistance ||
    race.groups.some((group) => distanceLabel(group.distanceKm) === guide.relatedDistance)
  );
}

export const guides: Guide[] = [
  {
    slug: "choose-your-first-10k",
    category: "選賽指南",
    title: "如何選擇適合自己的首場 10 公里賽事？",
    description: "距離只是起點。從時限、路線到回程交通，逐項比較後再作決定。",
    readMinutes: 5,
    accent: "orange",
    relatedDistance: "10K",
    sections: [
      {
        title: "先確定參賽目標",
        paragraphs: [
          "您希望體驗賽事氣氛、與朋友一起完成比賽，還是比較完賽時間？先列出兩三項最重視的條件，例如日期合適、交通方便、費用合理，有助作出決定。",
          "同樣是 10 公里，路面、爬升和時限亦可能不同。賽事名稱未必涵蓋這些細節，應逐項查閱官方組別說明及路線資料。",
        ],
      },
      {
        title: "比較距離以外的四項條件",
        paragraphs: [
          "第一是路線，包括斜坡、圈數、折返點，以及路面是否符合您的準備。第二是時限，請留意全程及途中截點的安排，如有疑問可向主辦方查詢。",
          "第三係出發時間：將交通、存包同集合時間一齊計。第四係組別資格：年齡、個人或隊際、親子參加方式，都要按當屆條款核對。",
        ],
      },
      {
        title: "計算完整參賽成本",
        paragraphs: [
          "除報名費外，也可列出交通、必要裝備及其他實際支出。請核對費用是否包括行政費和接駁服務，並留意紀念品的領取安排。",
          "如您重視成績記錄，請核對官方是否提供計時、如何公布成績，以及有何相關認證。應以官方的明確說明作判斷。",
        ],
      },
      {
        title: "最後先按報名",
        paragraphs: [
          "列出日期、組別、費用、時限、交通、報名截止日期，以及退款或改期條款。標記尚未確認的項目，待核實後再付款。",
          "本指南提供選賽方法；個別賽事的資格、路線及條款，以主辦方最新正式公告為準。",
        ],
      },
    ],
  },
  {
    slug: "race-registration-checklist",
    category: "報名指南",
    title: "報名前須核對的事項",
    description: "整理報名時須留意的組別、個人資料、費用及確認通知。",
    readMinutes: 4,
    accent: "blue",
    relatedDistance: "",
    sections: [
      {
        title: "確認係當屆官方入口",
        paragraphs: [
          "先核對賽事年份、主辦方名稱及官方報名連結，避免使用往屆頁面。第三方資訊網站可協助整理資料，參賽資格及付款安排仍須向主辦方或指定平台確認。",
          "確認報名採用先到先得、抽籤還是候補方式。提交表格並不一定代表已取得名額。請記下截止日期，並確認是否另設付款期限。",
        ],
      },
      {
        title: "準備所需資料",
        paragraphs: [
          "按官方表格要求準備姓名、出生日期、聯絡方式、緊急聯絡人等資料。親子或隊際組別可能要額外參加者資料，實際要求逐場核對。",
          "請勿在公開討論區分享證件、付款卡資料或私人報名確認文件。如需查詢，請使用官方提供的聯絡渠道。",
        ],
      },
      {
        title: "付款前讀清楚條款",
        paragraphs: [
          "核對所選距離、組別、總收費、附加項目，以及取消、延期、轉名及退款安排。各賽事的安排可能不同，請查閱當屆條款。",
          "如已選擇尺碼、領取方式或接駁服務，請在付款前再次核對，並保留提交記錄。",
        ],
      },
      {
        title: "報名後，保存確認資料",
        paragraphs: [
          "保存交易記錄、確認電郵或報名編號。請以官方平台顯示的報名狀態為準，銀行扣款紀錄只供參考。留意領取選手包、集合時間及後續公告。",
          "如果未收到確認，先檢查垃圾郵件及官方帳戶，再按主辦方查詢流程處理，避免未核實就重複付款。",
        ],
      },
    ],
  },
  {
    slug: "compare-half-marathons",
    category: "選賽指南",
    title: "選擇半馬時，除了日期還要比較哪些項目？",
    description: "比較路線、時限、補給及交通等安排，選擇適合自己的比賽。",
    readMinutes: 5,
    accent: "green",
    relatedDistance: "半馬",
    sections: [
      {
        title: "用相同欄位比較",
        paragraphs: [
          "比較兩場半馬時，建議用同一組欄位：日期、起步時間、路線、爬升、截點、補給、交通、費用及報名狀態。欠缺資料的項目可標示為未知，未公布的項目仍可能設有限制。",
          "先列出必要條件，例如日期合適、前往起點的交通可行，再比較偏好的賽事特色。選擇時應查閱詳細資料。",
        ],
      },
      {
        title: "同時核對終點時限及途中截點",
        paragraphs: [
          "部分賽事除設有終點時限外，亦設有途中截點。請確認計時起點，以及未能如期通過截點的安排。資料不完整時，請向主辦方核實。",
          "可從路線圖了解折返點、圈數、坡道及起點與終點之間的距離，並一併參考官方高程圖。如路線尚未公布，可待資料齊備後再作判斷。",
        ],
      },
      {
        title: "預先規劃比賽日安排",
        paragraphs: [
          "請估算從住所前往起點所需的時間，確認起點與終點是否相同，並查閱行李寄存、接駁及選手包領取安排。這些細節會影響比賽日的體驗。",
          "補給站位置、供應內容同自備用品要求，都應以當屆選手指南為準，其他賽事的安排只供參考。",
        ],
      },
      {
        title: "選定賽事後再次核實",
        paragraphs: [
          "路線、時間及報名狀態都有機會更新。付款前請再次查閱官方公告，確認頁面日期，並保存所依據的資料。",
          "本篇提供整理選賽資訊的方法。主辦方規則及個人訓練建議須另行查閱。",
        ],
      },
    ],
  },
];
