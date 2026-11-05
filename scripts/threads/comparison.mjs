import { createHash } from "node:crypto";
import { buildSummary } from "./summary.mjs";
import { TOPICS, TOPIC_KEYS } from "./topics.mjs";

export const COMPARISON_RULE_VERSION = "hk-year-comparison-v1";
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export function buildComparison(leftReview, rightReview, options = {}, notes = []) {
  const left = buildSummary(leftReview),
    right = buildSummary(rightReview);
  const races = [
    ...new Map(
      [
        ...notes.map((note) => ({
          race_key: note.context.race,
          race_name: note.race_name ?? note.context.race,
        })),
        ...left.groups,
        ...right.groups,
      ].map((g) => [g.race_key, g.race_name]),
    ),
  ].map(([key, name]) => ({ key, name }));
  const race = options.race ?? races[0]?.key ?? null;
  if (race !== null && !races.some((r) => r.key === race))
    throw new Error("找不到所選賽事，請重新選擇。");
  const years = [
    ...new Set([
      ...[...left.points, ...right.points]
        .filter((p) => p.race_key === race)
        .map((p) => p.event_year),
      ...notes
        .filter((note) => note.context.race === race)
        .flatMap((note) => [note.context.year_a, note.context.year_b]),
    ]),
  ].sort((a, b) => a - b);
  const leftYears = years.filter((y) =>
    left.points.some((p) => p.race_key === race && p.event_year === y),
  );
  const rightYears = years.filter((y) =>
    right.points.some((p) => p.race_key === race && p.event_year === y),
  );
  const yearA = options.year_a ?? leftYears[0] ?? years[0] ?? null;
  const yearB =
    options.year_b ??
    rightYears.filter((y) => y !== yearA).at(-1) ??
    years.filter((y) => y !== yearA).at(-1) ??
    null;
  for (const year of [yearA, yearB])
    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2200))
      throw new Error("請選擇有效年份。");
  const topic = options.topic ?? "all",
    onlyConfirmed = options.confirmed ?? false;
  if (!["all", ...TOPIC_KEYS, "unclassified"].includes(topic) || typeof onlyConfirmed !== "boolean")
    throw new Error("請檢查主題及摘要篩選。");
  const complete = Boolean(race && yearA !== null && yearB !== null && yearA !== yearB);
  const lane = (source, year, key) => {
    const all = source.points.filter(
      (p) => p.race_key === race && p.event_year === year && p.topic === key,
    );
    const active = all.filter((p) => !p.excluded),
      visible = active.filter((p) => !onlyConfirmed || p.status === "confirmed");
    return {
      year,
      dataset_id: source.dataset_id,
      summary_fingerprint: source.summary_fingerprint,
      counts: {
        eligible_points: all.length,
        active: active.length,
        excluded: all.length - active.length,
        confirmed: active.filter((p) => p.status === "confirmed").length,
        visible: visible.length,
        comments: visible.filter((p) => p.evidence.kind === "comment").length,
        posts: visible.filter((p) => p.evidence.kind !== "comment").length,
      },
      status: visible.length
        ? "available"
        : !all.length
          ? "no_records"
          : !active.length
            ? "only_excluded"
            : "no_confirmed_summary",
      points: visible,
    };
  };
  const rows = complete
    ? (topic === "all" ? [...TOPIC_KEYS, "unclassified"] : [topic]).map((key) => {
        const a = lane(left, yearA, key),
          b = lane(right, yearB, key),
          identities = new Set(a.points.map((p) => p.evidence.identity));
        return {
          topic: key,
          label: TOPICS[key]?.label ?? "未分類",
          left: a,
          right: b,
          shared_identity_ids: [
            ...new Set(
              b.points
                .filter((p) => identities.has(p.evidence.identity))
                .map((p) => p.evidence.identity),
            ),
          ],
        };
      })
    : [];
  const selection = { race, year_a: yearA, year_b: yearB, topic, confirmed: onlyConfirmed };
  for (const row of rows) {
    row.note_context = {
      left: left.dataset_id,
      right: right.dataset_id,
      race,
      year_a: yearA,
      year_b: yearB,
      topic: row.topic,
      confirmed: onlyConfirmed,
    };
    row.note_id = hash(row.note_context);
    row.evidence_digest = hash({
      rule: COMPARISON_RULE_VERSION,
      left: row.left,
      right: row.right,
      shared: row.shared_identity_ids,
    });
    row.manual_note = notes.find((note) => note.id === row.note_id) ?? null;
    row.note_status = !row.manual_note
      ? "none"
      : row.manual_note.evidence_digest === row.evidence_digest
        ? "current"
        : "stale";
  }
  return {
    schema_version: 1,
    kind: "private_year_topic_comparison",
    rule_version: COMPARISON_RULE_VERSION,
    generated_at: new Date().toISOString(),
    selection,
    selection_complete: complete,
    races,
    years,
    race_name: races.find((r) => r.key === race)?.name ?? null,
    sources: {
      left: {
        dataset_id: left.dataset_id,
        mode: left.mode,
        summary_fingerprint: left.summary_fingerprint,
        needs_attention: left.counts.needs_attention,
      },
      right: {
        dataset_id: right.dataset_id,
        mode: right.mode,
        summary_fingerprint: right.summary_fingerprint,
        needs_attention: right.counts.needs_attention,
      },
    },
    comparison_fingerprint: hash({
      rule: COMPARISON_RULE_VERSION,
      left: left.summary_fingerprint,
      right: right.summary_fingerprint,
      selection,
      notes: rows.map((row) => row.manual_note),
    }),
    rows,
  };
}
export function comparisonCsv(result) {
  const cell = (value) => {
    let text = String(value ?? "");
    if (/^[\s\uFEFF]*[=+\-@]|^[\t\r\n]/u.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const rows = [
    [
      "comparison_fingerprint",
      "race_name",
      "topic",
      "side",
      "year",
      "dataset_id",
      "lane_status",
      "point_id",
      "summary_text",
      "summary_status",
      "topic_status",
      "original_text",
      "source_url",
      "source_scope",
      "username",
      "kind",
      "warnings",
      "summary_revision",
      "summary_note",
      "shared_identity",
      "comparison_differences",
      "comparison_verification",
      "comparison_note_status",
      "comparison_note_revision",
    ],
  ];
  for (const row of result.rows)
    for (const side of ["left", "right"]) {
      const lane = row[side];
      const prefix = [
        result.comparison_fingerprint,
        result.race_name,
        row.topic,
        side,
        lane.year,
        lane.dataset_id,
        lane.status,
      ];
      const noteCells = [
        row.manual_note?.differences ?? "",
        row.manual_note?.verification ?? "",
        row.note_status,
        row.manual_note?.revision ?? 0,
      ];
      if (!lane.points.length) rows.push([...prefix, ...Array(13).fill(""), ...noteCells]);
      for (const p of lane.points)
        rows.push([
          ...prefix,
          p.id,
          p.text,
          p.status,
          p.topic_status,
          p.evidence.original_text,
          p.evidence.source_url,
          p.evidence.source_scope,
          p.evidence.username,
          p.evidence.kind,
          p.evidence.warnings.join(";"),
          p.manual?.revision ?? 0,
          p.manual?.note ?? "",
          row.shared_identity_ids.includes(p.evidence.identity),
          ...noteCells,
        ]);
    }
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
}
