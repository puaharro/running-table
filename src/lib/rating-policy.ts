// Human editorial judgments; scores are never inferred from catalog facts.
export const ratingPolicy = {
  version: "2026-10-30-experience-v1",
  publisher: "NXTGO 編輯",
  dimensions: {
    course: {
      title: "賽道體驗",
      prompt: "起步擠塞、超車空間、折返、路面、指示、景觀及後段節奏，有咩實際感受？",
      anchors: [
        "多處嚴重擠塞或指示／路面問題，明顯妨礙完成賽程。",
        "多個路段不順暢，超車、折返或指示有明顯改善需要。",
        "整體可順暢完成，但部分路段或設計影響體驗。",
        "大部分路段順暢、指示清楚，有值得再跑的特色。",
        "在所觀察路段及時段，流動、指示及路線特色均表現出色，並有具體紀錄支持。",
      ],
    },
    organization: {
      title: "大會執行",
      prompt: "領物、寄存、廁所、起跑分流、工作人員、突發處理及離場，邊度順／唔順？",
      anchors: [
        "關鍵流程嚴重失效或支援不足，明顯影響參賽。",
        "多個流程混亂、久候或指引不足，需大幅改善。",
        "基本流程到位，仍有排隊、分流或溝通問題。",
        "主要流程順暢，指引及支援清楚，少量細節可改善。",
        "所觀察的賽前、賽中及賽後流程均有效率，問題處理有具體良好紀錄。",
      ],
    },
    aid: {
      title: "補給體驗",
      prompt: "補給位置、取用動線、飲品／食物、排隊及你到站時的餘量，實際點樣？",
      anchors: [
        "主要補給嚴重不足或無法取用，有具體影響紀錄。",
        "多站供應或取用不穩定，需明顯改善。",
        "基本供應到位，但位置、取用或選擇有改善空間。",
        "供應配合賽程，取用大致順暢，只有少量不足。",
        "供應、位置及取用均出色，並有後段跑手到站時仍穩定供應的紀錄。",
      ],
    },
  },
} as const;
export type RatingDimension = keyof typeof ratingPolicy.dimensions;
export const ratingDimensions = Object.keys(ratingPolicy.dimensions) as RatingDimension[];
export const scoreLabels = ["", "欠佳", "待改善", "合格", "出色", "卓越"] as const;
export const evidenceLabels = {
  participation: "親身參賽紀錄",
  interview: "跑手訪問",
  "course-analysis": "路線／影片分析",
  "official-plan": "官方安排（輔助）",
} as const;
export const segmentLabels = {
  front: "前段",
  middle: "中段",
  back: "後段",
  unknown: "未記錄",
} as const;

// Explicit group mappings avoid applying marathon reviews to the half or 10K.
export const reviewTargets = [
  {
    id: "hzmb-half",
    name: "港珠澳大橋半馬拉松",
    group: "半馬",
    raceId: "hzmb-half-marathon-2026",
    groupId: "hzmb-2026-half",
    draftYear: "2025",
  },
  {
    id: "schkm-marathon",
    name: "渣打香港馬拉松",
    group: "全馬",
    raceId: "standard-chartered-hk-marathon-2027",
    groupId: "schkm-2027-marathon",
    draftYear: "2026",
  },
] as const;
