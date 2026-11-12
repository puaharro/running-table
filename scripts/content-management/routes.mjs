import { Workflow } from "./workflow.mjs";
import { confirmedHandoff, handoffHtml } from "./handoff.mjs";
import { AgentService } from "./agent.mjs";
import {
  renderRaceEditor,
  renderProgress,
  renderWebsite,
  renderWebsiteIndex,
} from "./workflow-view.mjs";
import { ProposalService } from "./proposals.mjs";
import { renderProposals } from "./proposal-view.mjs";
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
  const workflow = new Workflow(content);
  // Keep bookmarked URLs working; research has one shared interface.
  if (request.method === "GET" && url.pathname === "/agent-tools") {
    response.writeHead(302, { Location: "/materials" }).end();
    return true;
  }
  if (request.method === "POST" && url.pathname.startsWith("/api/content/workflow/")) {
    const input = await readBody(request, 262144);
    if (url.pathname === "/api/content/workflow/save") json(workflow.save(input));
    else if (url.pathname === "/api/content/workflow/confirm") json(workflow.confirm(input));
    else if (
      ["/api/content/workflow/export", "/api/content/workflow/handoff"].includes(url.pathname)
    ) {
      if (
        !input ||
        Object.keys(input).sort().join() !== "expected_revision,id" ||
        !Number.isInteger(input.expected_revision)
      )
        throw new ReviewError(400, "請指定版本。");
      const bundle = url.pathname.endsWith("/handoff")
        ? confirmedHandoff(content, input.id, input.expected_revision, { audit: true })
        : workflow.export(input.id, input.expected_revision);
      response.setHeader("Content-Disposition", 'attachment; filename="confirmed-content.json"');
      json(bundle);
    } else return false;
    return true;
  }
  if (request.method === "GET" && url.pathname === "/handoff-preview") {
    html(
      handoffHtml(
        confirmedHandoff(
          content,
          url.searchParams.get("id"),
          Number(url.searchParams.get("revision")),
        ),
      ),
    );
    return true;
  }
  if (request.method === "GET" && url.pathname === "/race-workspace") {
    const race = workflow.race(url.searchParams.get("race"));
    const year = Number(url.searchParams.get("year") || race.year || race.date.slice(0, 4));
    if (!Number.isInteger(year) || year < 1900 || year > 2200)
      throw new ReviewError(400, "請填有效年份。");
    const selected = url.searchParams.get("website");
    const copy = selected
      ? workflow.get(selected)
      : workflow.list("website").find((r) => r.data.race_id === race.id && r.data.year === year);
    if (
      copy &&
      (copy.kind !== "website" || copy.data.race_id !== race.id || copy.data.year !== year)
    )
      throw new ReviewError(400, "網站稿與研究賽事／屆次不符。");
    const draft = content.list().find((d) => d.race_id === race.id && d.year === year);
    html(
      renderWebsite(content, token, {
        id: copy?.id,
        raceId: race.id,
        year,
        draftId: draft?.id,
        workspace: true,
      }),
    );
    return true;
  }
  if (request.method === "GET" && url.pathname === "/race-editor") {
    html(renderRaceEditor(content, token, url.searchParams.get("id")));
    return true;
  }
  if (request.method === "GET" && url.pathname === "/website-copies") {
    html(renderWebsiteIndex(content, token));
    return true;
  }
  if (request.method === "GET" && ["/research-progress", "/website-copy"].includes(url.pathname)) {
    const id = url.searchParams.get("id"),
      raceId = url.searchParams.get("race");
    if (url.pathname === "/website-copy" && id) {
      html(renderWebsite(content, token, { id }));
      return true;
    }
    const race = workflow.race(raceId);
    const year = Number(url.searchParams.get("year") || race.year || race.date.slice(0, 4));
    if (!Number.isInteger(year) || year < 1900 || year > 2200)
      throw new ReviewError(400, "請填有效年份。");
    html(
      url.pathname === "/research-progress"
        ? renderProgress(content, token, raceId, year)
        : renderWebsite(content, token, { raceId, year, draftId: url.searchParams.get("draft") }),
    );
    return true;
  }
  if (url.pathname === "/proposals" && request.method === "GET") {
    html(renderProposals(content, new ProposalService(content), token));
    return true;
  }
  if (url.pathname === "/api/content/proposals/decide" && request.method === "POST") {
    json(new ProposalService(content).decide(await readBody(request)));
    return true;
  }
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
    const agent = new AgentService(content, { store, reviews });
    html(
      renderMaterials(content, token, url.searchParams.get("race"), store?.batches() ?? [], {
        links: agent.research.links(),
        audit: agent.audit(),
      }),
    );
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
