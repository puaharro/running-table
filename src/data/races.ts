import type { Race, RaceGroup, Region } from "@/lib/types";

// All names, dates, prices and locations below are fictional prototype fixtures.
// Never mark these records verified or publish Event structured data for them.
const group = (id: string, km: number, date: string, status: RaceGroup["status"], deadline?: string): RaceGroup => ({
  id, name: km === 21.0975 ? "半馬組" : km === 42.195 ? "全馬組" : `${km}K 組`,
  distanceKm: km, date, price: km > 20 ? 480 : 280, status, deadline,
  registrationStart: status === "upcoming" ? "2026-12-01" : "2026-09-01",
  limit: "須以正式大會公布為準；此處為示範。",
});
function make(id: string, name: string, en: string, date: string, region: Region, district: string, venue: string, groups: RaceGroup[], tags: string[] = []): Race {
  return { id, slug: id, name, englishName: en, date, endDate: date, region, district, venue, groups, tags,
    sport: "路跑", status: "scheduled", organizer: "跑期示範活動組（虛構）", verification: "demo", sourceUrl: null, updatedAt: "2026-10-21",
    summary: `以${venue}為情境設計嘅路跑資料，用嚟預覽組別、報名及選賽資訊嘅呈現方式。活動名稱、日期、收費及安排全部係示範，並非真實賽事公告。`,
    highlights: ["先比較每個組別嘅距離、費用及報名狀態。", "路線、時限及年齡限制仍須逐項核實。", "此示範活動未經主辦方核實，請勿據此安排報名或交通。"],
    transport: `此頁以${venue}作示範地點。集合點、接駁安排同實際交通未經核實，正式頁面會按大會公告補充。`,
  };
}
export const races: Race[] = [
  make("harbour-morning-2026", "海濱晨光路跑", "Harbour Morning Run", "2026-11-08", "九龍", "觀塘", "觀塘海濱", [group("hm5", 5, "2026-11-08", "open", "2026-10-30"), group("hm10", 10, "2026-11-08", "full", "2026-10-30")], ["海濱", "親子"]),
  make("river-loop-2026", "河畔十公里挑戰", "River Loop 10K", "2026-11-15", "新界", "沙田", "沙田河畔", [group("rl10", 10, "2026-11-15", "open", "2026-11-01")], ["河畔"]),
  make("island-sunrise-2026", "港島日出半馬", "Island Sunrise Half", "2026-11-22", "港島", "東區", "港島東海濱", [group("is21", 21.0975, "2026-11-22", "waitlist", "2026-11-08"), group("is10", 10, "2026-11-22", "closed", "2026-10-10")], ["半馬", "海濱"]),
  make("family-smiles-2026", "親子同步跑", "Family Smiles Run", "2026-11-29", "新界", "將軍澳", "將軍澳海濱", [group("fs3", 3, "2026-11-29", "open", "2026-11-15"), group("fs5", 5, "2026-11-29", "open", "2026-11-15")], ["親子", "慈善"]),
  make("island-breeze-2026", "離島微風路跑", "Island Breeze Run", "2026-12-06", "離島", "大嶼山", "東涌海濱", [group("ib5", 5, "2026-12-06", "unknown"), group("ib10", 10, "2026-12-06", "unknown")], ["海濱"]),
  make("city-mile-2026", "城市一哩跑步日", "City Mile Day", "2026-12-13", "九龍", "九龍城", "啟德", [group("cm16", 1.609, "2026-12-13", "open", "2026-11-29")], ["短途", "親子"]),
  make("winter-long-run-2026", "冬日長跑路跑祭", "Winter Running Festival", "2026-12-20", "新界", "大埔", "大埔海濱", [group("wl10", 10, "2026-12-20", "closed", "2026-10-15"), group("wl42", 42.195, "2026-12-20", "open", "2026-12-01")], ["全馬", "多組別"]),
  make("new-year-stride-2027", "新年第一步", "New Year Stride", "2027-01-03", "港島", "中西區", "中環海濱", [group("ny5", 5, "2027-01-03", "upcoming", "2026-12-20"), group("ny10", 10, "2027-01-03", "upcoming", "2026-12-20")], ["海濱"]),
  make("coastal-half-2027", "沿岸半馬挑戰", "Coastal Half Challenge", "2027-01-17", "新界", "西貢", "西貢海濱", [group("ch21", 21.0975, "2027-01-17", "upcoming", "2027-01-03")], ["半馬"]),
  make("spring-road-fest-2027", "春日路跑週末", "Spring Road Weekend", "2027-02-06", "離島", "大嶼山", "東涌", [group("sr5", 5, "2027-02-06", "upcoming", "2027-01-24"), group("sr10", 10, "2027-02-07", "upcoming", "2027-01-24")], ["多日活動"]),
  { ...make("autumn-community-2026", "秋日社區跑", "Autumn Community Run", "2026-10-11", "九龍", "黃大仙", "鑽石山", [group("ac5", 5, "2026-10-11", "closed", "2026-09-27")], ["社區"]), status: "completed" },
  { ...make("bay-charity-2026", "海灣慈善路跑", "Bay Charity Run", "2026-11-01", "港島", "南區", "南區海濱", [group("bc10", 10, "2026-11-01", "closed")], ["慈善"]), status: "cancelled" },
];
races.find(r => r.id === "spring-road-fest-2027")!.endDate = "2027-02-07";
