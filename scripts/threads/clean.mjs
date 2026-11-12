import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { demoReport } from "./report.mjs";

export const RULE_VERSION = "hk-clean-v2";
export const PRESETS = {
  "hk-marathon": {
    name: "渣打香港馬拉松",
    aliases: [
      "渣馬",
      "渣打香港馬拉松",
      "香港馬拉松",
      "Hong Kong Marathon",
      "Standard Chartered Hong Kong Marathon",
      "SCHKM",
    ],
  },
  "hzmb-half": {
    name: "港珠澳大橋香港段半馬拉松",
    aliases: [
      "港珠澳大橋半馬",
      "港珠澳大橋香港段半馬拉松",
      "Hong Kong-Zhuhai-Macao Bridge Half Marathon",
      "HZMB Half Marathon",
    ],
  },
  "mizuno-run-fest": {
    name: "美津濃香港跑步祭",
    aliases: ["美津濃香港跑步祭", "香港跑步祭", "Mizuno Hong Kong Run Fest", "Mizuno HK Run Fest"],
  },
  "unicef-hero-run": {
    name: "UNICEF HERO RUN 超能跑",
    aliases: ["UNICEF HERO RUN", "UNICEF 超能跑", "聯合國兒童基金會超能跑"],
  },
};
export const RESEARCH_PRESETS = { ...PRESETS };
// A catalogue target never proves that a historical edition exists.
const catalog = JSON.parse(
  readFileSync(new URL("../../src/data/catalog.json", import.meta.url), "utf8"),
);
for (const race of catalog) {
  if (["hzmb-half-marathon-2026", "standard-chartered-hk-marathon-2027"].includes(race.id))
    continue;
  const strip = (v) => v.replace(/\s*20\d{2}\s*/g, "").trim();
  const name = strip(race.name);
  if (Object.values(PRESETS).some((p) => p.name === name)) continue;
  RESEARCH_PRESETS[`catalog:${race.id}`] = {
    name,
    aliases: [...new Set([name, strip(race.englishName ?? "")].filter(Boolean))],
  };
}
const OTHER_RACES = [
  ...Object.entries(RESEARCH_PRESETS).map(([key, value]) => ({ key, aliases: value.aliases })),
  { key: "osaka", aliases: ["大阪馬拉松", "大阪マラソン", "Osaka Marathon", "大阪馬"] },
  { key: "tokyo", aliases: ["東京馬拉松", "東京マラソン", "Tokyo Marathon", "東京馬"] },
];
export const normalizeText = (text) =>
  typeof text === "string"
    ? text
        .normalize("NFKC")
        .replace(/[\u200B\uFEFF]/g, "")
        .replace(/\r\n?/g, "\n")
        .replace(/[\t\f\v \u00a0]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : "";
const fingerprint = (text) => normalizeText(text).replace(/\s+/g, " ");
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
function matches(text, aliases) {
  return aliases.filter((alias) => {
    const escaped = fingerprint(alias).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const boundary = /^[\x00-\x7f]+$/.test(alias) ? "[a-z0-9_]" : null;
    return new RegExp(
      boundary ? `(?<!${boundary})${escaped}(?:20\\d{2})?(?!${boundary})` : escaped,
      "iu",
    ).test(fingerprint(text));
  });
}

export function cleanReport(report, presetKey) {
  const preset = RESEARCH_PRESETS[presetKey];
  if (!preset) throw new Error("Unknown Hong Kong race preset.");
  const records = [
    ...report.posts.map((item) => ({ ...item, kind: "post" })),
    ...report.comments.map((item) => ({ ...item, kind: "comment" })),
  ]
    .map((item) => {
      const text = normalizeText(item.raw.text);
      const other = OTHER_RACES.filter(
        (race) => race.key !== presetKey && matches(text, race.aliases).length,
      ).map((race) => race.key);
      return {
        key: `${item.kind}:${item.id}`,
        kind: item.kind,
        id: item.id,
        root_post_id: item.root_post_id,
        parent_id: item.parent_id ?? item.raw.replied_to?.id ?? null,
        username: item.raw.username ?? null,
        clean_text: text,
        text_fingerprint: hash(fingerprint(text)),
        matched_aliases: matches(text, preset.aliases),
        other_races: other,
        mentioned_years: [
          ...new Set((text.match(/(?<!\d)(?:19|20|21)\d{2}(?!\d)/g) ?? []).map(Number)),
        ],
        keywords: item.keywords ?? [],
        collected_at: item.collected_at,
        permalink: item.raw.permalink ?? null,
        relevance: "review",
        relevance_basis: null,
        reasons: [],
        duplicate_of: null,
        possible_duplicate_of: null,
        disposition: "review",
        raw: structuredClone(item.raw),
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id, "en") || a.kind.localeCompare(b.kind, "en"));
  // Prefer the conversation observation when a search also returned that same reply ID.
  const byId = new Map();
  for (const record of records) if (!byId.has(record.id)) byId.set(record.id, record);
  const context = (record) => {
    const chain = [],
      seen = new Set([record.id]);
    let parentId =
      record.kind === "post" && record.id === record.root_post_id ? null : record.parent_id;
    while (parentId) {
      const parent = byId.get(parentId);
      if (!parent || parent.root_post_id !== record.root_post_id || seen.has(parentId))
        return { chain, incomplete: true };
      chain.push(parent);
      seen.add(parentId);
      if (parent.id === record.root_post_id) return { chain, incomplete: false };
      parentId = parent.parent_id;
    }
    return { chain, incomplete: record.id !== record.root_post_id };
  };
  const identities = new Map(),
    sameAuthor = new Map(),
    repeated = new Map();
  for (const record of records) {
    const ctx = context(record);
    const ownMatch = record.matched_aliases.length > 0;
    const inheritedMatch = ctx.chain.some((parent) => parent.matched_aliases.length > 0);
    const otherContext = ctx.chain.some((parent) => parent.other_races.length > 0);
    if (ownMatch || inheritedMatch) {
      record.relevance = "relevant";
      record.relevance_basis = ownMatch ? "explicit_alias" : "parent_context";
      record.reasons.push(ownMatch ? "target_race_named" : "target_race_in_parent_chain");
    } else if (record.other_races.length || otherContext) {
      record.relevance = "unrelated";
      record.relevance_basis = "other_known_race";
      record.reasons.push("other_race_without_target");
    } else record.reasons.push("insufficient_race_evidence");
    const review = (reason) => {
      record.relevance = "review";
      record.reasons.push(reason);
    };
    if (
      (record.other_races.length && (ownMatch || inheritedMatch)) ||
      ((ownMatch || inheritedMatch) && otherContext)
    )
      review("mixed_race_context");
    // A broken chain cannot establish inherited relevance even if an intermediate parent names the race.
    if (ctx.incomplete && !ownMatch && record.relevance === "relevant")
      review("incomplete_parent_chain");
    if (record.kind === "comment" && ctx.incomplete) record.reasons.push("parent_missing_or_cycle");
    if (!record.clean_text) review("missing_text");
    else if (!/[\p{L}\p{N}]/u.test(record.clean_text)) review("emoji_or_symbol_only");
    else if ([...fingerprint(record.clean_text)].length < 4 && !ownMatch)
      review("short_generic_reply");
    const mismatched = record.mentioned_years.some((year) => year !== report.run.target_year);
    const contextMismatch = ctx.chain.some((parent) =>
      parent.mentioned_years.some((year) => year !== report.run.target_year),
    );
    if (mismatched || (!record.mentioned_years.length && contextMismatch))
      review(mismatched ? "edition_year_needs_review" : "parent_edition_year_needs_review");
    if (
      /(?:加(?:我)?\s*(?:whatsapp|微信|telegram)|賭場|博彩|代辦貸款|guaranteed\s+profit)/iu.test(
        record.clean_text,
      )
    )
      review("promotion_or_spam_suspected");
    // Name mentions under negation/comparison are evidence for review, not automatic matching.
    if (
      ownMatch &&
      /(?:唔係|不是|並非|not\s+(?:the\s+)?|比較|相比|versus|\bvs\b)/iu.test(record.clean_text)
    )
      review("comparison_or_negation");
    const sameId = identities.get(record.id);
    if (sameId) {
      record.duplicate_of = sameId.key;
      record.reasons.push(
        record.raw.ingestion_method === "manual_paste"
          ? "same_manual_source_identity"
          : "same_platform_id",
      );
      if (record.clean_text !== sameId.clean_text)
        record.reasons.push("platform_id_content_changed");
    } else identities.set(record.id, record);
    const author = normalizeText(record.username).toLocaleLowerCase("en");
    const substantial = [...fingerprint(record.clean_text)].length >= 20;
    const authorKey =
      author && substantial ? `${record.kind}:${author}:${record.text_fingerprint}` : null;
    const authorGroup = authorKey ? (sameAuthor.get(authorKey) ?? []) : [];
    if (!record.duplicate_of) {
      const sameRoot = authorGroup.find((item) => item.root_post_id === record.root_post_id);
      if (sameRoot) {
        record.duplicate_of = sameRoot.key;
        record.reasons.push("same_author_same_text_same_conversation");
      } else if (authorGroup.length) {
        record.possible_duplicate_of = authorGroup[0].key;
        review("same_author_text_in_other_conversation");
      }
    }
    if (authorKey && !record.duplicate_of) sameAuthor.set(authorKey, [...authorGroup, record]);
    const priorText = repeated.get(record.text_fingerprint);
    if (
      !record.duplicate_of &&
      substantial &&
      priorText &&
      priorText.id !== record.id &&
      (!record.username ||
        !priorText.username ||
        normalizeText(priorText.username).toLowerCase() !== author)
    ) {
      record.possible_duplicate_of ??= priorText.key;
      review("same_text_different_or_unknown_author");
      if (!priorText.duplicate_of) {
        priorText.possible_duplicate_of ??= record.key;
        priorText.relevance = "review";
        priorText.disposition = "review";
        if (!priorText.reasons.includes("same_text_different_or_unknown_author"))
          priorText.reasons.push("same_text_different_or_unknown_author");
      }
    }
    if (substantial && !priorText) repeated.set(record.text_fingerprint, record);
    record.disposition =
      record.duplicate_of || record.relevance === "unrelated"
        ? "exclude"
        : record.relevance === "relevant"
          ? "keep"
          : "review";
  }
  return {
    schema_version: 1,
    rule_version: RULE_VERSION,
    mode: report.mode,
    generated_at: new Date().toISOString(),
    source_digest: hash({
      run: report.run,
      queries: report.queries,
      posts: report.posts,
      comments: report.comments,
    }),
    run: structuredClone(report.run),
    target: { preset: presetKey, name: preset.name, aliases: [...preset.aliases] },
    summary: {
      total: records.length,
      keep: records.filter((r) => r.disposition === "keep").length,
      review: records.filter((r) => r.disposition === "review").length,
      exclude: records.filter((r) => r.disposition === "exclude").length,
      duplicates: records.filter((r) => r.duplicate_of).length,
      unrelated: records.filter((r) => r.relevance === "unrelated" && !r.duplicate_of).length,
    },
    records,
  };
}

export async function cleaningDemo() {
  const report = await demoReport();
  report.run.race = "香港賽事清理示範（全部虛構）";
  report.posts[0].raw.text = "【虛構示範】渣馬 2027 起點交通、寄存及水站安排討論。";
  report.posts[1].raw.text = "【虛構示範】大阪馬拉松 2027 的賽後分享。";
  report.comments = [];
  const add = (id, parent, text, username = `demo_${id}`, root = "100") =>
    report.comments.push({
      id,
      root_post_id: root,
      parent_id: parent,
      collected_at: report.generated_at,
      raw: { id, text, username, replied_to: parent ? { id: parent } : undefined, permalink: null },
    });
  const repeated = "【虛構示範】渣馬寄存區標示清楚，我用咗大概十分鐘完成寄存。";
  add("101", "100", repeated, "demo_runner");
  add("102", "100", `  ${repeated}\u200b  `, "demo_runner");
  add("103", "101", "【虛構示範】你幾點到起點？");
  add("104", null, "【虛構示範】寄存區喺邊度？");
  add("105", "100", "👍");
  add("106", "100", "【虛構示範】我講緊 2026 年渣馬。");
  add("107", "100", "【虛構示範】我唔係跑渣馬，係大阪馬拉松。");
  add("108", "100", "【虛構示範】渣馬報名，加我 Telegram 幫你處理。");
  add("201", "200", "【虛構示範】個起點交通安排點樣？", "demo_other", "200");
  return report;
}
