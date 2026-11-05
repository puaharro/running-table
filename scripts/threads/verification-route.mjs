import { ReviewError } from "./review-store.mjs";
import { verificationCsv, VERIFICATION_STATUSES } from "./verification-store.mjs";
import { renderVerification } from "./verification-view.mjs";
export function serveVerification({
  request,
  response,
  reviews,
  catalog,
  origin,
  base = "/verification",
  compare = "/compare",
  token,
}) {
  const params = new URL(request.url, origin).searchParams;
  for (const key of params.keys())
    if (!["note", "task", "status"].includes(key) || params.getAll(key).length !== 1)
      throw new ReviewError(400, "追蹤篩選不正確。");
  for (const key of ["note", "task"])
    if (params.has(key) && !/^[a-f0-9]{64}$/.test(params.get(key)))
      throw new ReviewError(400, "請選擇有效的備註或事項。");
  const status = params.get("status") ?? "all";
  if (params.has("task") && status !== "all")
    throw new ReviewError(400, "編輯事項時請先使用全部狀態。");
  if (!["all", "needs_recheck", ...VERIFICATION_STATUSES].includes(status))
    throw new ReviewError(400, "請選擇有效處理狀態。");
  const data = reviews.verificationState(
    catalog.map((row) => row.id),
    params.get("note"),
  );
  if (
    params.has("task") &&
    (!params.has("note") || !data.tasks.some((t) => t.id === params.get("task")))
  )
    throw new ReviewError(404, "找不到這項追蹤事項。");
  data.tasks = data.tasks.filter(
    (t) =>
      status === "all" ||
      (status === "needs_recheck" ? t.needs_recheck : t.status === status && !t.needs_recheck),
  );
  data.filter_status = status;
  data.is_demo = catalog.some((row) => row.mode === "demo");
  if (request.url.split("?")[0].endsWith(".json"))
    response
      .writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="threads-verification.json"',
      })
      .end(JSON.stringify(data));
  else if (request.url.split("?")[0].endsWith(".csv"))
    response
      .writeHead(200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="threads-verification.csv"',
      })
      .end(verificationCsv(data));
  else
    response
      .writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
      .end(renderVerification(data, { base, compare, token, taskId: params.get("task") }));
}
