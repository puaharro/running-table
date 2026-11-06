import { createHash } from "node:crypto";
import { PRESETS } from "./clean.mjs";
import { evidenceLink, sourceMetadata } from "../research/sources.mjs";
import { TOPIC_RULE_VERSION, topicsForRecord, topicSummary } from "./topics.mjs";

const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const nameText = (value) =>
  typeof value === "string" ? value.normalize("NFC").replace(/\s+/g, " ").trim() : "";
function raceIdentity(name) {
  const normalized = nameText(name);
  for (const [key, preset] of Object.entries(PRESETS))
    if (
      [preset.name, ...preset.aliases].some(
        (alias) => nameText(alias).toLowerCase() === normalized.toLowerCase(),
      )
    )
      return { key, label: preset.name, known_hk_preset: true };
  return { key: "custom-" + hash(normalized), label: normalized, known_hk_preset: false };
}

// Derive an analysis input from one explicit review snapshot; never write decisions.
export function buildConfirmed(review) {
  if (review?.kind !== "private_manual_review" || !Array.isArray(review.records))
    throw new Error("Expected a private manual-review export.");
  const kept = review.records.filter(
    (row) => row.confirmed_decision === "keep" && row.manual?.decision === "keep",
  );
  const byIdentity = new Map(),
    keptKeys = new Set(kept.map((row) => row.automatic.key));
  for (const row of kept) {
    const record = row.automatic;
    const identity = `${record.raw.ingestion_method === "manual_paste" ? "manual" : "threads"}:${record.id}`;
    if (!byIdentity.has(identity)) byIdentity.set(identity, []);
    byIdentity.get(identity).push(structuredClone(row));
  }
  const records = [],
    needsAttention = [];
  for (const [identity, observations] of byIdentity) {
    observations.sort(
      (a, b) =>
        a.automatic.kind.localeCompare(b.automatic.kind) ||
        a.automatic.key.localeCompare(b.automatic.key),
    );
    const reasons = [];
    if (observations.some((row) => !nameText(row.manual.race_name)))
      reasons.push("missing_confirmed_race");
    if (
      observations.some(
        (row) =>
          !Number.isInteger(row.manual.event_year) ||
          row.manual.event_year < 1900 ||
          row.manual.event_year > 2200,
      )
    )
      reasons.push("missing_confirmed_year");
    if (
      observations.some(
        (row) => typeof row.automatic.raw.text !== "string" || !row.automatic.raw.text.trim(),
      )
    )
      reasons.push("missing_original_text");
    const assignments = new Set(
      observations.map((row) =>
        JSON.stringify([raceIdentity(row.manual.race_name).key, row.manual.event_year]),
      ),
    );
    if (assignments.size > 1) reasons.push("same_identity_assignment_conflict");
    if (new Set(observations.map((row) => row.automatic.raw.text ?? null)).size > 1)
      reasons.push("same_identity_text_conflict");
    const base = { id: hash(identity), identity, observations };
    if (reasons.length) {
      needsAttention.push({ ...base, reasons });
      continue;
    }
    const first = observations[0],
      record = first.automatic,
      race = raceIdentity(first.manual.race_name);
    const warnings = [];
    if (!race.known_hk_preset) warnings.push("custom_race_region_unverified");
    if (
      observations.some((row) =>
        [row.automatic.duplicate_of, row.automatic.possible_duplicate_of].some(
          (key) =>
            key && keptKeys.has(key) && !observations.some((other) => other.automatic.key === key),
        ),
      )
    )
      warnings.push("other_kept_duplicate_candidate");
    if (new Set(observations.map((row) => row.automatic.username ?? null)).size > 1)
      warnings.push("author_name_variants");
    if (record.raw.ingestion_method === "manual_paste") warnings.push("manual_source_unverified");
    if (record.raw.link_scope === "root") warnings.push("root_link_only");
    records.push({
      ...base,
      race_key: race.key,
      race_name: first.manual.race_name,
      event_year: first.manual.event_year,
      group_label: race.label,
      known_hk_preset: race.known_hk_preset,
      kind: record.kind,
      original_text: record.raw.text,
      clean_text: record.clean_text,
      username: record.username,
      source_url: evidenceLink(record),
      ...(record.raw.source_platform ? { source_metadata: sourceMetadata(record.raw) } : {}),
      source_scope: record.raw.link_scope ?? "item",
      identity_basis:
        record.raw.ingestion_method === "manual_paste"
          ? record.raw.manual_identity === "root_text_observation"
            ? "local_text_observation"
            : "submitted_permalink"
          : "platform_id",
      name_variants: [...new Set(observations.map((row) => row.manual.race_name))],
      warnings,
    });
  }
  records.sort(
    (a, b) =>
      a.race_key.localeCompare(b.race_key) ||
      a.event_year - b.event_year ||
      a.id.localeCompare(b.id),
  );
  needsAttention.sort((a, b) => a.id.localeCompare(b.id));
  const groups = new Map();
  for (const record of records) {
    const key = JSON.stringify([record.race_key, record.event_year]);
    if (!groups.has(key))
      groups.set(key, {
        race_key: record.race_key,
        race_name: record.group_label,
        event_year: record.event_year,
        known_hk_preset: record.known_hk_preset,
        record_ids: [],
      });
    groups.get(key).record_ids.push(record.id);
  }
  const manifest = review.records.map((row) => ({
    key: row.automatic.key,
    manual: row.manual,
    confirmed_decision: row.confirmed_decision,
  }));
  const topicReviews = review.topic_reviews ?? [],
    topicsById = new Map(topicReviews.map((row) => [row.item_id, row]));
  for (const record of records)
    record.topics = topicsForRecord(record, topicsById.get(record.id) ?? null);
  return {
    schema_version: 1,
    kind: "private_confirmed_dataset",
    mode: review.mode,
    dataset_id: review.dataset_id,
    generated_at: new Date().toISOString(),
    source_digest: review.source_digest,
    rule_version: review.rule_version,
    review_fingerprint: hash({
      dataset_id: review.dataset_id,
      manifest,
      topic_rule_version: TOPIC_RULE_VERSION,
      topic_reviews: topicReviews,
    }),
    topic_rule_version: TOPIC_RULE_VERSION,
    topic_summary: topicSummary(records),
    summary: {
      total_observations: review.records.length,
      confirmed_keep: kept.length,
      pending: review.records.filter((row) => row.confirmed_decision === "pending").length,
      confirmed_exclude: review.records.filter(
        (row) => row.confirmed_decision === "exclude" && row.manual?.decision === "exclude",
      ).length,
      ready_items: records.length,
      needs_attention: needsAttention.length,
      merged_observations: records.reduce(
        (n, row) => n + Math.max(0, row.observations.length - 1),
        0,
      ),
      groups: groups.size,
    },
    groups: [...groups.values()],
    records,
    needs_attention: needsAttention,
  };
}

