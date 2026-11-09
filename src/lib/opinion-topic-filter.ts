import type { RunnerOpinions } from "@/data/runner-opinions";

export const opinionTopics = ["交通", "寄存", "水站", "賽道", "賽事組織"] as const;
export type OpinionTopic = (typeof opinionTopics)[number];

export function topicComments(record: RunnerOpinions) {
  const entries = new Map<
    string,
    { source: RunnerOpinions["topics"][number]["sources"][number]; topics: OpinionTopic[] }
  >();
  for (const topic of record.topics) {
    for (const source of topic.sources) {
      const key = JSON.stringify([source.url, source.author, source.quote]);
      const entry = entries.get(key) ?? { source, topics: [] };
      const text = source.quote;
      const matches: OpinionTopic[] = [];
      if (/交通|接駁|巴士|港鐵|地鐵|shuttle|transport|\bbus\b|\bmtr\b/i.test(text))
        matches.push("交通");
      if (/寄存|行李|取袋|存包|baggage|bag drop|bag collection/i.test(text)) matches.push("寄存");
      if (/水站|補給站|飲水|飲品|供水|water|hydration|drink|aid station/i.test(text))
        matches.push("水站");
      if (topic.title === "賽道") matches.push("賽道");
      if (topic.title === "大會安排") matches.push("賽事組織");
      entry.topics = [...new Set([...entry.topics, ...matches])];
      entries.set(key, entry);
    }
  }
  return [...entries.values()];
}
