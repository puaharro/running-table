import { serveVerification } from "./verification-route.mjs";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { ReviewError } from "./review-store.mjs";
import { renderReview } from "./review-view.mjs";
import { buildConfirmed, confirmedCsv } from "./confirmed.mjs";
import { renderConfirmed } from "./confirmed-view.mjs";
import { serveSummary } from "./summary-route.mjs";
import { serveComparison } from "./comparison-route.mjs";

export function jsonBody(request, limit = 16384) {
  return new Promise((resolve, reject) => {
    let bytes = 0,
      tooLarge = false;
    const chunks = [];
    request.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > limit) {
        tooLarge = true;
        chunks.length = 0;
      } else if (!tooLarge) chunks.push(chunk);
    });
    request.on("end", () => {
      if (tooLarge) return reject(new ReviewError(413, "覆核內容太長。"));
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new ReviewError(400, "需要有效 JSON。"));
      }
    });
    request.on("error", reject);
  });
}

export async function startReviewServer({ store, datasetId, port = 0 }) {
  const token = randomBytes(32).toString("hex");
  let origin;
  const server = createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");
    const send = (status, body) => {
      response
        .writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
        .end(JSON.stringify(body));
    };
    try {
      if (request.headers.host !== new URL(origin).host)
        throw new ReviewError(403, "只接受本機覆核頁面請求。");
      if (request.method === "GET" && request.url === "/") {
        const source = store.source(datasetId),
          state = store.state(datasetId),
          histories = {};
        for (const record of source.records)
          histories[record.key] = store.history(datasetId, record.key);
        response
          .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
          .end(renderReview(source, state, histories, token));
        return;
      }
      if (
        request.method === "GET" &&
        ["/api/verification", "/api/verification.json", "/api/verification.csv"].includes(
          request.url.split("?")[0],
        )
      ) {
        serveVerification({
          request,
          response,
          reviews: store,
          catalog: store.catalog().filter((row) => row.id === datasetId),
          origin,
          base: "/api/verification",
          compare: "/api/compare",
          token,
        });
        return;
      }
      if (request.method === "GET" && request.url === "/api/state") {
        send(200, store.state(datasetId));
        return;
      }
      if (request.method === "GET" && request.url === "/api/export") {
        response.setHeader(
          "Content-Disposition",
          'attachment; filename="threads-manual-review.json"',
        );
        send(200, store.export(datasetId));
        return;
      }
      if (
        request.method === "GET" &&
        ["/api/compare", "/api/compare.json", "/api/compare.csv"].includes(
          request.url.split("?")[0],
        )
      ) {
        serveComparison({
          request,
          response,
          reviews: store,
          catalog: store.catalog().filter((row) => row.id === datasetId),
          defaultId: datasetId,
          origin,
          token,
        });
        return;
      }
      if (
        request.method === "GET" &&
        ["/api/summary", "/api/summary.json", "/api/summary.csv"].includes(
          request.url.split("?")[0],
        )
      ) {
        serveSummary({ request, response, review: store.export(datasetId), origin, token });
        return;
      }
      if (
        request.method === "GET" &&
        ["/api/confirmed", "/api/confirmed.json", "/api/confirmed.csv"].includes(
          request.url.split("?")[0],
        )
      ) {
        const result = buildConfirmed(store.export(datasetId));
        const path = request.url.split("?")[0],
          expected = new URL(request.url, origin).searchParams.get("review");
        if (expected && expected !== result.review_fingerprint)
          throw new ReviewError(409, "覆核已更新，請重新載入資料集頁面後再下載。");
        if (path.endsWith(".json")) {
          response.setHeader(
            "Content-Disposition",
            'attachment; filename="threads-confirmed.json"',
          );
          send(200, result);
          return;
        }
        if (path.endsWith(".csv")) {
          response
            .writeHead(200, {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": 'attachment; filename="threads-confirmed.csv"',
            })
            .end(confirmedCsv(result));
          return;
        }
        response
          .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
          .end(renderConfirmed(result, { topicToken: token }));
        return;
      }
      if (
        request.method === "POST" &&
        [
          "/api/review",
          "/api/topics",
          "/api/summary-review",
          "/api/compare-note",
          "/api/verification-save",
        ].includes(request.url)
      ) {
        if (request.headers.origin !== origin || request.headers["x-review-token"] !== token)
          throw new ReviewError(403, "請由本機覆核頁面儲存。");
        if (request.headers["content-type"]?.split(";")[0].trim() !== "application/json")
          throw new ReviewError(415, "只接受 JSON 覆核內容。");
        const input = await jsonBody(
          request,
          request.url === "/api/verification-save" ? 65536 : 16384,
        );
        if (request.url === "/api/verification-save") {
          send(200, store.saveVerification(input, [datasetId]));
          return;
        }
        if (request.url === "/api/compare-note") {
          if (input?.left !== datasetId || input?.right !== datasetId)
            throw new ReviewError(404, "只可修正目前開啟快照的比較備註。");
          send(200, store.saveComparisonNote(input));
          return;
        }
        send(
          200,
          request.url === "/api/summary-review"
            ? store.saveSummary(datasetId, input)
            : request.url === "/api/topics"
              ? store.saveTopics(datasetId, input)
              : store.save(datasetId, input),
        );
        return;
      }
      if (!["GET", "POST"].includes(request.method)) {
        response.setHeader("Allow", "GET, POST");
        throw new ReviewError(405, "不支援這個操作。");
      }
      throw new ReviewError(404, "找不到這個頁面。");
    } catch (error) {
      send(error instanceof ReviewError ? error.status : 500, {
        error: error instanceof ReviewError ? error.message : "儲存或讀取失敗，請稍後再試。",
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
