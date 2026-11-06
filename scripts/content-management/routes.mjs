import { ReviewError } from "../threads/review-store.mjs";
import { renderRaces, renderDrafts } from "./views.mjs";

// Called behind the manual server's Host/Origin/token and JSON checks.
export async function serveContent({ request, response, content, token, readBody }) {
  if (!content) return false;
  const url = new URL(request.url, "http://localhost");
  const json = (body) =>
    response
      .writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
      .end(JSON.stringify(body));
  const html = (body) =>
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(body);
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
    json(content.export(exp[1]));
    return true;
  }
  return false;
}
