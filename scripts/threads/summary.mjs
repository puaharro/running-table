import { createHash } from "node:crypto";
import { buildConfirmed } from "./confirmed.mjs";
import { TOPICS, TOPIC_KEYS } from "./topics.mjs";

export const SUMMARY_RULE_VERSION = "hk-summary-extract-v1";
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

// Extract only: retain the original offsets, never invent or combine a claim.
export function extractPoint(record, topic) {
  const text = record.original_text;
  const hit = record.topics.automatic.evidence.find((row) => row.topic === topic);
  const at = hit?.start ?? Math.max(0, text.search(/\S/u));
  const boundary = (index) =>
    /[。！？!?\n\r]/u.test(text[index]) ||
    (text[index] === "." && (index + 1 === text.length || /\s/u.test(text[index + 1])));
  let start = at,
    end = hit?.end ?? at;
  while (start > 0 && !boundary(start - 1)) start--;
  while (end < text.length && !boundary(end)) end++;
  if (end < text.length) end++;
  // A long sentence stays a clearly marked excerpt; full original is always attached.
  const points = [...text.slice(start, end)];
  if (points.length > 180) {
    const before = [...text.slice(start, at)].length;
    const left = Math.max(0, before - 60);
    start += points.slice(0, left).join("").length;
    end = start + points.slice(left, left + 180).join("").length;
  }
  return { text: text.slice(start, end), start, end, truncated: start > 0 || end < text.length };
}

export function buildSummary(review) {
  const confirmed = buildConfirmed(review),
    savedRows = review.summary_reviews ?? [];
  const savedById = new Map(savedRows.map((row) => [row.point_id, row]));
  const points = [];
  for (const record of confirmed.records) {
    const labels = record.topics.effective_labels.length
      ? record.topics.effective_labels
      : ["unclassified"];
    for (const topic of labels) {
      const id = hash([record.race_key, record.event_year, topic, record.id]);
      const automatic = extractPoint(record, topic);
      const evidence = {
        item_id: record.id,
        identity: record.identity,
        original_text: record.original_text,
        username: record.username,
        kind: record.kind,
        source_url: record.source_url,
        source_scope: record.source_scope,
        ...(record.source_metadata ? { source_metadata: record.source_metadata } : {}),
        identity_basis: record.identity_basis,
        warnings: record.warnings,
        observations: record.observations,
      };
      // Ignore review timestamps/notes in the evidence binding; actual text, attribution,
      // grouping and topic provenance must still match before reusing human wording.
      const digest = hash({
        rule: SUMMARY_RULE_VERSION,
        identity: record.identity,
        text: record.original_text,
        username: record.username,
        kind: record.kind,
        source_url: record.source_url,
        source_scope: record.source_scope,
        ...(record.source_metadata ? { source_metadata: record.source_metadata } : {}),
        race_key: record.race_key,
        event_year: record.event_year,
        topic,
        topic_status: record.topics.status,
        topic_source: record.topics.source,
      });
      const manual = savedById.get(id) ?? null,
        valid = manual?.evidence_digest === digest;
      const active = valid && manual.status !== "pending";
      points.push({
        id,
        race_key: record.race_key,
        race_name: record.group_label,
        event_year: record.event_year,
        known_hk_preset: record.known_hk_preset,
        topic,
        topic_label: TOPICS[topic]?.label ?? "未分類",
        topic_status: record.topics.status,
        topic_source: record.topics.source,
        evidence_digest: digest,
        automatic,
        manual,
        text: active ? manual.text : automatic.text,
        status: manual && !valid ? "stale" : active ? manual.status : "draft",
        excluded: Boolean(active && manual.status === "excluded"),
        evidence,
      });
    }
  }
  const groups = new Map();
  for (const point of points) {
    const key = JSON.stringify([point.race_key, point.event_year, point.topic]);
    if (!groups.has(key))
      groups.set(key, {
        id: hash(key),
        race_key: point.race_key,
        race_name: point.race_name,
        event_year: point.event_year,
        topic: point.topic,
        topic_label: point.topic_label,
        point_ids: [],
      });
    groups.get(key).point_ids.push(point.id);
  }
  const used = new Set(points.map((row) => row.id));
  return {
    schema_version: 1,
    kind: "private_comment_summary",
    mode: confirmed.mode,
    dataset_id: confirmed.dataset_id,
    generated_at: new Date().toISOString(),
    rule_version: SUMMARY_RULE_VERSION,
    review_fingerprint: confirmed.review_fingerprint,
    summary_fingerprint: hash({
      review: confirmed.review_fingerprint,
      rule: SUMMARY_RULE_VERSION,
      saved: savedRows,
    }),
    counts: {
      items: confirmed.records.length,
      points: points.filter((row) => !row.excluded).length,
      confirmed: points.filter((row) => row.status === "confirmed").length,
      uncertain: points.filter((row) => row.status === "uncertain").length,
      excluded: points.filter((row) => row.excluded).length,
      needs_review: points.filter((row) => ["draft", "stale", "uncertain"].includes(row.status))
        .length,
      needs_attention: confirmed.needs_attention.length,
    },
    groups: [...groups.values()].sort(
      (a, b) =>
        a.race_key.localeCompare(b.race_key) ||
        a.event_year - b.event_year ||
        [...TOPIC_KEYS, "unclassified"].indexOf(a.topic) -
          [...TOPIC_KEYS, "unclassified"].indexOf(b.topic),
    ),
    points,
    needs_attention: confirmed.needs_attention,
    // Hidden/removed evidence never remains in current highlights, but its edits are recoverable.
    archived_reviews: savedRows.filter((row) => !used.has(row.point_id)),
  };
}

export function summaryCsv(result) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/u.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const columns = [
    "dataset_id",
    "summary_fingerprint",
    "point_id",
    "race_name",
    "event_year",
    "topic",
    "topic_status",
    "summary_status",
    "excluded",
    "summary_text",
    "automatic_excerpt",
    "original_text",
    "source_url",
    "source_scope",
    "username",
    "warnings",
    "revision",
    "note",
    "source_metadata",
  ];
  return (
    "\uFEFF" +
    [
      columns,
      ...result.points.map((p) => [
        result.dataset_id,
        result.summary_fingerprint,
        p.id,
        p.race_name,
        p.event_year,
        p.topic,
        p.topic_status,
        p.status,
        p.excluded,
        p.text,
        p.automatic.text,
        p.evidence.original_text,
        p.evidence.source_url,
        p.evidence.source_scope,
        p.evidence.username,
        p.evidence.warnings.join(";"),
        p.manual?.revision ?? 0,
        p.manual?.note ?? "",
        p.evidence.source_metadata ? JSON.stringify(p.evidence.source_metadata) : "",
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