const csvCell = (value) => {
  let text = String(value ?? "");
  // Spreadsheet applications must not execute user text as a formula. JSON stays exact.
  if (/^[\s\uFEFF]*[=+\-@]/u.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
};
export function confirmedCsv(result) {
  const columns = [
    "mode",
    "dataset_id",
    "review_fingerprint",
    "item_id",
    "race_name",
    "event_year",
    "kind",
    "original_text",
    "clean_text",
    "username",
    "source_url",
    "source_scope",
    "identity_basis",
    "review_record_keys",
    "review_revisions",
    "warnings",
    "automatic_topics",
    "effective_topics",
    "topic_status",
    "topic_source",
    "topic_rule_version",
    "topic_revision",
    "topic_note",
    "topic_evidence",
    "source_metadata",
  ];
  const rows = result.records.map((record) => [
    result.mode,
    result.dataset_id,
    result.review_fingerprint,
    record.id,
    record.race_name,
    record.event_year,
    record.kind,
    record.original_text,
    record.clean_text,
    record.username,
    record.source_url,
    record.source_scope,
    record.identity_basis,
    record.observations.map((row) => row.automatic.key).join(";"),
    record.observations.map((row) => row.manual.revision).join(";"),
    record.warnings.join(";"),
    record.topics.automatic.labels.join(";"),
    record.topics.effective_labels.join(";"),
    record.topics.status,
    record.topics.source,
    record.topics.rule_version,
    record.topics.manual?.revision ?? "",
    record.topics.manual?.note ?? "",
    JSON.stringify(record.topics.automatic.evidence),
    record.source_metadata ? JSON.stringify(record.source_metadata) : "",
  ]);
  return (
    "\uFEFF" + [columns, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n"
  );
}
