import { createHash } from "node:crypto";

export const TOPIC_RULE_VERSION = "hk-topics-v1";
export const TOPICS = {
  transport: {
    label: "交通",
    terms: [
      "交通",
      "接駁",
      "巴士",
      "港鐵",
      "地鐵",
      "泊車",
      "停車",
      "塞車",
      "shuttle",
      "transport",
      "transportation",
      "bus",
      "buses",
      "MTR",
      "parking",
      "metro",
    ],
  },
  baggage: {
    label: "寄存",
    terms: [
      "寄存",
      "行李",
      "存包",
      "取包",
      "bag drop",
      "bag-drop",
      "baggage",
      "bag storage",
      "bag collection",
    ],
  },
  aid_stations: {
    label: "水站",
    terms: [
      "水站",
      "飲水站",
      "補給",
      "补给",
      "補水",
      "aid station",
      "aid stations",
      "water station",
      "water stations",
      "hydration station",
    ],
  },
  course: {
    label: "賽道",
    terms: [
      "賽道",
      "赛道",
      "路線",
      "路线",
      "上斜",
      "落斜",
      "斜坡",
      "爬坡",
      "轉彎",
      "窄路",
      "路面",
      "起伏",
      "course",
      "route",
      "elevation",
      "hill",
      "hills",
      "turns",
      "road surface",
    ],
  },
  organization: {
    label: "賽事組織",
    terms: [
      "賽事組織",
      "大會",
      "主辦",
      "賽會",
      "組織",
      "義工",
      "工作人員",
      "賽務",
      "賽事安排",
      "賽事通知",
      "race organization",
      "race organisation",
      "organizer",
      "organiser",
      "volunteer",
      "volunteers",
      "race management",
      "briefing",
    ],
  },
  other: { label: "其他", terms: [] },
};
export const TOPIC_KEYS = Object.keys(TOPICS);
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

function matchingText(text) {
  let normalized = "",
    offset = 0;
  const starts = [],
    ends = [];
  for (const char of text) {
    const value = /[\u200b\ufeff]/.test(char) ? "" : char.normalize("NFKC");
    normalized += value;
    for (let i = 0; i < value.length; i++) {
      starts.push(offset);
      ends.push(offset + char.length);
    }
    offset += char.length;
  }
  // Do not classify source links or tracking parameters as discussion content.
  normalized = normalized.replace(/https?:\/\/[^\s<>「」『』,，。！？、；]+/giu, (match) =>
    " ".repeat(match.length),
  );
  return { normalized, starts, ends };
}
export function classifyTopics(value) {
  const text = typeof value === "string" ? value : "",
    mapped = matchingText(text),
    evidence = [];
  let truncated = false;
  for (const [key, topic] of Object.entries(TOPICS)) {
    const hits = [];
    for (const term of topic.terms) {
      const escaped = term
        .normalize("NFKC")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace(/ +/g, "\\s+");
      const latin = /^[\x00-\x7f]+$/.test(term);
      const regex = new RegExp(latin ? `(?<![a-z0-9_])${escaped}(?![a-z0-9_])` : escaped, "giu");
      let match;
      while ((match = regex.exec(mapped.normalized))) {
        if (
          term === "course" &&
          /\bof\s+$/iu.test(mapped.normalized.slice(Math.max(0, match.index - 10), match.index))
        )
          continue;
        const start = mapped.starts[match.index],
          end = mapped.ends[match.index + match[0].length - 1];
        hits.push({
          topic: key,
          term,
          start,
          end,
          matched_text: text.slice(start, end),
          excerpt: text.slice(Math.max(0, start - 18), Math.min(text.length, end + 18)),
        });
        if (hits.length >= 200) {
          truncated = true;
          break;
        }
      }
      if (hits.length >= 200) break;
    }
    hits.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
    const selected = [];
    for (const hit of hits) {
      if (selected.some((previous) => hit.start < previous.end && hit.end > previous.start))
        continue;
      selected.push(hit);
    }
    if (selected.length > 10) truncated = true;
    evidence.push(...selected.slice(0, 10));
  }
  return {
    rule_version: TOPIC_RULE_VERSION,
    labels: TOPIC_KEYS.filter((key) => evidence.some((hit) => hit.topic === key)),
    evidence,
    evidence_truncated: truncated,
  };
}

export function topicsForRecord(record, saved = null) {
  const automatic = classifyTopics(record.original_text),
    digest = hash({ identity: record.identity, text: record.original_text });
  const valid = Boolean(
    saved &&
    ["pending", "confirmed", "uncertain"].includes(saved.status) &&
    saved.evidence_digest === digest &&
    Array.isArray(saved.labels) &&
    saved.labels.every((key) => Object.hasOwn(TOPICS, key)),
  );
  const active = valid && saved.status !== "pending";
  return {
    rule_version: TOPIC_RULE_VERSION,
    evidence_digest: digest,
    automatic,
    manual: saved ? structuredClone(saved) : null,
    effective_labels: active ? [...saved.labels] : [...automatic.labels],
    status:
      saved && !valid
        ? "stale"
        : active
          ? saved.status
          : automatic.labels.length
            ? "suggested"
            : "unclassified",
    source: active
      ? saved.status === "confirmed"
        ? "human_confirmed"
        : "human_uncertain"
      : "automatic",
    needs_review: !active || saved.status !== "confirmed",
  };
}
export function topicSummary(records) {
  return {
    total: records.length,
    confirmed: records.filter((row) => row.topics.status === "confirmed").length,
    uncertain: records.filter((row) => row.topics.status === "uncertain").length,
    needs_review: records.filter((row) => row.topics.needs_review).length,
    unclassified: records.filter((row) => row.topics.status === "unclassified").length,
    counts: TOPIC_KEYS.map((key) => ({
      key,
      label: TOPICS[key].label,
      count: records.filter((row) => row.topics.effective_labels.includes(key)).length,
      human_confirmed: records.filter(
        (row) => row.topics.status === "confirmed" && row.topics.effective_labels.includes(key),
      ).length,
    })),
  };
}
