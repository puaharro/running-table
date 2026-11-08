import { materials, importMaterials, draftFromMaterials, privateBackup } from "./materials.mjs";
import { renderMaterials } from "./views.mjs";
import { ReviewError } from "../threads/review-store.mjs";
import { renderRaces, renderDrafts } from "./views.mjs";

// Called behind the manual server's Host/Origin/token and JSON checks.
export async function serveContent({
  request,
  response,
  content,
  store,
  reviews,
  token,
  readBody,
}) {
  if (!content) return false;
  const url = new URL(request.url, "http://localhost");
  const json = (body) =>
    response
      .writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
      .end(JSON.stringify(body));
  const html = (body) =>
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(body);
  if (request.method === "POST" && url.pathname === "/api/content/materials/legacy") {
    const input = await readBody(request);
    const batch = store?.batches().find((b) => b.id === input.batch_id);
    if (!batch || !Number.isInteger(input.year))
      throw new ReviewError(400, "請選研究批次及目標年份。");
    const rows = store.entries(batch.id).map(({ record: r }) => ({
      race_id: input.race_id,
      year: input.year,
      group: r.race_group ?? "",
      platform: r.source_platform ?? "threads",
      url: r.permalink ?? r.source_post_url,
      text: r.text,
      posted_at: r.posted_date ?? null,
      scope: `舊研究批次 ${batch.id}；屆次及內容仍待覆核。${r.username ?? "作者未知"}；${r.note ?? ""}；${r.runner_segment ?? "跑手位置未知"}`,
      topic: "other",
    }));
    json(importMaterials(content, rows));
    return true;
  }
  if (request.method === "POST" && url.pathname === "/api/content/materials/import") {
    json(importMaterials(content, await readBody(request, 1500000)));
    return true;
  }
  if (request.method === "POST" && url.pathname === "/api/content/materials/draft") {
    json(draftFromMaterials(content, await readBody(request)));
    return true;
  }
  if (request.method === "POST" && url.pathname === "/api/content/backup") {
    await readBody(request);
    json(await privateBackup({ content, store, reviews }));
    return true;
  }
  if (request.method === "GET" && url.pathname === "/api/content/materials") {
    json(materials(content, url.searchParams.get("race")));
    return true;
  }
  if (request.method === "GET" && url.pathname === "/materials") {
    html(renderMaterials(content, token, url.searchParams.get("race"), store?.batches() ?? []));
    return true;
  }
  if (request.method === "POST" && url.pathname === "/api/content/drafts/save") {
    json(content.save(await readBody(request, 131072)));
    return true;
  }
  if (request.method === "POST" && url.pathname === "/api/content/drafts/pending") {
    json(content.markPending(await readBody(request)));
    return true;
  }
  if (request.method !== "GET") return false;
  if (url.pathname === "/" || url.pathname === "/races") {
    html(renderRaces(content, token));
    return true;
  }
  if (url.pathname === "/drafts") {
    const id = url.searchParams.get("id");
    const raceId = url.searchParams.get("race");
    if (raceId && !content.catalog.some((r) => r.id === raceId))
      throw new ReviewError(400, "請選擇現有賽事。");
    html(
      renderDrafts(content, token, id ? content.get(id) : null, {
        race_id: raceId,
        kind: url.searchParams.get("kind") === "race-data" ? "race-data" : "review",
      }),
    );
    return true;
  }
  const exp = url.pathname.match(/^\/api\/content\/drafts\/([a-f0-9-]{36})\/export$/);
  if (exp) {
    response.setHeader("Content-Disposition", 'attachment; filename="private-content-draft.json"');
    json({
      ...content.export(exp[1]),
      materials: materials(content).filter((r) =>
        (content.get(exp[1]).material_ids ?? []).includes(r.id),
      ),
    });
    return true;
  }
  return false;
}
