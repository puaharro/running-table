// Trusted local CLI. No review/apply/publish command is exposed to the worker.
import { readFileSync, existsSync } from "node:fs";
import { ContentStore } from "./content-management/store.mjs";
import { Workflow } from "./content-management/workflow.mjs";
import { ProposalService } from "./content-management/proposals.mjs";
import { materials } from "./content-management/materials.mjs";
const [command, ...args] = process.argv.slice(2);
const demo = args.includes("--demo");
const path = `.editorial-private/content-management/${demo ? "demo" : "manual"}.sqlite`;
let content;
try {
  if (!["context", "propose", "list", "audit"].includes(command))
    throw Error("使用 context | propose <JSON檔> | list | audit <ID> [--demo]");
  if (!existsSync(path)) throw Error("請先啟動相同模式的 content:manage 工作區。");
  content = new ContentStore(path, demo ? "demo" : "manual");
  const service = new ProposalService(content);
  const result =
    command === "context"
      ? {
          catalog: content.catalog,
          materials: materials(content),
          drafts: content.list(),
          workflow: new Workflow(content).list(),
        }
      : command === "propose"
        ? service.propose(JSON.parse(readFileSync(args[0], "utf8")))
        : command === "audit"
          ? service.audit(args[0])
          : service.list();
  process.stdout.write(JSON.stringify({ status: "success", schema_version: 1, result }) + "\n");
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      status: "rejected",
      schema_version: 1,
      code: error.code ?? "INVALID_INPUT",
      message: error.message,
    }) + "\n",
  );
  process.exitCode = 1;
} finally {
  content?.close();
}
