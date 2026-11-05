import { comparisonCsv } from "./comparison.mjs";
import { renderComparison } from "./comparison-view.mjs";
import { ReviewError } from "./review-store.mjs";

export function serveComparison({
  request,
  response,
  reviews,
  catalog,
  defaultId,
  origin,
  comparisonPath = "/api/compare",
  summaryBase = () => "/api",
  token = "",
  notePath = "/api/compare-note",
  verificationPath = "/api/verification",
}) {
  const url = new URL(request.url, origin),
    params = url.searchParams;
  const allowed = ["left", "right", "race", "year_a", "year_b", "topic", "confirmed", "version"];
  for (const key of params.keys())
    if (!allowed.includes(key) || params.getAll(key).length !== 1)
      throw new ReviewError(400, "比較選項不正確，請重新選擇。");
  const left = params.get("left") ?? defaultId ?? catalog[0]?.id,
    right = params.get("right") ?? left;
  if (
    (left && !catalog.some((c) => c.id === left)) ||
    (right && !catalog.some((c) => c.id === right))
  )
    throw new ReviewError(404, "找不到所選的私人快照。");
  let result = null;
  if (left && right) {
    const options = {};
    for (const key of ["race", "topic"])
      if (params.has(key) && params.get(key)) options[key] = params.get(key);
    for (const key of ["year_a", "year_b"])
      if (params.has(key) && params.get(key)) {
        if (!/^\d{4}$/.test(params.get(key))) throw new ReviewError(400, "請選擇有效年份。");
        options[key] = Number(params.get(key));
      }
    if (params.has("confirmed")) {
      if (!["0", "1"].includes(params.get("confirmed")))
        throw new ReviewError(400, "請檢查摘要篩選。");
      options.confirmed = params.get("confirmed") === "1";
    }
    try {
      result = reviews.comparison(left, right, options);
    } catch (error) {
      throw new ReviewError(400, error.message);
    }
    if (params.has("version") && params.get("version") !== result.comparison_fingerprint)
      throw new ReviewError(409, "留言、分類或摘要已更新，請重新開啟比較後再下載。");
  }
  if (url.pathname.endsWith(".json"))
    response
      .writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="threads-year-comparison.json"',
      })
      .end(
        JSON.stringify(
          result ?? { kind: "private_year_topic_comparison", selection_complete: false, rows: [] },
        ),
      );
  else if (url.pathname.endsWith(".csv"))
    response
      .writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="threads-year-comparison.csv"',
      })
      .end(comparisonCsv(result ?? { rows: [] }));
  else
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(
      renderComparison(result, {
        catalog,
        left,
        right,
        comparisonPath,
        summaryBase,
        token,
        notePath,
        verificationPath,
      }),
    );
}
