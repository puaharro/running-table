import type { Race } from "./types";

// Publish the organiser referral without individual charity recruitment details.
export function simplifyCharityEntry(race: Race): Race {
  const charityChannels = race.groups.flatMap((group) =>
    group.channels.filter((c) => c.type === "charity"),
  );
  if (!charityChannels.length) return race;
  const official = race.sources?.find((source) => source.id === "schkm-charity");
  const charitySources = new Set(charityChannels.flatMap((channel) => channel.sourceIds));
  const groups = race.groups.map((group) => ({
    ...group,
    channels: group.channels.filter((c) => c.type !== "charity"),
    charityEntry: group.channels.some((c) => c.type === "charity")
      ? { officialUrl: official?.url ?? race.sourceUrl! }
      : undefined,
  }));
  const retainedSources = new Set(
    groups.flatMap((group) => [
      ...(group.sourceIds ?? []),
      ...(group.ratingEvidence?.sourceIds ?? []),
      ...group.channels.flatMap((channel) => channel.sourceIds),
    ]),
  );
  const charityOnly = groups.every((group) => group.channels.length === 0);
  const isMarathon = race.id === "standard-chartered-hk-marathon-2027";
  return {
    ...race,
    charityEntry: { available: true, officialUrl: official?.url ?? race.sourceUrl! },
    groups,
    enquiryLinks: undefined,
    summary: isMarathon
      ? "設全馬、半馬及十公里。一般、優先報名及住宿套票資料按渠道列出；設有慈善名額，詳情請查閱大會網站。"
      : race.id === "unicef-powerun-2027"
        ? "2027 年 1 月 3 日於香港迪士尼樂園度假區舉行，設半馬、10K、5K 及 3K 少年賽。設有慈善名額，詳情請查閱大會網站。"
        : race.summary,
    highlights: race.highlights.filter(
      (text) =>
        !/慈善|籌款|個人報名|半馬未見/.test(text) && !(charityOnly && /報名|截止/.test(text)),
    ),
    sources: race.sources
      ?.filter(
        (source) =>
          (!charitySources.has(source.id) && !/慈善|籌款/.test(source.title)) ||
          retainedSources.has(source.id) ||
          source.id === official?.id,
      )
      .map((source) =>
        charitySources.has(source.id) || source.id === official?.id
          ? {
              ...source,
              title: source.title.replace("：最低籌款額與集合安排", "：集合及參賽安排"),
              fields: source.fields.filter((field) => !/price|channels\./.test(field)).length
                ? source.fields.filter((field) => !/price|channels\./.test(field))
                : ["charityEntry"],
              note: undefined,
            }
          : source,
      ),
    changes: race.changes?.filter(
      (change) =>
        !/慈善|籌款|婦女動力|機構|個人報名/.test(change.note) &&
        !(charityOnly && /報名|個人|選單|名額/.test(change.note)),
    ),
  };
}
