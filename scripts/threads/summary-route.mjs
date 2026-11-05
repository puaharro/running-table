import { buildSummary, summaryCsv } from "./summary.mjs";
import { renderSummary } from "./summary-view.mjs";
import { ReviewError } from "./review-store.mjs";

export function serveSummary({
  request,
  response,
  review,
  origin,
  apiBase = "/api",
  reviewUrl = "/",
  token,
}) {
  const result = buildSummary(review),
    url = new URL(request.url, origin);
  const expected = url.searchParams.get("summary");
  if (expected && expected !== result.summary_fingerprint)
    throw new ReviewError(409, "留言、主題或摘要已更新，請重新載入摘要頁面後下載。");
  if (url.pathname.endsWith(".json")) {
    response
      .writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="threads-summary.json"',
      })
      .end(JSON.stringify(result));
  } else if (url.pathname.endsWith(".csv")) {
    response
      .writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="threads-summary.csv"',
      })
      .end(summaryCsv(result));
  } else
    response
      .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      .end(
        renderSummary(result, {
          apiBase,
          reviewUrl,
          token,
          comparisonUrl: `${apiBase === "/api" ? "/api/compare" : "/compare"}?left=${result.dataset_id}`,
        }),
      );
}
