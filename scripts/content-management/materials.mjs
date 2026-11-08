import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, chmodSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { backup } from "node:sqlite";
import { ReviewError } from "../threads/review-store.mjs";
import { publicReference } from "../research/sources.mjs";
export function initMaterials(content) {
  content.db.exec(
    "CREATE TABLE IF NOT EXISTS content_materials(id TEXT PRIMARY KEY,payload_json TEXT NOT NULL,created_at TEXT NOT NULL)",
  );
}
export function materials(content, race) {
  return content.db
    .prepare("SELECT * FROM content_materials ORDER BY created_at DESC,id")
    .all()
    .map((r) => ({ id: r.id, ...JSON.parse(r.payload_json), created_at: r.created_at }))
    .filter((r) => !race || r.race_id === race);
}
export function importMaterials(content, input) {
  if (!Array.isArray(input) || !input.length || input.length > 100)
    throw new ReviewError(400, "請提供1–100則材料的JSON陣列。");
  const records = input.map((r) => {
    const allowed = [
      "race_id",
      "year",
      "group",
      "platform",
      "url",
      "text",
      "posted_at",
      "scope",
      "topic",
    ];
    if (
      !r ||
      typeof r !== "object" ||
      Object.keys(r).some((k) => !allowed.includes(k)) ||
      !content.catalog.some((c) => c.id === r.race_id) ||
      !Number.isInteger(r.year) ||
      r.year < 1900 ||
      r.year > 2200
    )
      throw new ReviewError(400, "材料需要有效賽事及年份。");
    for (const [key, max] of [
      ["group", 120],
      ["text", 12000],
      ["scope", 2000],
    ])
      if (typeof r[key] !== "string" || r[key].length > max)
        throw new ReviewError(400, "請檢查組別、原文及觀察範圍。");
    if (
      !r.text.trim() ||
      !r.scope.trim() ||
      !["course", "organization", "supplies", "other"].includes(r.topic)
    )
      throw new ReviewError(400, "請填原文、觀察範圍及主題。");
    if (
      r.posted_at != null &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(r.posted_at) ||
        !Number.isFinite(Date.parse(r.posted_at)) ||
        new Date(r.posted_at).toISOString().slice(0, 10) !== r.posted_at)
    )
      throw new ReviewError(400, "出帖日期無效；未知請留null。");
    let ref;
    try {
      ref = publicReference(r.platform, r.url);
    } catch (e) {
      throw new ReviewError(400, e.message);
    }
    const payload = {
      race_id: r.race_id,
      year: r.year,
      group: r.group,
      platform: r.platform,
      url: ref.url,
      text: r.text,
      posted_at: r.posted_at ?? null,
      scope: r.scope,
      topic: r.topic,
    };
    const json = JSON.stringify(payload);
    return { id: createHash("sha256").update(json).digest("hex"), json };
  });
  content.db.exec("BEGIN IMMEDIATE");
  let added = 0;
  try {
    for (const r of records)
      added += Number(
        content.db
          .prepare("INSERT OR IGNORE INTO content_materials VALUES(?,?,?)")
          .run(r.id, r.json, new Date().toISOString()).changes,
      );
    content.db.exec("COMMIT");
  } catch (e) {
    content.db.exec("ROLLBACK");
    throw e;
  }
  return { added, duplicates: records.length - added };
}
export function draftFromMaterials(content, input) {
  if (!Array.isArray(input?.ids) || !input.ids.length || input.ids.length > 30)
    throw new ReviewError(400, "請選1–30則材料。");
  const all = materials(content);
  const rows = [...new Set(input.ids)].map((id) => all.find((r) => r.id === id));
  if (
    rows.some((r) => !r) ||
    rows.some((r) => r.race_id !== rows[0].race_id || r.year !== rows[0].year)
  )
    throw new ReviewError(400, "同一草稿只可使用同一賽事及年份。");
  const first = rows[0];
  return content.save({
    id: null,
    expected_revision: 0,
    kind: "review",
    race_id: first.race_id,
    year: first.year,
    group: [...new Set(rows.map((r) => r.group))].join("／").slice(0, 120),
    title: `${content.catalog.find((r) => r.id === first.race_id).name} · ${first.year} 材料整理（未審閱）`,
    body: rows.map((r) => `[${r.topic}] ${r.text}`).join("\n\n"),
    sources: rows.map((r) => `${r.id} ${r.url} · 出帖：${r.posted_at ?? "未知"}`).join("\n"),
    scope: rows.map((r) => r.scope).join("\n"),
    material_ids: rows.map((r) => r.id),
  });
}
export async function privateBackup({ content, store, reviews }) {
  const root = fileURLToPath(new URL("../../.editorial-private/backups/", import.meta.url));
  mkdirSync(root, { recursive: true, mode: 0o700 });
  chmodSync(root, 0o700);
  const dir = join(root, randomUUID());
  mkdirSync(dir, { mode: 0o700 });
  const files = [];
  for (const [name, item] of Object.entries({ content, materials: store, reviews })) {
    if (!item?.db) continue;
    const path = join(dir, `${name}.sqlite`);
    await backup(item.db, path);
    chmodSync(path, 0o600);
    files.push({
      name: `${name}.sqlite`,
      sha256: createHash("sha256").update(readFileSync(path)).digest("hex"),
    });
  }
  const manifest = {
    format: "nxtgo-private-backup-v1",
    created_at: new Date().toISOString(),
    mode: content.mode,
    confirmation_required: true,
    published: false,
    files,
  };
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return { directory: dir, ...manifest };
}
