import { serveVerification } from "./verification-route.mjs";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { ReviewError } from "./review-store.mjs";
import { jsonBody } from "./review-server.mjs";
import { cleanReport } from "./clean.mjs";
import { renderCleanReport } from "./clean-view.mjs";
import { renderReview } from "./review-view.mjs";
import { renderManualImport } from "./manual-view.mjs";
import { buildConfirmed, confirmedCsv } from "./confirmed.mjs";
import { renderConfirmed } from "./confirmed-view.mjs";
import { serveSummary } from "./summary-route.mjs";
import { serveComparison } from "./comparison-route.mjs";

export async function startManualServer({ store, reviews, port = 0 }) {
  const token = randomBytes(32).toString("hex");
  let origin;
  const server = createServer(async (request, response) => {
    for (const [key, value] of Object.entries({
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    }))
      response.setHeader(key, value);
    const json = (status, body) =>
      response
        .writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
        .end(JSON.stringify(body));
    const html = (body) =>
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(body);
    try {
      if (request.headers.host !== new URL(origin).host)
        throw new ReviewError(403, "只接受本機匯入頁面請求。");
      if (request.method === "POST") {
        const reviewRoute = request.url.match(/^\/api\/reviews\/([a-f0-9]{64})\/review$/);
        const topicRoute = request.url.match(/^\/api\/reviews\/([a-f0-9]{64})\/topics$/);
        const summaryRoute = request.url.match(/^\/api\/reviews\/([a-f0-9]{64})\/summary-review$/);
        const noteRoute = request.url === "/compare-note" || request.url === "/verification-save";
        const csrfHeader =
          reviewRoute || topicRoute || summaryRoute || noteRoute
            ? "x-review-token"
            : "x-import-token";
        if (request.headers.origin !== origin || request.headers[csrfHeader] !== token)
          throw new ReviewError(403, "請由本機頁面提交資料。");
        if (request.headers["content-type"]?.split(";")[0].trim() !== "application/json")
          throw new ReviewError(415, "只接受 JSON。");
        if (noteRoute) {
          const input = await jsonBody(request, 65536);
          if (request.url === "/verification-save") {
            json(
              200,
              reviews.saveVerification(
                input,
                reviews
                  .catalog()
                  .filter((row) => store.hasSnapshot(row.id))
                  .map((row) => row.id),
              ),
            );
            return;
          }
          if (
            ![input?.left, input?.right].every(
              (id) => typeof id === "string" && /^[a-f0-9]{64}$/.test(id) && store.hasSnapshot(id),
            )
          )
            throw new ReviewError(404, "找不到所選私人快照。");
          json(200, reviews.saveComparisonNote(input));
          return;
        }
        if (request.url === "/api/import") {
          json(200, store.import(await jsonBody(request, 131072)));
          return;
        }
        if (request.url === "/api/prepare") {
          const input = await jsonBody(request);
          if (!input || Object.keys(input).length !== 1 || typeof input.batch_id !== "string")
            throw new ReviewError(400, "請選擇已保存批次。");
          const source = store.report(input.batch_id),
            batch = store.batches().find((batch) => batch.id === input.batch_id);
          const cleaned = cleanReport(source, batch.preset),
            datasetId = reviews.register(cleaned);
          store.remember(input.batch_id, datasetId);
          json(200, {
            dataset_id: datasetId,
            summary: cleaned.summary,
            clean_url: `/clean/${datasetId}`,
            review_url: `/review/${datasetId}`,
            export_url: `/api/clean-export/${datasetId}`,
            confirmed_url: `/api/reviews/${datasetId}/confirmed`,
          });
          return;
        }
        if (reviewRoute) {
          if (!store.hasSnapshot(reviewRoute[1]))
            throw new ReviewError(404, "找不到這份匯入快照。");
          json(200, reviews.save(reviewRoute[1], await jsonBody(request)));
          return;
        }
        if (summaryRoute) {
          if (!store.hasSnapshot(summaryRoute[1]))
            throw new ReviewError(404, "找不到這份匯入快照。");
          json(200, reviews.saveSummary(summaryRoute[1], await jsonBody(request)));
          return;
        }
        if (topicRoute) {
          if (!store.hasSnapshot(topicRoute[1])) throw new ReviewError(404, "找不到這份匯入快照。");
          json(200, reviews.saveTopics(topicRoute[1], await jsonBody(request)));
          return;
        }
        throw new ReviewError(404, "找不到這個操作。");
      }
      if (request.method !== "GET") {
        response.setHeader("Allow", "GET, POST");
        throw new ReviewError(405, "不支援這個操作。");
      }
      if (request.url === "/") {
        html(renderManualImport(store.mode, token));
        return;
      }
      if (request.url === "/api/batches") {
        json(200, { mode: store.mode, batches: store.batches() });
        return;
      }
      if (["/compare", "/compare.json", "/compare.csv"].includes(request.url.split("?")[0])) {
        serveComparison({
          request,
          response,
          reviews,
          catalog: reviews.catalog().filter((row) => store.hasSnapshot(row.id)),
          origin,
          comparisonPath: "/compare",
          token,
          notePath: "/compare-note",
          verificationPath: "/verification",
          summaryBase: (id) => `/api/reviews/${id}`,
        });
        return;
      }
      if (
        ["/verification", "/verification.json", "/verification.csv"].includes(
          request.url.split("?")[0],
        )
      ) {
        serveVerification({
          request,
          response,
          reviews,
          catalog: reviews.catalog().filter((row) => store.hasSnapshot(row.id)),
          origin,
          token,
        });
        return;
      }
      const rawExport = request.url.match(/^\/api\/raw-export\/([a-f0-9-]{36})$/);
      if (rawExport) {
        const data = store.exportRaw(rawExport[1]);
        response.setHeader(
          "Content-Disposition",
          'attachment; filename="threads-manual-originals.json"',
        );
        json(200, data);
        return;
      }
      const route = request.url.match(/^\/(clean|review|api\/clean-export)\/([a-f0-9]{64})$/);
      const api = request.url
        .split("?")[0]
        .match(
          /^\/api\/reviews\/([a-f0-9]{64})\/(state|export|confirmed|confirmed\.json|confirmed\.csv|summary|summary\.json|summary\.csv)$/,
        );
      const datasetId = route?.[2] ?? api?.[1];
      if (!datasetId || !store.hasSnapshot(datasetId))
        throw new ReviewError(404, "找不到這個頁面或快照。");
      const source = reviews.source(datasetId);
      if (route?.[1] === "clean") {
        html(renderCleanReport(source, { reviewUrl: `/review/${datasetId}` }));
        return;
      }
      if (route?.[1] === "review") {
        const histories = Object.fromEntries(
          source.records.map((record) => [record.key, reviews.history(datasetId, record.key)]),
        );
        html(
          renderReview(source, reviews.state(datasetId), histories, token, {
            apiBase: `/api/reviews/${datasetId}`,
            importNavigation: true,
          }),
        );
        return;
      }
      if (route?.[1] === "api/clean-export") {
        response.setHeader(
          "Content-Disposition",
          'attachment; filename="threads-manual-cleaned.json"',
        );
        json(200, source);
        return;
      }
      if (api?.[2] === "state") {
        json(200, reviews.state(datasetId));
        return;
      }
      if (api?.[2] === "export") {
        response.setHeader(
          "Content-Disposition",
          'attachment; filename="threads-manual-reviewed.json"',
        );
        json(200, reviews.export(datasetId));
        return;
      }
      if (api?.[2].startsWith("summary")) {
        serveSummary({
          request,
          response,
          review: reviews.export(datasetId),
          origin,
          apiBase: `/api/reviews/${datasetId}`,
          reviewUrl: `/review/${datasetId}`,
          token,
        });
        return;
      }
      if (api?.[2].startsWith("confirmed")) {
        const result = buildConfirmed(reviews.export(datasetId));
        const expected = new URL(request.url, origin).searchParams.get("review");
        if (expected && expected !== result.review_fingerprint)
          throw new ReviewError(409, "覆核已更新，請重新載入資料集頁面後再下載。");
        if (api[2] === "confirmed.json") {
          response.setHeader(
            "Content-Disposition",
            'attachment; filename="threads-confirmed.json"',
          );
          json(200, result);
          return;
        }
        if (api[2] === "confirmed.csv") {
          response
            .writeHead(200, {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": 'attachment; filename="threads-confirmed.csv"',
            })
            .end(confirmedCsv(result));
          return;
        }
        html(
          renderConfirmed(result, {
            apiBase: `/api/reviews/${datasetId}`,
            reviewUrl: `/review/${datasetId}`,
            importNavigation: true,
            topicToken: token,
          }),
        );
        return;
      }
      throw new ReviewError(404, "找不到這個頁面。");
    } catch (error) {
      json(error instanceof ReviewError ? error.status : 500, {
        error: error instanceof ReviewError ? error.message : "本機保存或讀取失敗，請稍後再試。",
      });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      origin = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
  return { server, url: origin };
}
