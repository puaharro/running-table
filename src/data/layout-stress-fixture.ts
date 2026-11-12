import type { Race, RegistrationChannel } from "@/lib/types";

// Fictional data for the local layout preview, never for the public catalog.
export function layoutStressRaces(races: Race[]): Race[] {
  return races.map((race) => {
    if (race.id === "hzmb-half-marathon-2026") {
      return {
        ...race,
        name: "【版面測試】海濱跑步節 WaterfrontCommunityRunningFestival",
        district: "HongKongWaterfrontCommunitySportsCentre",
        sourceUrl: "https://waterfront-running.example.com/",
      };
    }
    if (race.id !== "standard-chartered-hk-marathon-2027") return race;
    const [firstGroup, ...otherGroups] = race.groups;
    if (!firstGroup) return race;
    const organizer = "HongKongInternationalWaterfrontRunningAssociation";
    const source = "https://registration.waterfront-running.example.com/participant-information";
    const channels: RegistrationChannel[] = Array.from({ length: 6 }, (_, index) => ({
      id: `layout-stress-channel-${index + 1}`,
      type: "general",
      name: [
        "海外跑手優先報名 OverseasClubAffiliationRegistrationProgramme",
        "企業及跑會團體報名（須核實組別資格）",
        "公眾名額",
        "候補補錄",
        "本地跑會邀請",
        "團體贊助名額",
      ][index],
      registrationMethod: "網上報名",
      eligibility: "海外跑手須核對跑會會員資格及本屆參賽要求",
      price: index === 0 ? 12888.5 : index === 2 ? 0 : null,
      priceUnit: "每位跑手（團體報名另行核實）",
      currency: "HKD",
      status: index === 0 ? "open" : index === 3 ? "waitlist" : "unknown",
      registrationUrl: source,
      sourceIds: ["layout-stress-source"],
    }));
    return {
      ...race,
      name: "【版面測試】香港國際海濱長跑嘉年華 HongKongInternationalWaterfrontMarathonFestival 2027",
      englishName: "Hong Kong International Waterfront Marathon and Community Running Festival",
      venue: "HongKongWaterfrontCommunitySportsCentre",
      district: "HongKongWaterfrontCommunitySportsCentre",
      organizer,
      summary: "版面測試用虛構資料。參賽組別、各渠道資格、費用及起步位置可能各有不同。",
      groups: [
        {
          ...firstGroup,
          name: "海外跑會全馬組 InternationalWaterfrontRunningClubChampionship",
          channels,
        },
        ...otherGroups.map((group) => ({ ...group, channels: [] })),
        ...["5K 親子組", "10K 雙人組", "企業接力組", "公開體驗組"].map((name, index) => ({
          id: `layout-stress-group-${index + 1}`,
          name,
          date: firstGroup.date,
          distanceKm: index === 0 ? 5 : 10,
          channels: [],
        })),
      ],
      sourceUrl: source,
      sources: [
        {
          id: "layout-stress-source",
          title:
            "HongKongInternationalWaterfrontMarathonParticipantInformationAndRegistrationGuide.pdf",
          url: source,
          fields: ["賽事組別", "報名渠道及費用"],
          checkedAt: race.verifiedAt ?? race.updatedAt,
        },
      ],
      charityEntry: undefined,
      enquiryLinks: [],
    };
  });
}
