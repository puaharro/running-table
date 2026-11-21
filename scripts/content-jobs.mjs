import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { ContentStore } from "./content-management/store.mjs";
import { materials } from "./content-management/materials.mjs";
import { ProposalService } from "./content-management/proposals.mjs";

const root = new URL("../.editorial-private/", import.meta.url);
const topicNames = {
  course: "賽道",
  organization: "大會安排",
  supplies: "補給",
  baggage: "寄存",
  transport: "交通",
  other: "其他",
};

function reviewQueue() {
  const report = execFileSync(process.execPath, [
    fileURLToPath(new URL("./review-queue.mjs", import.meta.url)),
  ]);
  const directory = new URL("jobs/", root);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const destination = new URL("registration-review.json", directory);
  const temporary = new URL(`${randomUUID()}.tmp`, directory);
  try {
    writeFileSync(temporary, report, { mode: 0o600, flag: "wx" });
    renameSync(temporary, destination);
  } finally {
    rmSync(temporary, { force: true });
  }
  return {
    file: ".editorial-private/jobs/registration-review.json",
    items: JSON.parse(report).items.length,
  };
}

function draftProposal(content, service, { race_id, year, material_ids, body }) {
  if (
    !Array.isArray(material_ids) ||
    material_ids.length < 1 ||
    material_ids.length > 30 ||
    material_ids.some((id) => typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) ||
    new Set(material_ids).size !== material_ids.length
  ) {
    throw new Error("請提供 1–30 個不重複的 CMS 材料 ID。");
  }

  const race = content.catalog.find((item) => item.id === race_id);
  const available = new Map(materials(content, race_id).map((item) => [item.id, item]));
  const rows = material_ids.map((id) => available.get(id));
  if (!race || !Number.isInteger(year) || rows.some((item) => !item || item.year !== year)) {
    throw new Error("請核對賽事 ID、屆次及材料歸屬。");
  }

  if (body !== undefined && (typeof body !== "string" || !body.trim())) {
    throw new Error("指定中文稿時，請提供非空白正文。");
  }

  const topics = Map.groupBy(
    rows.map((row, index) => ({ row, number: index + 1 })),
    ({ row }) => row.topic,
  );
  const outline = Object.entries(topicNames)
    .filter(([topic]) => topics.has(topic))
    .map(([topic, title]) =>
      [
        `## ${title}`,
        ...topics.get(topic).map(({ row, number }) => {
          const characters = [...row.text.trim()];
          const excerpt = characters.slice(0, 240).join("");
          return `- [${number}] ${excerpt}${characters.length > 240 ? "…" : ""}`;
        }),
      ].join("\n"),
    )
    .join("\n\n");

  const draft = {
    id: null,
    expected_revision: 0,
    kind: "review",
    race_id,
    year,
    group: [...new Set(rows.map((item) => item.group.trim()))]
      .filter(Boolean)
      .join("／")
      .slice(0, 120),
    title: `${race.name.slice(0, 115)} · ${year} 跑手心得（待覆核）`,
    body: body?.trim() ?? `以下為指定材料的摘錄，仍待核對來源、組別及觀察範圍。\n\n${outline}`,
    sources: rows
      .map((item, index) => `[${index + 1}] ${item.url} · ${item.posted_at ?? "出帖日期未知"}`)
      .join("\n"),
    scope: "只涵蓋本次指定的 CMS 材料。逐則組別及觀察範圍請查閱連結材料。",
    material_ids: rows.map((item) => item.id),
  };

  const version = "1";
  const agent = {
    provider: "local",
    model: "editorial-job",
    task_version: version,
    prompt_version: version,
  };
  const key = createHash("sha256").update(JSON.stringify({ agent, draft })).digest("hex");
  return service.propose({
    idempotency_key: `editorial-job:${key}`,
    agent,
    reason: body === undefined ? "按主題整理指定材料供覆核。" : "將指定正文及材料交 CMS 覆核。",
    draft,
  });
}

try {
  const { positionals } = parseArgs({ allowPositionals: true });
  if (positionals.length !== 1) throw new Error("使用 npm run content:jobs -- <工作計劃 JSON>");

  const plan = JSON.parse(readFileSync(positionals[0], "utf8"));
  if (
    !plan ||
    typeof plan !== "object" ||
    Array.isArray(plan) ||
    Object.keys(plan).some((key) => !["registration_review", "runner_drafts"].includes(key)) ||
    typeof plan.registration_review !== "boolean" ||
    !Array.isArray(plan.runner_drafts)
  ) {
    throw new Error("請按指引設定 registration_review 及 runner_drafts。");
  }

  const result = { proposals: [], errors: [] };
  if (plan.registration_review) {
    try {
      result.registration_review = reviewQueue();
    } catch {
      result.errors.push({ task: "registration_review", message: "未能更新待覆核清單。" });
    }
  }

  if (plan.runner_drafts.length) {
    const database = fileURLToPath(new URL("content-management/manual.sqlite", root));
    if (!existsSync(database)) throw new Error("請先啟動 CMS 並匯入指定材料。");
    const content = new ContentStore(database);
    try {
      const service = new ProposalService(content);
      for (const [index, job] of plan.runner_drafts.entries()) {
        try {
          if (
            !job ||
            typeof job !== "object" ||
            Array.isArray(job) ||
            Object.keys(job).some(
              (key) => !["race_id", "year", "material_ids", "body"].includes(key),
            )
          ) {
            throw new Error("中文稿只接受 race_id、year、material_ids 及可選的 body。");
          }
          const { id, status } = draftProposal(content, service, job);
          result.proposals.push({ index, id, status });
        } catch (error) {
          result.errors.push({ task: "runner_drafts", index, message: error.message });
        }
      }
    } finally {
      content.close();
    }
  }
  console.log(JSON.stringify(result));
  process.exitCode = result.errors.length ? 1 : 0;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
