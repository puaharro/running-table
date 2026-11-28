import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { materials, importMaterials } from "../scripts/content-management/materials.mjs";
import { ProposalService } from "../scripts/content-management/proposals.mjs";
import { ContentStore, raceCatalog } from "../scripts/content-management/store.mjs";

test("editorial jobs use selected materials, survive a retry and leave publication untouched", (t) => {
  const root = mkdtempSync(join(tmpdir(), "nxtgo-editorial-jobs-"));

  cpSync(new URL("../scripts/", import.meta.url), join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "src"));
  cpSync(new URL("../src/data/", import.meta.url), join(root, "src/data"), { recursive: true });
  mkdirSync(join(root, "src/lib"));
  cpSync(
    new URL("../src/lib/registration-sold-out.mjs", import.meta.url),
    join(root, "src/lib/registration-sold-out.mjs"),
  );

  const race = raceCatalog[0];
  const database = join(root, ".editorial-private/content-management/manual.sqlite");
  const content = new ContentStore(database);
  t.after(() => {
    content.close();
    rmSync(root, { recursive: true, force: true });
  });
  importMaterials(content, [
    {
      race_id: race.id,
      year: 2026,
      group: "半馬",
      platform: "threads",
      url: "https://www.threads.com/@fictional/post/Demo123",
      text: "虛構測試：回程有暗斜。",
      posted_at: null,
      scope: "虛構半馬組別",
      topic: "course",
    },
  ]);
  const [material] = materials(content);
  const job = { race_id: race.id, year: 2026, material_ids: [material.id] };
  const planPath = join(root, "plan.json");
  const run = (drafts) => {
    writeFileSync(planPath, JSON.stringify({ registration_review: true, runner_drafts: drafts }));
    const execution = spawnSync(
      process.execPath,
      [join(root, "scripts/content-jobs.mjs"), planPath],
      {
        encoding: "utf8",
      },
    );
    return { code: execution.status, ...JSON.parse(execution.stdout) };
  };

  const first = run([{ ...job, year: 2025 }, job]);
  assert.equal(first.code, 1);
  assert.equal(first.errors[0].index, 0);
  assert.equal(first.proposals[0].index, 1);
  const retry = run([job]);
  assert.equal(retry.code, 0);
  assert.equal(retry.proposals[0].id, first.proposals[0].id);
  const written = run([{ ...job, body: "這是指定的繁體中文稿。[1]" }]);
  const service = new ProposalService(content);
  assert.equal(service.list().length, 2);
  const proposal = service.get(retry.proposals[0].id);
  assert.equal(proposal.status, "pending");
  assert.match(proposal.draft.body, /賽道[\s\S]*虛構測試/);
  assert.match(proposal.draft.sources, /\[1\].+Demo123/);
  assert.equal(service.audit(proposal.id).length, 1);
  assert.equal(service.get(written.proposals[0].id).draft.body, "這是指定的繁體中文稿。[1]");
  assert.equal(content.list().length, 0);
  assert.ok(
    Array.isArray(JSON.parse(readFileSync(join(root, retry.registration_review.file))).items),
  );
});
